import React, { useState, useRef } from 'react';
import {
  Save,
  Loader2,
  Upload,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Video,
  Link2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import {
  STORAGE_BUCKETS,
  uploadFileToBucket,
  deleteFileFromBucket,
  getPublicStorageUrl,
} from '../../lib/storage';
import ImageUploadField from './ImageUploadField';

function toSlug(value = '') {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Event create/edit form connected to Supabase Storage (`event-media`)
 * and `public.events` + `public.event_media` (images, video embed URLs, external links).
 * Saves ONLY storage object paths or URLs in PostgreSQL, never image binaries.
 */
export default function EventForm({
  batches = [],
  batchId = null,
  initialEvent = null,
  initialGallery = [],
  canEdit = true,
  onSaved,
  onCancel,
}) {
  const galleryInputRef = useRef(null);

  const [form, setForm] = useState({
    batch_id: initialEvent?.batch_id || batchId || '',
    title: initialEvent?.title || '',
    slug: initialEvent?.slug || '',
    subtitle: initialEvent?.subtitle || '',
    description: initialEvent?.description || '',
    category: initialEvent?.category || 'Keynote & Dialogue',
    event_date: initialEvent?.event_date || '',
    event_end_date: initialEvent?.event_end_date || '',
    venue: initialEvent?.venue || '',
    cover_image_url: initialEvent?.cover_image_url || '',
    highlightsText: (initialEvent?.highlights || []).join('\n'),
    is_featured: Boolean(initialEvent?.is_featured),
    display_order: initialEvent?.display_order ?? 0,
    status: initialEvent?.status || 'draft',
  });

  // All event_media rows: { id?, url, media_type: 'image'|'video'|'link', title, caption, display_order }
  const [mediaItems, setMediaItems] = useState(initialGallery);
  const [newVideo, setNewVideo] = useState({ title: '', url: '' });
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [pendingCoverFile, setPendingCoverFile] = useState(null);
  const [persistedEventId, setPersistedEventId] = useState(
    initialEvent?.id || null
  );
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const eventFolder = form.slug.trim() || toSlug(form.title) || 'event';

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !canEdit) return;

    setError('');
    setGalleryUploading(true);
    try {
      const uploadedRows = [];
      for (const file of files) {
        const { path } = await uploadFileToBucket({
          bucket: STORAGE_BUCKETS.EVENT_MEDIA,
          file,
          folder: eventFolder,
        });
        uploadedRows.push({
          url: path,
          media_type: file.type.startsWith('video/') ? 'video' : 'image',
          title: file.name,
          caption: '',
          display_order: mediaItems.length + uploadedRows.length,
        });
      }
      setMediaItems((prev) => [...prev, ...uploadedRows]);
    } catch (err) {
      setError(err.message || 'Gallery media upload failed.');
    } finally {
      setGalleryUploading(false);
      e.target.value = '';
    }
  };

  const handleAddExternalMedia = (type, entry, resetFn) => {
    if (!canEdit) return;
    setError('');
    const cleanUrl = entry.url.trim();
    if (!cleanUrl || !/^(https?:\/\/|mailto:)/i.test(cleanUrl)) {
      setError('URL must start with https://, http://, or mailto:.');
      return;
    }
    setMediaItems((prev) => [
      ...prev,
      {
        url: cleanUrl,
        media_type: type,
        title: entry.title.trim() || (type === 'video' ? 'Event Video' : 'Related Link'),
        caption: '',
        display_order: prev.length,
      },
    ]);
    resetFn({ title: '', url: '' });
  };

  const handleRemoveMediaItem = async (idx) => {
    if (!canEdit) return;
    const item = mediaItems[idx];
    if (!item) return;

    setError('');
    try {
      if (item.url && !/^https?:\/\//i.test(item.url) && !item.url.startsWith('/')) {
        await deleteFileFromBucket(STORAGE_BUCKETS.EVENT_MEDIA, item.url);
      }
      if (item.id && isSupabaseConfigured && supabase) {
        const { error: delError } = await supabase
          .from('event_media')
          .delete()
          .eq('id', item.id);
        if (delError) throw delError;
      }
      setMediaItems((prev) => prev.filter((_, i) => i !== idx));
    } catch (err) {
      setError(err.message || 'Failed to remove media item.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase client is not configured.');
      return;
    }

    const cleanTitle = form.title.trim();
    const resolvedSlug = form.slug.trim() || toSlug(cleanTitle);

    if (!cleanTitle || !form.category.trim() || !form.event_date) {
      setError('Title, category, and event date are required.');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resolvedSlug)) {
      setError('Slug must use lowercase letters, numbers, and hyphens only.');
      return;
    }
    if (form.event_end_date && form.event_end_date < form.event_date) {
      setError('Event end date cannot be earlier than start date.');
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);

    let newlyUploadedCover = null;
    try {
      let resolvedCoverPath = form.cover_image_url || null;

      if (pendingCoverFile) {
        const { path } = await uploadFileToBucket({
          bucket: STORAGE_BUCKETS.EVENT_MEDIA,
          file: pendingCoverFile,
          folder: `covers/${resolvedSlug}`,
          slugPrefix: `${resolvedSlug}-cover`,
        });
        newlyUploadedCover = path;
        resolvedCoverPath = path;
      }

      const highlights = form.highlightsText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const eventPayload = {
        batch_id: form.batch_id || null,
        slug: resolvedSlug,
        title: cleanTitle,
        subtitle: form.subtitle.trim() || null,
        description: form.description.trim() || null,
        category: form.category.trim(),
        event_date: form.event_date,
        event_end_date: form.event_end_date || null,
        venue: form.venue.trim() || null,
        cover_image_url: resolvedCoverPath,
        highlights,
        is_featured: Boolean(form.is_featured),
        display_order: Number(form.display_order) || 0,
        status: form.status,
      };

      const targetEventId = initialEvent?.id || persistedEventId;
      const eventQuery = targetEventId
        ? supabase
            .from('events')
            .update(eventPayload)
            .eq('id', targetEventId)
            .select()
            .single()
        : supabase.from('events').insert(eventPayload).select().single();

      const { data: savedEvent, error: eventErr } = await eventQuery;
      if (eventErr) throw eventErr;
      setPersistedEventId(savedEvent.id);

      // Update captions on existing media rows if edited
      const existingRows = mediaItems.filter((item) => Boolean(item.id));
      for (const row of existingRows) {
        const { error: updErr } = await supabase
          .from('event_media')
          .update({
            caption: row.caption || null,
            title: row.title || null,
            status: form.status,
          })
          .eq('id', row.id);
        if (updErr) throw updErr;
      }

      // Insert newly added gallery files, video URLs, and external links
      const newMediaRows = mediaItems
        .filter((item) => !item.id && item.url)
        .map((item, idx) => ({
          event_id: savedEvent.id,
          media_type: item.media_type || 'image',
          url: item.url,
          title: item.title || null,
          caption: item.caption || null,
          display_order: item.display_order ?? idx,
          status: form.status,
        }));

      if (newMediaRows.length > 0) {
        const { data: insertedMedia, error: mediaErr } = await supabase
          .from('event_media')
          .insert(newMediaRows)
          .select();
        if (mediaErr) throw mediaErr;

        setMediaItems((prev) => [
          ...prev.filter((item) => Boolean(item.id)),
          ...(insertedMedia || []),
        ]);
      }

      // Clean up old cover image if replaced and no longer referenced
      const previousCover = initialEvent?.cover_image_url;
      if (previousCover && previousCover !== resolvedCoverPath) {
        const { count } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('cover_image_url', previousCover);
        if (count === 0) {
          await deleteFileFromBucket(
            STORAGE_BUCKETS.EVENT_MEDIA,
            previousCover
          ).catch(() => {});
        }
      }

      setPendingCoverFile(null);
      updateField('cover_image_url', resolvedCoverPath || '');
      setSuccess('Event, gallery paths, and video/link entries saved in PostgreSQL.');
      onSaved?.(savedEvent);
    } catch (err) {
      if (newlyUploadedCover) {
        await deleteFileFromBucket(
          STORAGE_BUCKETS.EVENT_MEDIA,
          newlyUploadedCover
        ).catch(() => {});
      }
      setError(err.message || 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-gold/35 bg-navy p-6 text-paper"
    >
      <ImageUploadField
        label="Event Cover Photo"
        bucket={STORAGE_BUCKETS.EVENT_MEDIA}
        folder={`covers/${eventFolder}`}
        slugPrefix={`${eventFolder}-cover`}
        valuePath={form.cover_image_url}
        onChangePath={(path) => updateField('cover_image_url', path)}
        pendingFile={pendingCoverFile}
        onSelectPendingFile={setPendingCoverFile}
        canEdit={canEdit}
        accept="image/jpeg,image/png,image/webp,image/avif"
        helperText="Uploads once to event-media when you click Save Event (or choose an existing image)."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Event Title *
          </span>
          <input
            type="text"
            required
            disabled={!canEdit}
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Slug
          </span>
          <input
            type="text"
            disabled={!canEdit}
            placeholder="auto-generated"
            value={form.slug}
            onChange={(e) => updateField('slug', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Category *
          </span>
          <input
            type="text"
            required
            disabled={!canEdit}
            value={form.category}
            onChange={(e) => updateField('category', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Event Start Date *
          </span>
          <input
            type="date"
            required
            disabled={!canEdit}
            value={form.event_date}
            onChange={(e) => updateField('event_date', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Event End Date
          </span>
          <input
            type="date"
            disabled={!canEdit}
            value={form.event_end_date}
            onChange={(e) => updateField('event_end_date', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Publication Status
          </span>
          <select
            disabled={!canEdit}
            value={form.status}
            onChange={(e) => updateField('status', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        {batches.length > 0 && (
          <label className="space-y-1.5 text-xs">
            <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
              Organizing Batch
            </span>
            <select
              disabled={!canEdit}
              value={form.batch_id}
              onChange={(e) => updateField('batch_id', e.target.value)}
              className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
            >
              <option value="">None / Cross-Batch</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.academic_year})
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Venue
          </span>
          <input
            type="text"
            disabled={!canEdit}
            placeholder="e.g. CSE Auditorium"
            value={form.venue}
            onChange={(e) => updateField('venue', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Subtitle
          </span>
          <input
            type="text"
            disabled={!canEdit}
            value={form.subtitle}
            onChange={(e) => updateField('subtitle', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="block space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Description
          </span>
          <textarea
            rows={3}
            disabled={!canEdit}
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="block space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Highlights (one per line)
          </span>
          <textarea
            rows={3}
            disabled={!canEdit}
            value={form.highlightsText}
            onChange={(e) => updateField('highlightsText', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-paper">
        <input
          type="checkbox"
          disabled={!canEdit}
          checked={form.is_featured}
          onChange={(e) => updateField('is_featured', e.target.checked)}
          className="h-4 w-4 accent-gold"
        />
        <span>Featured Event on Events Archive</span>
      </label>

      {/* Gallery Uploads + Video URLs + External Links -> public.event_media */}
      <div className="space-y-4 rounded-xl border border-line/15 bg-navy-deep p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-light">
              Gallery Photos, Video Embeds &amp; Links (public.event_media)
            </p>
            <p className="text-[11px] text-paper/55">
              Uploaded files go to bucket <code>event-media</code>; only paths &amp; URLs are saved in PostgreSQL.
            </p>
          </div>

          <input
            ref={galleryInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm"
            disabled={!canEdit || galleryUploading}
            onChange={handleGalleryUpload}
            className="hidden"
          />
          <button
            type="button"
            disabled={!canEdit || galleryUploading}
            onClick={() => galleryInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-md border border-gold/45 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold-light transition-colors hover:bg-gold hover:text-navy-dark disabled:cursor-not-allowed disabled:opacity-45"
          >
            {galleryUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{galleryUploading ? 'Uploading...' : 'Upload Gallery Files'}</span>
          </button>
        </div>

        {/* Add Video Embed URL */}
        {canEdit && (
          <div className="grid grid-cols-1 gap-2 border-t border-line/10 pt-3 sm:grid-cols-12">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gold-light sm:col-span-2">
              <Video className="h-3.5 w-3.5" /> Video URL
            </div>
            <input
              type="text"
              placeholder="Video title"
              value={newVideo.title}
              onChange={(e) =>
                setNewVideo((prev) => ({ ...prev, title: e.target.value }))
              }
              className="rounded-md border border-line/20 bg-navy px-2.5 py-1.5 text-xs text-paper sm:col-span-3"
            />
            <input
              type="url"
              placeholder="https://www.youtube.com/embed/..."
              value={newVideo.url}
              onChange={(e) =>
                setNewVideo((prev) => ({ ...prev, url: e.target.value }))
              }
              className="rounded-md border border-line/20 bg-navy px-2.5 py-1.5 text-xs text-paper sm:col-span-5"
            />
            <button
              type="button"
              onClick={() => handleAddExternalMedia('video', newVideo, setNewVideo)}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold-light hover:bg-gold hover:text-navy-dark sm:col-span-2"
            >
              <Plus className="h-3.5 w-3.5" /> Add Video
            </button>
          </div>
        )}

        {/* Add External Resource Link */}
        {canEdit && (
          <div className="grid grid-cols-1 gap-2 border-t border-line/10 pt-3 sm:grid-cols-12">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gold-light sm:col-span-2">
              <Link2 className="h-3.5 w-3.5" /> Ext. Link
            </div>
            <input
              type="text"
              placeholder="Link label"
              value={newLink.title}
              onChange={(e) =>
                setNewLink((prev) => ({ ...prev, title: e.target.value }))
              }
              className="rounded-md border border-line/20 bg-navy px-2.5 py-1.5 text-xs text-paper sm:col-span-3"
            />
            <input
              type="url"
              placeholder="https://..."
              value={newLink.url}
              onChange={(e) =>
                setNewLink((prev) => ({ ...prev, url: e.target.value }))
              }
              className="rounded-md border border-line/20 bg-navy px-2.5 py-1.5 text-xs text-paper sm:col-span-5"
            />
            <button
              type="button"
              onClick={() => handleAddExternalMedia('link', newLink, setNewLink)}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold-light hover:bg-gold hover:text-navy-dark sm:col-span-2"
            >
              <Plus className="h-3.5 w-3.5" /> Add Link
            </button>
          </div>
        )}

        {/* Media List */}
        {mediaItems.length > 0 && (
          <div className="grid grid-cols-1 gap-3 border-t border-line/10 pt-3 sm:grid-cols-2">
            {mediaItems.map((item, idx) => (
              <div
                key={`${item.url}-${idx}`}
                className="flex items-center gap-3 rounded-lg border border-line/15 bg-navy p-2.5"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-navy-dark">
                  {item.media_type === 'image' ? (
                    <img
                      src={getPublicStorageUrl(STORAGE_BUCKETS.EVENT_MEDIA, item.url)}
                      alt={item.caption || item.title || `Media ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase text-gold-light">
                      {item.media_type}
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-mono text-[11px] text-paper/75">
                    {item.url}
                  </p>
                  <input
                    type="text"
                    disabled={!canEdit}
                    placeholder={
                      item.media_type === 'image' ? 'Caption (optional)' : 'Title'
                    }
                    value={
                      item.media_type === 'image'
                        ? item.caption || ''
                        : item.title || ''
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setMediaItems((prev) =>
                        prev.map((row, i) =>
                          i === idx
                            ? row.media_type === 'image'
                              ? { ...row, caption: val }
                              : { ...row, title: val }
                            : row
                        )
                      );
                    }}
                    className="w-full rounded border border-line/15 bg-navy-deep px-2 py-1 text-xs text-paper"
                  />
                </div>

                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleRemoveMediaItem(idx)}
                    aria-label="Remove media item"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-paper/60 hover:bg-maroon/30 hover:text-paper"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-2 text-xs text-red-300" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {success && (
        <p className="flex items-center gap-2 text-xs text-emerald-300" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{success}</span>
        </p>
      )}

      <div className="flex items-center gap-3">
        {canEdit && (
          <button
            type="submit"
            disabled={saving || galleryUploading}
            className="inline-flex items-center gap-2 rounded-md bg-maroon px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-gold hover:text-navy-dark disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{saving ? 'Saving...' : 'Save Event'}</span>
          </button>
        )}

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line/25 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-paper/75 hover:text-paper"
          >
            Close
          </button>
        )}
      </div>
    </form>
  );
}
