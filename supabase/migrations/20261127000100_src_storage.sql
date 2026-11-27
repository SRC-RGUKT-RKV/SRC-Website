-- =============================================================================
-- SRC Website — Supabase Storage Buckets & RLS Policies Migration
-- File: supabase/migrations/20261127000100_src_storage.sql
--
-- Prerequisites:
--   Run 20261127000000_src_schema.sql first so public.is_active_admin() and
--   public.can_edit_content() exist.
--
-- Buckets:
--   - member-photos   (public read; Super Admin & Editor write/update/delete)
--   - event-media     (public read; Super Admin & Editor write/update/delete)
--   - vault-media     (public read; Super Admin & Editor write/update/delete)
--   - private-uploads (private; active admins read only; Super Admin & Editor write/update/delete)
--
-- Role Enforcement:
--   - Public (anon)            : SELECT only on public media buckets; ZERO access to private-uploads
--   - Viewer (viewer)          : Read-only; CANNOT upload, update, or delete in any bucket
--   - Content Manager (editor) : Upload, update, and delete in buckets via public.can_edit_content()
--   - Super Admin (super_admin): Upload, update, and delete in buckets via public.can_edit_content()
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create / Configure Storage Buckets (Idempotent)
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
    false, -- Strictly private bucket
    26214400, -- 25 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- -----------------------------------------------------------------------------
-- 2. Storage Object RLS Policies (Public Media Buckets)
--    Buckets: member-photos, event-media, vault-media
-- -----------------------------------------------------------------------------

-- Public & authenticated read access to public media buckets only
DROP POLICY IF EXISTS src_public_media_select ON storage.objects;
CREATE POLICY src_public_media_select
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id IN ('member-photos', 'event-media', 'vault-media')
  );

-- Only active Super Admins and Content Managers (editor) can upload
DROP POLICY IF EXISTS src_public_media_insert ON storage.objects;
CREATE POLICY src_public_media_insert
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('member-photos', 'event-media', 'vault-media')
    AND public.can_edit_content()
  );

-- Only active Super Admins and Content Managers (editor) can update/replace
DROP POLICY IF EXISTS src_public_media_update ON storage.objects;
CREATE POLICY src_public_media_update
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id IN ('member-photos', 'event-media', 'vault-media')
    AND public.can_edit_content()
  )
  WITH CHECK (
    bucket_id IN ('member-photos', 'event-media', 'vault-media')
    AND public.can_edit_content()
  );

-- Only active Super Admins and Content Managers (editor) can delete
DROP POLICY IF EXISTS src_public_media_delete ON storage.objects;
CREATE POLICY src_public_media_delete
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id IN ('member-photos', 'event-media', 'vault-media')
    AND public.can_edit_content()
  );

-- -----------------------------------------------------------------------------
-- 3. Storage Object RLS Policies (Private Bucket: private-uploads)
--    - anon / non-admin users: NO access whatsoever
--    - active admins (super_admin, editor, viewer): SELECT via signed URLs / download
--    - Super Admin & Content Manager (editor): INSERT, UPDATE, DELETE
--    - Viewer: CANNOT upload, update, or delete
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
