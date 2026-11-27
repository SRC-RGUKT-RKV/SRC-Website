-- =============================================================================
-- SRC Website — Fix & Verify Supabase Storage RLS for vault-media & Media Buckets
-- File: supabase/migrations/20261127000200_fix_vault_media_storage_rls.sql
--
-- Fixes "new row violates row-level security policy" on vault-media uploads
-- without disabling RLS or granting unrestricted uploads.
--
-- Guarantees:
--   1. Public read (SELECT) remains enabled for member-photos, event-media, vault-media.
--   2. Only authenticated, active Super Admins ('super_admin') and Content Managers ('editor')
--      can INSERT, UPDATE, and DELETE objects in vault-media, member-photos, event-media,
--      and private-uploads.
--   3. Viewers ('viewer') CANNOT upload, update, or delete files in any bucket.
--   4. private-uploads remains strictly private (public = false; active admins read only).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Verify / Upsert Bucket Configurations
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'member-photos',
    'member-photos',
    true,
    5242880, -- 5 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'event-media',
    'event-media',
    true,
    26214400, -- 25 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'video/mp4', 'video/webm']
  ),
  (
    'vault-media',
    'vault-media',
    true,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
  ),
  (
    'private-uploads',
    'private-uploads',
    false,
    26214400, -- 25 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 2. Ensure Role-Checking Functions Are Executable by Authenticated & Storage Roles
-- -----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_current_admin_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_edit_content() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Remove Old Combined Policies to Prevent Any Overlap / Confusion
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS src_public_media_select ON storage.objects;
DROP POLICY IF EXISTS src_public_media_insert ON storage.objects;
DROP POLICY IF EXISTS src_public_media_update ON storage.objects;
DROP POLICY IF EXISTS src_public_media_delete ON storage.objects;

-- -----------------------------------------------------------------------------
-- 4. Explicit RLS Policies for vault-media (Batch Team Photographs & Vault Archive)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS src_vault_media_select ON storage.objects;
CREATE POLICY src_vault_media_select
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'vault-media');

DROP POLICY IF EXISTS src_vault_media_insert ON storage.objects;
CREATE POLICY src_vault_media_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'vault-media'
    AND public.can_edit_content()
  );

DROP POLICY IF EXISTS src_vault_media_update ON storage.objects;
CREATE POLICY src_vault_media_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'vault-media'
    AND public.can_edit_content()
  )
  WITH CHECK (
    bucket_id = 'vault-media'
    AND public.can_edit_content()
  );

DROP POLICY IF EXISTS src_vault_media_delete ON storage.objects;
CREATE POLICY src_vault_media_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'vault-media'
    AND public.can_edit_content()
  );

-- -----------------------------------------------------------------------------
-- 5. Explicit RLS Policies for member-photos and event-media
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS src_member_event_media_select ON storage.objects;
CREATE POLICY src_member_event_media_select
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id IN ('member-photos', 'event-media'));

DROP POLICY IF EXISTS src_member_event_media_insert ON storage.objects;
CREATE POLICY src_member_event_media_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('member-photos', 'event-media')
    AND public.can_edit_content()
  );

DROP POLICY IF EXISTS src_member_event_media_update ON storage.objects;
CREATE POLICY src_member_event_media_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('member-photos', 'event-media')
    AND public.can_edit_content()
  )
  WITH CHECK (
    bucket_id IN ('member-photos', 'event-media')
    AND public.can_edit_content()
  );

DROP POLICY IF EXISTS src_member_event_media_delete ON storage.objects;
CREATE POLICY src_member_event_media_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('member-photos', 'event-media')
    AND public.can_edit_content()
  );

-- -----------------------------------------------------------------------------
-- 6. Re-confirm Private Policies for private-uploads
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS src_private_uploads_select ON storage.objects;
CREATE POLICY src_private_uploads_select
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'private-uploads'
    AND public.is_active_admin()
  );

DROP POLICY IF EXISTS src_private_uploads_insert ON storage.objects;
CREATE POLICY src_private_uploads_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'private-uploads'
    AND public.can_edit_content()
  );

DROP POLICY IF EXISTS src_private_uploads_update ON storage.objects;
CREATE POLICY src_private_uploads_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'private-uploads'
    AND public.can_edit_content()
  )
  WITH CHECK (
    bucket_id = 'private-uploads'
    AND public.can_edit_content()
  );

DROP POLICY IF EXISTS src_private_uploads_delete ON storage.objects;
CREATE POLICY src_private_uploads_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'private-uploads'
    AND public.can_edit_content()
  );

-- -----------------------------------------------------------------------------
-- 7. Verification Queries (Inspect Bucket + Active Policies)
-- -----------------------------------------------------------------------------
SELECT id, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('member-photos', 'event-media', 'vault-media', 'private-uploads')
ORDER BY id;

SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE 'src_%'
ORDER BY policyname;

SELECT id, email, full_name, role, is_active
FROM public.admin_profiles
ORDER BY created_at ASC;
