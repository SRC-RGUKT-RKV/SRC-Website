-- =============================================================================
-- SRC Website — Allow Supabase Storage Relative Paths in public.event_media
-- File: supabase/migrations/20261127000400_fix_event_media_url_constraint.sql
--
-- Fixes:
--   new row for relation "event_media" violates check constraint "event_media_url_scheme"
--
-- Why:
--   Uploaded gallery images/videos in `event-media` store relative storage paths
--   (e.g. `teachers-day/photo-1795...-abc123.jpg`), while the original check
--   constraint only allowed strings starting with `http://`, `https://`, `/`, or `mailto:`.
--
-- Security:
--   - Still permits https://, http://, mailto:, and /-prefixed paths.
--   - Permits relative storage paths while explicitly blocking unsafe URI schemes
--     (e.g. javascript:, data:) and path traversal (..).
-- =============================================================================

ALTER TABLE public.event_media
  DROP CONSTRAINT IF EXISTS event_media_url_scheme;

ALTER TABLE public.event_media
  ADD CONSTRAINT event_media_url_scheme CHECK (
    char_length(trim(url)) > 0
    AND (
      url ~* '^(https?://|/|mailto:)'
      OR (
        url !~* '^[a-z][a-z0-9+.-]*:'
        AND url !~ '\.\.'
      )
    )
  );
