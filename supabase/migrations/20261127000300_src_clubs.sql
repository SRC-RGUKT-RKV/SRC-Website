-- =============================================================================
-- SRC Website — Clubs & Academic-Year Continuity Schema Migration
-- File: supabase/migrations/20261127000300_src_clubs.sql
--
-- Prerequisites:
--   Run 20261127000000_src_schema.sql and 20261127000200_fix_vault_media_storage_rls.sql
--   first so public.publication_status, public.event_media_type, public.set_updated_at(),
--   public.is_active_admin(), and public.can_edit_content() exist.
--
-- Tables Added:
--   1. public.clubs                (Persistent club identity across academic years)
--   2. public.club_academic_years  (Per-year activation, status, summary & team photo)
--   3. public.club_members         (Faculty coordinators, student coordinators & members per year)
--   4. public.club_activities      (Workshops, sessions, activities & achievements per year)
--   5. public.club_media           (Club photographs & galleries per year)
--
-- Storage Reuse (No duplicate buckets created):
--   - Club logos, covers, team photos & galleries -> existing `event-media` bucket (clubs/<slug>/...)
--   - Coordinator & member portraits              -> existing `member-photos` bucket (clubs/<slug>/...)
--
-- Role Enforcement:
--   - anon/public : SELECT published records whose parent club & academic year are published
--   - viewer      : SELECT all records (including drafts & history); ZERO write permissions
--   - editor      : Full CRUD via public.can_edit_content()
--   - super_admin : Full CRUD via public.can_edit_content()
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tables
-- -----------------------------------------------------------------------------

-- 1.1 Clubs (Persistent club identity preserved across academic years)
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT,
  description TEXT,
  objectives TEXT[] NOT NULL DEFAULT '{}',
  target_audience TEXT,
  focus_area TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  founded_academic_year TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT clubs_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT clubs_name_not_blank CHECK (char_length(trim(name)) > 0)
);

-- 1.2 Club Academic Years (Separate record per club per academic year — never overwrites history)
CREATE TABLE IF NOT EXISTS public.club_academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  academic_year TEXT NOT NULL,
  start_year SMALLINT NOT NULL,
  end_year SMALLINT NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false,
  summary TEXT,
  team_photo_url TEXT,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT club_academic_years_unique_club_year UNIQUE (club_id, academic_year),
  CONSTRAINT club_academic_years_label_not_blank CHECK (char_length(trim(academic_year)) > 0),
  CONSTRAINT club_academic_years_year_range CHECK (
    start_year BETWEEN 2000 AND 2100
    AND end_year >= start_year
    AND end_year <= 2105
  )
);

-- At most ONE academic-year record per club can be marked as current
CREATE UNIQUE INDEX IF NOT EXISTS idx_club_academic_years_single_current
  ON public.club_academic_years (club_id)
  WHERE is_current = true;

-- 1.3 Club Members & Coordinators (Scoped strictly to a club + academic year)
CREATE TABLE IF NOT EXISTS public.club_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  club_academic_year_id UUID NOT NULL REFERENCES public.club_academic_years(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  member_type TEXT NOT NULL DEFAULT 'student_coordinator',
  role_title TEXT NOT NULL,
  department TEXT NOT NULL DEFAULT 'CSE',
  academic_batch TEXT,
  email TEXT,
  photo_url TEXT,
  bio TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT club_members_type_check CHECK (
    member_type IN ('faculty_coordinator', 'student_coordinator', 'member')
  ),
  CONSTRAINT club_members_full_name_not_blank CHECK (char_length(trim(full_name)) > 0),
  CONSTRAINT club_members_role_title_not_blank CHECK (char_length(trim(role_title)) > 0)
);

-- 1.4 Club Activities (Workshops, sessions, activities & achievements per academic year)
CREATE TABLE IF NOT EXISTS public.club_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  club_academic_year_id UUID NOT NULL REFERENCES public.club_academic_years(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL DEFAULT 'activity',
  title TEXT NOT NULL,
  description TEXT,
  activity_date DATE,
  venue TEXT,
  outcome TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT club_activities_type_check CHECK (
    activity_type IN ('workshop', 'session', 'activity', 'achievement')
  ),
  CONSTRAINT club_activities_title_not_blank CHECK (char_length(trim(title)) > 0)
);

-- 1.5 Club Media (Photographs, galleries & recordings per academic year)
CREATE TABLE IF NOT EXISTS public.club_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  club_academic_year_id UUID NOT NULL REFERENCES public.club_academic_years(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.club_activities(id) ON DELETE SET NULL,
  media_type public.event_media_type NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  title TEXT,
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  status public.publication_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT club_media_url_not_blank CHECK (char_length(trim(url)) > 0)
);

-- -----------------------------------------------------------------------------
-- 2. Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_clubs_status_order
  ON public.clubs (status, display_order, name);

CREATE INDEX IF NOT EXISTS idx_club_academic_years_club_status_year
  ON public.club_academic_years (club_id, status, start_year DESC);

CREATE INDEX IF NOT EXISTS idx_club_academic_years_current_active
  ON public.club_academic_years (is_current, is_active, status);

CREATE INDEX IF NOT EXISTS idx_club_academic_years_batch_id
  ON public.club_academic_years (batch_id)
  WHERE batch_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_club_members_year_status_order
  ON public.club_members (club_academic_year_id, status, member_type, display_order);

CREATE INDEX IF NOT EXISTS idx_club_members_club_id
  ON public.club_members (club_id);

CREATE INDEX IF NOT EXISTS idx_club_activities_year_status_date
  ON public.club_activities (club_academic_year_id, status, activity_date DESC, display_order);

CREATE INDEX IF NOT EXISTS idx_club_activities_club_id
  ON public.club_activities (club_id);

CREATE INDEX IF NOT EXISTS idx_club_media_year_status_order
  ON public.club_media (club_academic_year_id, status, media_type, display_order);

CREATE INDEX IF NOT EXISTS idx_club_media_club_id
  ON public.club_media (club_id);

CREATE INDEX IF NOT EXISTS idx_club_media_activity_id
  ON public.club_media (activity_id)
  WHERE activity_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. updated_at Triggers
-- -----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_clubs_updated_at ON public.clubs;
CREATE TRIGGER trg_clubs_updated_at
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_club_academic_years_updated_at ON public.club_academic_years;
CREATE TRIGGER trg_club_academic_years_updated_at
  BEFORE UPDATE ON public.club_academic_years
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_club_members_updated_at ON public.club_members;
CREATE TRIGGER trg_club_members_updated_at
  BEFORE UPDATE ON public.club_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_club_activities_updated_at ON public.club_activities;
CREATE TRIGGER trg_club_activities_updated_at
  BEFORE UPDATE ON public.club_activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_club_media_updated_at ON public.club_media;
CREATE TRIGGER trg_club_media_updated_at
  BEFORE UPDATE ON public.club_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Privilege Grants (Least Privilege)
-- -----------------------------------------------------------------------------
REVOKE ALL ON TABLE
  public.clubs,
  public.club_academic_years,
  public.club_members,
  public.club_activities,
  public.club_media
FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE
  public.clubs,
  public.club_academic_years,
  public.club_members,
  public.club_activities,
  public.club_media
TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.clubs,
  public.club_academic_years,
  public.club_members,
  public.club_activities,
  public.club_media
TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. Row Level Security (RLS)
-- -----------------------------------------------------------------------------
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_media ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 5.1 clubs Policies
-- =============================================================================
DROP POLICY IF EXISTS clubs_select_public_published ON public.clubs;
CREATE POLICY clubs_select_public_published
  ON public.clubs
  FOR SELECT
  TO anon
  USING (status = 'published'::public.publication_status);

DROP POLICY IF EXISTS clubs_select_authenticated ON public.clubs;
CREATE POLICY clubs_select_authenticated
  ON public.clubs
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_admin()
    OR status = 'published'::public.publication_status
  );

DROP POLICY IF EXISTS clubs_insert_editors ON public.clubs;
CREATE POLICY clubs_insert_editors
  ON public.clubs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_content());

DROP POLICY IF EXISTS clubs_update_editors ON public.clubs;
CREATE POLICY clubs_update_editors
  ON public.clubs
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_content())
  WITH CHECK (public.can_edit_content());

DROP POLICY IF EXISTS clubs_delete_editors ON public.clubs;
CREATE POLICY clubs_delete_editors
  ON public.clubs
  FOR DELETE
  TO authenticated
  USING (public.can_edit_content());

-- =============================================================================
-- 5.2 club_academic_years Policies
-- =============================================================================
DROP POLICY IF EXISTS club_academic_years_select_public_published ON public.club_academic_years;
CREATE POLICY club_academic_years_select_public_published
  ON public.club_academic_years
  FOR SELECT
  TO anon
  USING (
    status = 'published'::public.publication_status
    AND EXISTS (
      SELECT 1
      FROM public.clubs AS c
      WHERE c.id = club_academic_years.club_id
        AND c.status = 'published'::public.publication_status
    )
  );

DROP POLICY IF EXISTS club_academic_years_select_authenticated ON public.club_academic_years;
CREATE POLICY club_academic_years_select_authenticated
  ON public.club_academic_years
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_admin()
    OR (
      status = 'published'::public.publication_status
      AND EXISTS (
        SELECT 1
        FROM public.clubs AS c
        WHERE c.id = club_academic_years.club_id
          AND c.status = 'published'::public.publication_status
      )
    )
  );

DROP POLICY IF EXISTS club_academic_years_insert_editors ON public.club_academic_years;
CREATE POLICY club_academic_years_insert_editors
  ON public.club_academic_years
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_content());

DROP POLICY IF EXISTS club_academic_years_update_editors ON public.club_academic_years;
CREATE POLICY club_academic_years_update_editors
  ON public.club_academic_years
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_content())
  WITH CHECK (public.can_edit_content());

DROP POLICY IF EXISTS club_academic_years_delete_editors ON public.club_academic_years;
CREATE POLICY club_academic_years_delete_editors
  ON public.club_academic_years
  FOR DELETE
  TO authenticated
  USING (public.can_edit_content());

-- =============================================================================
-- 5.3 club_members Policies
-- =============================================================================
DROP POLICY IF EXISTS club_members_select_public_published ON public.club_members;
CREATE POLICY club_members_select_public_published
  ON public.club_members
  FOR SELECT
  TO anon
  USING (
    status = 'published'::public.publication_status
    AND EXISTS (
      SELECT 1
      FROM public.club_academic_years AS cay
      JOIN public.clubs AS c ON c.id = cay.club_id
      WHERE cay.id = club_members.club_academic_year_id
        AND cay.status = 'published'::public.publication_status
        AND c.status = 'published'::public.publication_status
    )
  );

DROP POLICY IF EXISTS club_members_select_authenticated ON public.club_members;
CREATE POLICY club_members_select_authenticated
  ON public.club_members
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_admin()
    OR (
      status = 'published'::public.publication_status
      AND EXISTS (
        SELECT 1
        FROM public.club_academic_years AS cay
        JOIN public.clubs AS c ON c.id = cay.club_id
        WHERE cay.id = club_members.club_academic_year_id
          AND cay.status = 'published'::public.publication_status
          AND c.status = 'published'::public.publication_status
      )
    )
  );

DROP POLICY IF EXISTS club_members_insert_editors ON public.club_members;
CREATE POLICY club_members_insert_editors
  ON public.club_members
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_content());

DROP POLICY IF EXISTS club_members_update_editors ON public.club_members;
CREATE POLICY club_members_update_editors
  ON public.club_members
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_content())
  WITH CHECK (public.can_edit_content());

DROP POLICY IF EXISTS club_members_delete_editors ON public.club_members;
CREATE POLICY club_members_delete_editors
  ON public.club_members
  FOR DELETE
  TO authenticated
  USING (public.can_edit_content());

-- =============================================================================
-- 5.4 club_activities Policies
-- =============================================================================
DROP POLICY IF EXISTS club_activities_select_public_published ON public.club_activities;
CREATE POLICY club_activities_select_public_published
  ON public.club_activities
  FOR SELECT
  TO anon
  USING (
    status = 'published'::public.publication_status
    AND EXISTS (
      SELECT 1
      FROM public.club_academic_years AS cay
      JOIN public.clubs AS c ON c.id = cay.club_id
      WHERE cay.id = club_activities.club_academic_year_id
        AND cay.status = 'published'::public.publication_status
        AND c.status = 'published'::public.publication_status
    )
  );

DROP POLICY IF EXISTS club_activities_select_authenticated ON public.club_activities;
CREATE POLICY club_activities_select_authenticated
  ON public.club_activities
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_admin()
    OR (
      status = 'published'::public.publication_status
      AND EXISTS (
        SELECT 1
        FROM public.club_academic_years AS cay
        JOIN public.clubs AS c ON c.id = cay.club_id
        WHERE cay.id = club_activities.club_academic_year_id
          AND cay.status = 'published'::public.publication_status
          AND c.status = 'published'::public.publication_status
      )
    )
  );

DROP POLICY IF EXISTS club_activities_insert_editors ON public.club_activities;
CREATE POLICY club_activities_insert_editors
  ON public.club_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_content());

DROP POLICY IF EXISTS club_activities_update_editors ON public.club_activities;
CREATE POLICY club_activities_update_editors
  ON public.club_activities
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_content())
  WITH CHECK (public.can_edit_content());

DROP POLICY IF EXISTS club_activities_delete_editors ON public.club_activities;
CREATE POLICY club_activities_delete_editors
  ON public.club_activities
  FOR DELETE
  TO authenticated
  USING (public.can_edit_content());

-- =============================================================================
-- 5.5 club_media Policies
-- =============================================================================
DROP POLICY IF EXISTS club_media_select_public_published ON public.club_media;
CREATE POLICY club_media_select_public_published
  ON public.club_media
  FOR SELECT
  TO anon
  USING (
    status = 'published'::public.publication_status
    AND EXISTS (
      SELECT 1
      FROM public.club_academic_years AS cay
      JOIN public.clubs AS c ON c.id = cay.club_id
      WHERE cay.id = club_media.club_academic_year_id
        AND cay.status = 'published'::public.publication_status
        AND c.status = 'published'::public.publication_status
    )
  );

DROP POLICY IF EXISTS club_media_select_authenticated ON public.club_media;
CREATE POLICY club_media_select_authenticated
  ON public.club_media
  FOR SELECT
  TO authenticated
  USING (
    public.is_active_admin()
    OR (
      status = 'published'::public.publication_status
      AND EXISTS (
        SELECT 1
        FROM public.club_academic_years AS cay
        JOIN public.clubs AS c ON c.id = cay.club_id
        WHERE cay.id = club_media.club_academic_year_id
          AND cay.status = 'published'::public.publication_status
          AND c.status = 'published'::public.publication_status
      )
    )
  );

DROP POLICY IF EXISTS club_media_insert_editors ON public.club_media;
CREATE POLICY club_media_insert_editors
  ON public.club_media
  FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_content());

DROP POLICY IF EXISTS club_media_update_editors ON public.club_media;
CREATE POLICY club_media_update_editors
  ON public.club_media
  FOR UPDATE
  TO authenticated
  USING (public.can_edit_content())
  WITH CHECK (public.can_edit_content());

DROP POLICY IF EXISTS club_media_delete_editors ON public.club_media;
CREATE POLICY club_media_delete_editors
  ON public.club_media
  FOR DELETE
  TO authenticated
  USING (public.can_edit_content());

-- -----------------------------------------------------------------------------
-- 6. Initial Official Club Identities (Idempotent — ZERO mock people/activities)
--    - IT Club          : Preserves previous academic year + active current E2 team slot
--    - CS1O1 Club       : Active current club for E1 foundational technical learning
--    - Competitive Club : Active current club for all batches (competitive exams)
--    - Technical Club   : Preserves previous academic-year history ONLY (NOT assumed active)
-- -----------------------------------------------------------------------------
INSERT INTO public.clubs (
  slug,
  name,
  short_description,
  description,
  objectives,
  target_audience,
  focus_area,
  founded_academic_year,
  display_order,
  status
)
VALUES
  (
    'it-club',
    'IT Club',
    'Student-led technical community for E2 CSE students, carrying forward the work of the previous IT Club with the current student team.',
    'The IT Club builds practical software, computing, and collaborative engineering skills for E2 students in the Department of Computer Science and Engineering while preserving the continuity and contributions of previous academic-year teams.',
    ARRAY[
      'Continue and expand the initiatives established by previous IT Club student teams',
      'Support E2 CSE students through peer-led sessions, practical workshops, and collaborative activities'
    ],
    'E2 Students',
    'Information Technology & Practical Computing',
    '2025–2026',
    1,
    'published'::public.publication_status
  ),
  (
    'cs1o1-club',
    'CS1O1 Club',
    'Foundational technical learning and hands-on computer science activities designed specifically for E1 students.',
    'CS1O1 Club introduces E1 students to core computer science concepts, programming fundamentals, and collaborative technical exploration within the CSE department.',
    ARRAY[
      'Build strong foundational computing and programming habits among E1 students',
      'Create an approachable peer-learning environment for early technical activities'
    ],
    'E1 Students',
    'Foundational Technical Learning & Activities',
    '2026–2027',
    2,
    'published'::public.publication_status
  ),
  (
    'competitive-club',
    'Competitive Club',
    'Structured preparation, peer study tracks, and problem-solving support for students across all batches preparing for competitive examinations.',
    'The Competitive Club brings together CSE students from every batch to prepare collaboratively for competitive examinations through focused practice, guidance, and peer accountability.',
    ARRAY[
      'Support students across all engineering batches in preparing for competitive examinations',
      'Organize structured practice sessions, study discussions, and preparation milestones'
    ],
    'All Batches',
    'Competitive Examination Preparation',
    '2026–2027',
    3,
    'published'::public.publication_status
  ),
  (
    'technical-club',
    'Technical Club',
    'Departmental technical club operated by previous student teams, preserved in SRC history with support for future academic-year updates.',
    'The Technical Club represents a foundational chapter of student-driven technical initiatives in the CSE department. Its previous academic-year records are preserved here, and administrators can explicitly update its current status and team details when active.',
    ARRAY[
      'Preserve the technical initiatives, student teams, and records from previous academic years',
      'Provide a structured home for current and future academic-year status updates by SRC administrators'
    ],
    'CSE Students',
    'Departmental Technical Initiatives',
    '2025–2026',
    4,
    'published'::public.publication_status
  )
ON CONFLICT (slug) DO NOTHING;

-- Seed academic-year continuity rows without fabricating members or assuming Technical Club is active
INSERT INTO public.club_academic_years (
  club_id,
  academic_year,
  start_year,
  end_year,
  is_current,
  is_active,
  summary,
  status
)
SELECT
  c.id,
  v.academic_year,
  v.start_year,
  v.end_year,
  v.is_current,
  v.is_active,
  v.summary,
  'published'::public.publication_status
FROM public.clubs AS c
JOIN (
  VALUES
    (
      'it-club',
      '2025–2026',
      2025,
      2026,
      false,
      false,
      'Previous academic-year IT Club record preserved for historical continuity. Administrators can add past coordinators, members, activities, and photographs here.'
    ),
    (
      'it-club',
      '2026–2027',
      2026,
      2027,
      true,
      true,
      'Current academic-year IT Club continuing the club''s work for E2 students.'
    ),
    (
      'cs1o1-club',
      '2026–2027',
      2026,
      2027,
      true,
      true,
      'Current academic-year CS1O1 Club focused on foundational technical learning and activities for E1 students.'
    ),
    (
      'competitive-club',
      '2026–2027',
      2026,
      2027,
      true,
      true,
      'Current academic-year Competitive Club supporting students from all batches preparing for competitive examinations.'
    ),
    (
      'technical-club',
      '2025–2026',
      2025,
      2026,
      false,
      false,
      'Previous academic-year Technical Club history operated by earlier student teams. Current-year status is managed explicitly by SRC administrators.'
    )
) AS v(slug, academic_year, start_year, end_year, is_current, is_active, summary)
  ON v.slug = c.slug
ON CONFLICT (club_id, academic_year) DO NOTHING;
