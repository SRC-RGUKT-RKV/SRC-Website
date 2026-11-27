-- =============================================================================
-- SRC Website — PostgreSQL / Supabase Database Schema Migration
-- File: supabase/migrations/20261127000000_src_schema.sql
--
-- Tables:
--   1. public.admin_profiles   (Administrator accounts & RBAC roles)
--   2. public.batches          (Current SRC panel & historical Vault batches)
--   3. public.members          (SRC council members scoped to a batch)
--   4. public.achievements     (Batch & member milestones / achievements)
--   5. public.social_links     (Member profile links & official SRC links)
--   6. public.events           (Department & SRC visual archive events)
--   7. public.event_media      (Event photo galleries, videos & external links)
--
-- Roles:
--   - super_admin : Full content control + sole manager of admin_profiles
--   - editor      : Create / update / delete content; cannot manage admins
--   - viewer      : Read-only access to all content (including drafts); no writes
--   - anon/public : Read-only access to published content only
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 2. Custom Enum Types
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'admin_role'
  ) THEN
    CREATE TYPE public.admin_role AS ENUM (
      'super_admin',
      'editor',
      'viewer'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'publication_status'
  ) THEN
    CREATE TYPE public.publication_status AS ENUM (
      'draft',
      'published',
      'archived'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'event_media_type'
  ) THEN
    CREATE TYPE public.event_media_type AS ENUM (
      'image',
      'video',
      'link'
    );
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 3. Timestamp Trigger Function
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Tables
-- -----------------------------------------------------------------------------

-- 4.1 Admin Profiles (linked 1:1 to auth.users)
CREATE TABLE public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role public.admin_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT admin_profiles_email_not_blank CHECK (char_length(trim(email)) > 3),
  CONSTRAINT admin_profiles_full_name_not_blank CHECK (char_length(trim(full_name)) > 0)
);

-- 4.2 Batches (Current SRC Panel + Historical Vault Archive)
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  start_year SMALLINT NOT NULL,
  end_year SMALLINT NOT NULL,
  tagline TEXT,
  summary TEXT,
  contributions TEXT,
  team_photo_url TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  status public.publication_status NOT NULL DEFAULT 'draft',
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT batches_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT batches_name_not_blank CHECK (char_length(trim(name)) > 0),
  CONSTRAINT batches_academic_year_not_blank CHECK (char_length(trim(academic_year)) > 0),
  CONSTRAINT batches_year_range CHECK (
    start_year BETWEEN 2000 AND 2100
    AND end_year >= start_year
    AND end_year <= 2105
  )
);

-- Enforce that at most ONE batch can be marked as the current SRC panel
CREATE UNIQUE INDEX idx_batches_single_current
  ON public.batches (is_current)
  WHERE is_current = true;

-- 4.3 Members (Scoped strictly to a Batch: BATCH -> SRC TEAM -> MEMBERS)
CREATE TABLE public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  full_name TEXT NOT NULL,
  designation TEXT NOT NULL,
  designation_left TEXT,
  designation_right TEXT,
  department TEXT NOT NULL DEFAULT 'CSE',
  academic_batch TEXT,
  area_of_focus TEXT,
  photo_url TEXT,
  about TEXT,
  quote TEXT,
  responsibilities TEXT[] NOT NULL DEFAULT '{}',
  email TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  bento_span TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT members_batch_slug_unique UNIQUE (batch_id, slug),
  CONSTRAINT members_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT members_full_name_not_blank CHECK (char_length(trim(full_name)) > 0),
  CONSTRAINT members_designation_not_blank CHECK (char_length(trim(designation)) > 0)
);

-- 4.4 Achievements (Belongs to a Batch; optionally attributed to a Member)
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'milestone',
  achieved_on DATE,
  display_order INTEGER NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT achievements_title_not_blank CHECK (char_length(trim(title)) > 0)
);

-- 4.5 Social Links (Member social profiles OR official organization links)
CREATE TABLE public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
  is_organization_link BOOLEAN NOT NULL DEFAULT false,
  platform TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT social_links_owner_check CHECK (
    (is_organization_link = true AND member_id IS NULL)
    OR (is_organization_link = false AND member_id IS NOT NULL)
  ),
  CONSTRAINT social_links_platform_not_blank CHECK (char_length(trim(platform)) > 0),
  CONSTRAINT social_links_label_not_blank CHECK (char_length(trim(label)) > 0),
  CONSTRAINT social_links_url_scheme CHECK (url ~* '^(https?://|mailto:)')
);

-- 4.6 Events (Visual Archive; optionally linked to organizing Batch)
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  category TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_end_date DATE,
  venue TEXT,
  cover_image_url TEXT,
  highlights TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT events_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT events_title_not_blank CHECK (char_length(trim(title)) > 0),
  CONSTRAINT events_category_not_blank CHECK (char_length(trim(category)) > 0),
  CONSTRAINT events_date_order CHECK (
    event_end_date IS NULL OR event_end_date >= event_date
  )
);

-- 4.7 Event Media (Gallery photos, embedded videos, and related external links)
CREATE TABLE public.event_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  media_type public.event_media_type NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  title TEXT,
  caption TEXT,
  thumbnail_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT event_media_url_scheme CHECK (url ~* '^(https?://|/|mailto:)')
);

-- -----------------------------------------------------------------------------
-- 5. Indexes
-- -----------------------------------------------------------------------------

-- admin_profiles
CREATE INDEX idx_admin_profiles_role_active
  ON public.admin_profiles (role, is_active);

-- batches
CREATE INDEX idx_batches_status_order
  ON public.batches (status, display_order, start_year DESC);

-- members
CREATE INDEX idx_members_batch_status_order
  ON public.members (batch_id, status, display_order);

CREATE INDEX idx_members_featured
  ON public.members (batch_id, is_featured)
  WHERE is_featured = true;

-- achievements
CREATE INDEX idx_achievements_batch_status_order
  ON public.achievements (batch_id, status, display_order);

CREATE INDEX idx_achievements_member_id
  ON public.achievements (member_id)
  WHERE member_id IS NOT NULL;

-- social_links
CREATE INDEX idx_social_links_member_status
  ON public.social_links (member_id, status, display_order)
  WHERE member_id IS NOT NULL;

CREATE INDEX idx_social_links_org_status
  ON public.social_links (status, display_order)
  WHERE is_organization_link = true;

-- events
CREATE INDEX idx_events_status_date
  ON public.events (status, event_date DESC, display_order);

CREATE INDEX idx_events_batch_id
  ON public.events (batch_id)
  WHERE batch_id IS NOT NULL;

CREATE INDEX idx_events_category_status
  ON public.events (category, status);

-- event_media
CREATE INDEX idx_event_media_event_status_order
  ON public.event_media (event_id, status, media_type, display_order);

-- -----------------------------------------------------------------------------
-- 6. updated_at Triggers
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_admin_profiles_updated_at
  BEFORE UPDATE ON public.admin_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_achievements_updated_at
  BEFORE UPDATE ON public.achievements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_social_links_updated_at
  BEFORE UPDATE ON public.social_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_event_media_updated_at
  BEFORE UPDATE ON public.event_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Secure Role-Checking Functions (SECURITY DEFINER to avoid RLS recursion)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_current_admin_role()
RETURNS public.admin_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ap.role
  FROM public.admin_profiles AS ap
  WHERE ap.id = auth.uid()
    AND ap.is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.get_current_admin_role() IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.can_edit_content()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    public.get_current_admin_role() IN (
      'super_admin'::public.admin_role,
      'editor'::public.admin_role
    ),
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    public.get_current_admin_role() = 'super_admin'::public.admin_role,
    false
  );
$$;

REVOKE ALL ON FUNCTION public.get_current_admin_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_edit_content() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_current_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_content() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- -----------------------------------------------------------------------------
-- 8. Privilege Grants (Least Privilege)
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE
  public.admin_profiles,
  public.batches,
  public.members,
  public.achievements,
  public.social_links,
  public.events,
  public.event_media
FROM PUBLIC, anon, authenticated;

-- Public visitors (anon): strictly SELECT on public content tables only; zero access to admin_profiles
GRANT SELECT ON TABLE
  public.batches,
  public.members,
  public.achievements,
  public.social_links,
  public.events,
  public.event_media
TO anon;

-- Authenticated role: table privileges delegated to strict RLS policies below
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.admin_profiles,
  public.batches,
  public.members,
  public.achievements,
  public.social_links,
  public.events,
  public.event_media
TO authenticated;

-- -----------------------------------------------------------------------------
-- 9. Row Level Security (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_media ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 9.1 admin_profiles Policies
--   - anon: no grant & no policy (completely denied)
--   - viewer & editor: can SELECT only their own row; cannot INSERT/UPDATE/DELETE
--   - super_admin: can SELECT all rows; ONLY role that can INSERT/UPDATE/DELETE
-- =============================================================================
CREATE POLICY admin_profiles_select_self_or_super_admin
  ON public.admin_profiles
  FOR SELECT
  TO authenticated
  USING (
    public.is_super_admin()
    OR id = auth.uid()
  );

CREATE POLICY admin_profiles_insert_super_admin_only
  ON public.admin_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin());

CREATE POLICY admin_profiles_update_super_admin_only
  ON public.admin_profiles
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE POLICY admin_profiles_delete_super_admin_only
  ON public.admin_profiles
  FOR DELETE
  TO authenticated
  USING (
    public.is_super_admin()
    AND id <> auth.uid()
  );

-- =============================================================================
-- 9.2 batches Policies
-- =============================================================================
CREATE POLICY batches_select_public_published
  ON public.batches
  FOR SELECT
  TO anon
  USING (status = 'published'::public.publication_status);

CREATE POLICY batches_select_authenticated
  ON public.batches
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_admin()
    OR status = 'published'::public.publication_status
  );

CREATE POLICY batches_insert_editors
  ON public.batches
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_content());

CREATE POLICY batches_update_editors
  ON public.batches
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_content())
  WITH CHECK (public.can_edit_content());

CREATE POLICY batches_delete_editors
  ON public.batches
  FOR DELETE
  TO authenticated
  USING (public.can_edit_content());

-- =============================================================================
-- 9.3 members Policies
-- =============================================================================
CREATE POLICY members_select_public_published
  ON public.members
  FOR SELECT
  TO anon
  USING (
    status = 'published'::public.publication_status
    AND EXISTS (
      SELECT 1
      FROM public.batches AS b
      WHERE b.id = members.batch_id
        AND b.status = 'published'::public.publication_status
    )
  );

CREATE POLICY members_select_authenticated
  ON public.members
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_admin()
    OR (
      status = 'published'::public.publication_status
      AND EXISTS (
        SELECT 1
        FROM public.batches AS b
        WHERE b.id = members.batch_id
          AND b.status = 'published'::public.publication_status
      )
    )
  );

CREATE POLICY members_insert_editors
  ON public.members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_content());

CREATE POLICY members_update_editors
  ON public.members
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_content())
  WITH CHECK (public.can_edit_content());

CREATE POLICY members_delete_editors
  ON public.members
  FOR DELETE
  TO authenticated
  USING (public.can_edit_content());

-- =============================================================================
-- 9.4 achievements Policies
-- =============================================================================
CREATE POLICY achievements_select_public_published
  ON public.achievements
  FOR SELECT
  TO anon
  USING (
    status = 'published'::public.publication_status
    AND EXISTS (
      SELECT 1
      FROM public.batches AS b
      WHERE b.id = achievements.batch_id
        AND b.status = 'published'::public.publication_status
    )
    AND (
      member_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.members AS m
        WHERE m.id = achievements.member_id
          AND m.status = 'published'::public.publication_status
      )
    )
  );

CREATE POLICY achievements_select_authenticated
  ON public.achievements
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_admin()
    OR (
      status = 'published'::public.publication_status
      AND EXISTS (
        SELECT 1
        FROM public.batches AS b
        WHERE b.id = achievements.batch_id
          AND b.status = 'published'::public.publication_status
      )
      AND (
        member_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.members AS m
          WHERE m.id = achievements.member_id
            AND m.status = 'published'::public.publication_status
        )
      )
    )
  );

CREATE POLICY achievements_insert_editors
  ON public.achievements
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_content());

CREATE POLICY achievements_update_editors
  ON public.achievements
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_content())
  WITH CHECK (public.can_edit_content());

CREATE POLICY achievements_delete_editors
  ON public.achievements
  FOR DELETE
  TO authenticated
  USING (public.can_edit_content());

-- =============================================================================
-- 9.5 social_links Policies
-- =============================================================================
CREATE POLICY social_links_select_public_published
  ON public.social_links
  FOR SELECT
  TO anon
  USING (
    status = 'published'::public.publication_status
    AND (
      is_organization_link = true
      OR EXISTS (
        SELECT 1
        FROM public.members AS m
        JOIN public.batches AS b ON b.id = m.batch_id
        WHERE m.id = social_links.member_id
          AND m.status = 'published'::public.publication_status
          AND b.status = 'published'::public.publication_status
      )
    )
  );

CREATE POLICY social_links_select_authenticated
  ON public.social_links
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_admin()
    OR (
      status = 'published'::public.publication_status
      AND (
        is_organization_link = true
        OR EXISTS (
          SELECT 1
          FROM public.members AS m
          JOIN public.batches AS b ON b.id = m.batch_id
          WHERE m.id = social_links.member_id
            AND m.status = 'published'::public.publication_status
            AND b.status = 'published'::public.publication_status
        )
      )
    )
  );

CREATE POLICY social_links_insert_editors
  ON public.social_links
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_content());

CREATE POLICY social_links_update_editors
  ON public.social_links
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_content())
  WITH CHECK (public.can_edit_content());

CREATE POLICY social_links_delete_editors
  ON public.social_links
  FOR DELETE
  TO authenticated
  USING (public.can_edit_content());

-- =============================================================================
-- 9.6 events Policies
-- =============================================================================
CREATE POLICY events_select_public_published
  ON public.events
  FOR SELECT
  TO anon
  USING (
    status = 'published'::public.publication_status
    AND (
      batch_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.batches AS b
        WHERE b.id = events.batch_id
          AND b.status = 'published'::public.publication_status
      )
    )
  );

CREATE POLICY events_select_authenticated
  ON public.events
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_admin()
    OR (
      status = 'published'::public.publication_status
      AND (
        batch_id IS NULL
        OR EXISTS (
          SELECT 1
          FROM public.batches AS b
          WHERE b.id = events.batch_id
            AND b.status = 'published'::public.publication_status
        )
      )
    )
  );

CREATE POLICY events_insert_editors
  ON public.events
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_content());

CREATE POLICY events_update_editors
  ON public.events
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_content())
  WITH CHECK (public.can_edit_content());

CREATE POLICY events_delete_editors
  ON public.events
  FOR DELETE
  TO authenticated
  USING (public.can_edit_content());

-- =============================================================================
-- 9.7 event_media Policies
-- =============================================================================
CREATE POLICY event_media_select_public_published
  ON public.event_media
  FOR SELECT
  TO anon
  USING (
    status = 'published'::public.publication_status
    AND EXISTS (
      SELECT 1
      FROM public.events AS e
      WHERE e.id = event_media.event_id
        AND e.status = 'published'::public.publication_status
        AND (
          e.batch_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.batches AS b
            WHERE b.id = e.batch_id
              AND b.status = 'published'::public.publication_status
          )
        )
    )
  );

CREATE POLICY event_media_select_authenticated
  ON public.event_media
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_admin()
    OR (
      status = 'published'::public.publication_status
      AND EXISTS (
        SELECT 1
        FROM public.events AS e
        WHERE e.id = event_media.event_id
          AND e.status = 'published'::public.publication_status
          AND (
            e.batch_id IS NULL
            OR EXISTS (
              SELECT 1
              FROM public.batches AS b
              WHERE b.id = e.batch_id
                AND b.status = 'published'::public.publication_status
            )
          )
      )
    )
  );

CREATE POLICY event_media_insert_editors
  ON public.event_media
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_content());

CREATE POLICY event_media_update_editors
  ON public.event_media
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_content())
  WITH CHECK (public.can_edit_content());

CREATE POLICY event_media_delete_editors
  ON public.event_media
  FOR DELETE
  TO authenticated
  USING (public.can_edit_content());
