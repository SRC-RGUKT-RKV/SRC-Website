import { supabase, isSupabaseConfigured } from './supabaseClient';
import { STORAGE_BUCKETS, getPublicStorageUrl } from './storage';

function ensureSupabase() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error(
      'Supabase connection is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.'
    );
  }
  return supabase;
}

/**
 * Computes balanced asymmetric Bento Grid spans for desktop (>= 1024px)
 * when a member row does not specify an explicit bento_span.
 */
function getDefaultBentoSpan(index) {
  const pattern = [
    'lg:col-span-5 lg:row-span-2', // 0: Featured lead
    'lg:col-span-4 lg:row-span-1', // 1
    'lg:col-span-3 lg:row-span-1', // 2
    'lg:col-span-4 lg:row-span-1', // 3
    'lg:col-span-3 lg:row-span-1', // 4
    'lg:col-span-4 lg:row-span-1', // 5
    'lg:col-span-4 lg:row-span-1', // 6
    'lg:col-span-4 lg:row-span-1', // 7
  ];
  return pattern[index % pattern.length];
}

/**
 * Splits a designation into two balanced halves for the desktop GSAP collision choreography.
 */
export function getDesignationHalves(member) {
  if (
    Array.isArray(member?.designationSplit) &&
    member.designationSplit.length === 2 &&
    member.designationSplit[0] &&
    member.designationSplit[1]
  ) {
    return member.designationSplit.map((part) => String(part).trim().toUpperCase());
  }

  const clean = (member?.role || member?.designation || '').trim().toUpperCase();
  if (!clean) return ['SRC', 'MEMBER'];

  const words = clean.split(/\s+/);
  if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }

  const midChar = Math.ceil(clean.length / 2);
  return [clean.slice(0, midChar), clean.slice(midChar)];
}

export function formatEventDateRange(startDateStr, endDateStr) {
  if (!startDateStr) return '';
  const fmt = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const start = new Date(`${startDateStr}T00:00:00`);
  if (Number.isNaN(start.getTime())) return startDateStr;

  if (!endDateStr || endDateStr === startDateStr) {
    return fmt.format(start);
  }

  const end = new Date(`${endDateStr}T00:00:00`);
  if (Number.isNaN(end.getTime())) return fmt.format(start);

  if (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  ) {
    const month = start.toLocaleString('en-US', { month: 'long' });
    return `${month} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
  }

  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

export function mapMemberRow(row, batch = null, index = 0) {
  const deptParts = [row.department, row.academic_batch].filter(Boolean);
  const publishedLinks = (row.social_links || [])
    .filter((l) => l.status === 'published')
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const publishedAchievements = (row.achievements || [])
    .filter((a) => a.status === 'published')
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const hasSplit = Boolean(row.designation_left && row.designation_right);

  return {
    id: row.id,
    slug: row.slug,
    name: row.full_name,
    role: row.designation,
    designationSplit: hasSplit
      ? [row.designation_left, row.designation_right]
      : null,
    dept: deptParts.join(' • ') || 'CSE',
    image: row.photo_url
      ? getPublicStorageUrl(STORAGE_BUCKETS.MEMBER_PHOTOS, row.photo_url)
      : '',
    featured: Boolean(row.is_featured),
    bentoSpan: row.bento_span || getDefaultBentoSpan(index),
    about: row.about || '',
    responsibilities: Array.isArray(row.responsibilities)
      ? row.responsibilities
      : [],
    email: row.email || '',
    area: row.area_of_focus || 'Student Affairs',
    term: batch?.academic_year ? `SRC ${batch.academic_year}` : 'SRC Panel',
    quote: row.quote || '',
    socialLinks: publishedLinks.map((l) => ({
      id: l.id,
      platform: l.platform,
      label: l.label,
      url: l.url,
    })),
    achievements: publishedAchievements.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description || '',
      achievedOn: a.achieved_on || null,
    })),
  };
}

export function mapEventRow(row) {
  const publishedMedia = (row.event_media || [])
    .filter((m) => m.status === 'published')
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const gallery = publishedMedia
    .filter((m) => m.media_type === 'image')
    .map((m) => ({
      id: m.id,
      src: getPublicStorageUrl(STORAGE_BUCKETS.EVENT_MEDIA, m.url),
      caption: m.caption || m.title || '',
    }));

  const videos = publishedMedia
    .filter((m) => m.media_type === 'video')
    .map((m) => ({
      id: m.id,
      title: m.title || 'Event Recording',
      embedUrl:
        /^https?:\/\//i.test(m.url)
          ? m.url
          : getPublicStorageUrl(STORAGE_BUCKETS.EVENT_MEDIA, m.url),
      isDirectVideo: !/^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|player\.vimeo\.com)/i.test(
        m.url
      ),
    }));

  const links = publishedMedia
    .filter((m) => m.media_type === 'link')
    .map((m) => ({
      id: m.id,
      label: m.title || m.url,
      url: m.url,
    }));

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle || '',
    description: row.description || '',
    category: row.category,
    date: formatEventDateRange(row.event_date, row.event_end_date),
    rawDate: row.event_date,
    venue: row.venue || '',
    featured: Boolean(row.is_featured),
    coverImage: row.cover_image_url
      ? getPublicStorageUrl(STORAGE_BUCKETS.EVENT_MEDIA, row.cover_image_url)
      : gallery[0]?.src || '',
    highlights: Array.isArray(row.highlights) ? row.highlights : [],
    gallery,
    videos,
    links,
  };
}

export function mapBatchRow(row) {
  return {
    id: row.id,
    slug: row.slug,
    label: row.name,
    academicYear: row.academic_year,
    startYear: row.start_year,
    endYear: row.end_year,
    tagline: row.tagline || '',
    summary: row.summary || '',
    contributions: row.contributions || '',
    teamPhoto: row.team_photo_url
      ? getPublicStorageUrl(STORAGE_BUCKETS.VAULT_MEDIA, row.team_photo_url)
      : '',
    isCurrent: Boolean(row.is_current),
  };
}

/**
 * Fetches the current published batch and its published members
 * along with each member's published social links and achievements.
 */
export async function fetchCurrentTeamData() {
  const client = ensureSupabase();

  const { data: batchRow, error: batchErr } = await client
    .from('batches')
    .select('*')
    .eq('is_current', true)
    .eq('status', 'published')
    .maybeSingle();

  if (batchErr) throw batchErr;
  if (!batchRow) {
    return { batch: null, members: [] };
  }

  const batch = mapBatchRow(batchRow);

  const { data: memberRows, error: membersErr } = await client
    .from('members')
    .select(
      `
      *,
      social_links(id, platform, label, url, display_order, status),
      achievements(id, title, description, achieved_on, display_order, status)
    `
    )
    .eq('batch_id', batchRow.id)
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (membersErr) throw membersErr;

  const members = (memberRows || []).map((row, idx) =>
    mapMemberRow(row, batchRow, idx)
  );

  return { batch, members };
}

/**
 * Fetches featured (or most recent) published events for the Home page.
 */
export async function fetchFeaturedEvents(limit = 3) {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('events')
    .select('*, event_media(id, url, media_type, title, caption, display_order, status)')
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('event_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map(mapEventRow);
}

/**
 * Fetches all published events and their published media for the Events archive.
 */
export async function fetchPublishedEvents() {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('events')
    .select('*, event_media(id, url, media_type, title, caption, display_order, status)')
    .eq('status', 'published')
    .order('is_featured', { ascending: false })
    .order('event_date', { ascending: false })
    .order('display_order', { ascending: true });

  if (error) throw error;
  return (data || []).map(mapEventRow);
}

/**
 * Fetches a single published event and its published gallery/videos/links by slug.
 */
export async function fetchPublishedEventBySlug(slug) {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('events')
    .select('*, event_media(id, url, media_type, title, caption, display_order, status)')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
  return data ? mapEventRow(data) : null;
}

/**
 * Fetches all published historical Vault batches (is_current = false) ordered by academic year.
 */
export async function fetchPublishedVaultBatches() {
  const client = ensureSupabase();

  const { data: batchRows, error } = await client
    .from('batches')
    .select(
      `
      *,
      members(id, status),
      achievements(id, status)
    `
    )
    .eq('is_current', false)
    .eq('status', 'published')
    .order('start_year', { ascending: false })
    .order('display_order', { ascending: true });

  if (error) throw error;

  return (batchRows || []).map((row) => ({
    ...mapBatchRow(row),
    memberCount: (row.members || []).filter((m) => m.status === 'published').length,
    achievementCount: (row.achievements || []).filter((a) => a.status === 'published')
      .length,
  }));
}

/**
 * Fetches published members belonging to a specific batch (for Vault batch preview or details).
 */
export async function fetchPublishedMembersForBatch(batchId, batchRow = null) {
  const client = ensureSupabase();

  const { data, error } = await client
    .from('members')
    .select(
      `
      *,
      social_links(id, platform, label, url, display_order, status),
      achievements(id, title, description, achieved_on, display_order, status)
    `
    )
    .eq('batch_id', batchId)
    .eq('status', 'published')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map((row, idx) => mapMemberRow(row, batchRow, idx));
}

/**
 * Fetches complete historical Vault batch details by slug (or UUID fallback):
 * Batch metadata + published members + published achievements + published events.
 */
export async function fetchVaultBatchDetail(batchSlugOrId) {
  const client = ensureSupabase();

  const { data: allHistorical, error: listErr } = await client
    .from('batches')
    .select('*')
    .eq('is_current', false)
    .eq('status', 'published')
    .order('start_year', { ascending: false })
    .order('display_order', { ascending: true });

  if (listErr) throw listErr;

  const list = allHistorical || [];
  const idx = list.findIndex(
    (b) => b.slug === batchSlugOrId || b.id === batchSlugOrId
  );

  if (idx < 0) {
    return { batch: null, members: [], achievements: [], events: [], prevBatch: null, nextBatch: null };
  }

  const batchRow = list[idx];
  const [members, achRes, evRes] = await Promise.all([
    fetchPublishedMembersForBatch(batchRow.id, batchRow),
    client
      .from('achievements')
      .select('id, title, description, category, achieved_on, display_order')
      .eq('batch_id', batchRow.id)
      .eq('status', 'published')
      .order('display_order', { ascending: true }),
    client
      .from('events')
      .select('id, slug, title, event_date, category')
      .eq('batch_id', batchRow.id)
      .eq('status', 'published')
      .order('event_date', { ascending: false }),
  ]);

  if (achRes.error) throw achRes.error;
  if (evRes.error) throw evRes.error;

  return {
    batch: mapBatchRow(batchRow),
    members,
    achievements: achRes.data || [],
    events: evRes.data || [],
    prevBatch: idx > 0 ? mapBatchRow(list[idx - 1]) : null,
    nextBatch: idx < list.length - 1 ? mapBatchRow(list[idx + 1]) : null,
  };
}
