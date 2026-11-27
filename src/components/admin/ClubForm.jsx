import React, { useState } from 'react';
import { Save, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabaseClient';
import {
  STORAGE_BUCKETS,
  uploadFileToBucket,
  deleteFileFromBucket,
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
 * Create / edit form for a persistent club identity (`public.clubs`).
 * Reuses existing `event-media` storage bucket under `clubs/<slug>/...`
 * with stage-on-save upload and automatic rollback cleanup on failure.
 */
export default function ClubForm({
  initialClub = null,
  canEdit = true,
  onSaved,
  onCancel,
}) {
  const [form, setForm] = useState({
    name: initialClub?.name || '',
    slug: initialClub?.slug || '',
    target_audience: initialClub?.target_audience || '',
    focus_area: initialClub?.focus_area || '',
    founded_academic_year: initialClub?.founded_academic_year || '',
    short_description: initialClub?.short_description || '',
    description: initialClub?.description || '',
    objectivesText: (initialClub?.objectives || []).join('\n'),
    logo_url: initialClub?.logo_url || '',
    cover_image_url: initialClub?.cover_image_url || '',
    display_order: initialClub?.display_order ?? 0,
    status: initialClub?.status || 'draft',
  });

  const [pendingLogoFile, setPendingLogoFile] = useState(null);
  const [pendingCoverFile, setPendingCoverFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const folderSlug = form.slug.trim() || toSlug(form.name) || 'club';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase client is not configured.');
      return;
    }

    const cleanName = form.name.trim();
    const resolvedSlug = form.slug.trim() || toSlug(cleanName);

    if (!cleanName) {
      setError('Club name is required.');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resolvedSlug)) {
      setError('Slug must use lowercase letters, numbers, and hyphens only.');
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);

    let uploadedLogoPath = null;
    let uploadedCoverPath = null;

    try {
      let resolvedLogoPath = form.logo_url || null;
      let resolvedCoverPath = form.cover_image_url || null;

      if (pendingLogoFile) {
        const { path } = await uploadFileToBucket({
          bucket: STORAGE_BUCKETS.EVENT_MEDIA,
          file: pendingLogoFile,
          folder: `clubs/${resolvedSlug}`,
          slugPrefix: `${resolvedSlug}-logo`,
        });
        uploadedLogoPath = path;
        resolvedLogoPath = path;
      }

      if (pendingCoverFile) {
        const { path } = await uploadFileToBucket({
          bucket: STORAGE_BUCKETS.EVENT_MEDIA,
          file: pendingCoverFile,
          folder: `clubs/${resolvedSlug}`,
          slugPrefix: `${resolvedSlug}-cover`,
        });
        uploadedCoverPath = path;
        resolvedCoverPath = path;
      }

      const objectives = form.objectivesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const payload = {
        name: cleanName,
        slug: resolvedSlug,
        target_audience: form.target_audience.trim() || null,
        focus_area: form.focus_area.trim() || null,
        founded_academic_year: form.founded_academic_year.trim() || null,
        short_description: form.short_description.trim() || null,
        description: form.description.trim() || null,
        objectives,
        logo_url: resolvedLogoPath,
        cover_image_url: resolvedCoverPath,
        display_order: Number(form.display_order) || 0,
        status: form.status,
      };

      const query = initialClub?.id
        ? supabase
            .from('clubs')
            .update(payload)
            .eq('id', initialClub.id)
            .select()
            .single()
        : supabase.from('clubs').insert(payload).select().single();

      const { data: savedClub, error: dbErr } = await query;
      if (dbErr) throw dbErr;

      // Clean up replaced old logo/cover only if no other club uses them
      if (initialClub?.logo_url && initialClub.logo_url !== resolvedLogoPath) {
        const { count } = await supabase
          .from('clubs')
          .select('id', { count: 'exact', head: true })
          .eq('logo_url', initialClub.logo_url);
        if (count === 0) {
          await deleteFileFromBucket(
            STORAGE_BUCKETS.EVENT_MEDIA,
            initialClub.logo_url
          ).catch(() => {});
        }
      }

      if (
        initialClub?.cover_image_url &&
        initialClub.cover_image_url !== resolvedCoverPath
      ) {
        const { count } = await supabase
          .from('clubs')
          .select('id', { count: 'exact', head: true })
          .eq('cover_image_url', initialClub.cover_image_url);
        if (count === 0) {
          await deleteFileFromBucket(
            STORAGE_BUCKETS.EVENT_MEDIA,
            initialClub.cover_image_url
          ).catch(() => {});
        }
      }

      setPendingLogoFile(null);
      setPendingCoverFile(null);
      setSuccess('Club profile saved to PostgreSQL.');
      onSaved?.(savedClub);
    } catch (err) {
      if (uploadedLogoPath) {
        await deleteFileFromBucket(
          STORAGE_BUCKETS.EVENT_MEDIA,
          uploadedLogoPath
        ).catch(() => {});
      }
      if (uploadedCoverPath) {
        await deleteFileFromBucket(
          STORAGE_BUCKETS.EVENT_MEDIA,
          uploadedCoverPath
        ).catch(() => {});
      }
      setError(err.message || 'Failed to save club.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 rounded-xl border border-gold/35 bg-navy p-6 text-paper"
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ImageUploadField
          label="Club Logo"
          bucket={STORAGE_BUCKETS.EVENT_MEDIA}
          folder={`clubs/${folderSlug}`}
          slugPrefix={`${folderSlug}-logo`}
          valuePath={form.logo_url}
          onChangePath={(path) => updateField('logo_url', path)}
          pendingFile={pendingLogoFile}
          onSelectPendingFile={setPendingLogoFile}
          canEdit={canEdit}
          accept="image/jpeg,image/png,image/webp,image/avif"
          helperText="Club emblem stored in event-media; uploads once on Save."
        />

        <ImageUploadField
          label="Club Cover Photograph"
          bucket={STORAGE_BUCKETS.EVENT_MEDIA}
          folder={`clubs/${folderSlug}`}
          slugPrefix={`${folderSlug}-cover`}
          valuePath={form.cover_image_url}
          onChangePath={(path) => updateField('cover_image_url', path)}
          pendingFile={pendingCoverFile}
          onSelectPendingFile={setPendingCoverFile}
          canEdit={canEdit}
          accept="image/jpeg,image/png,image/webp,image/avif"
          helperText="Banner photograph stored in event-media; uploads once on Save."
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Club Name *
          </span>
          <input
            type="text"
            required
            disabled={!canEdit}
            placeholder="e.g. IT Club"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
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
            Target Audience
          </span>
          <input
            type="text"
            disabled={!canEdit}
            placeholder="e.g. E2 Students, E1 Students, All Batches"
            value={form.target_audience}
            onChange={(e) => updateField('target_audience', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Focus Area
          </span>
          <input
            type="text"
            disabled={!canEdit}
            placeholder="e.g. Foundational Technical Learning"
            value={form.focus_area}
            onChange={(e) => updateField('focus_area', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Founded Academic Year
          </span>
          <input
            type="text"
            disabled={!canEdit}
            placeholder="e.g. 2025–2026"
            value={form.founded_academic_year}
            onChange={(e) =>
              updateField('founded_academic_year', e.target.value)
            }
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
            <option value="draft">Draft (Hidden from public)</option>
            <option value="published">Published (Visible on /clubs)</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1.5 text-xs">
        <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
          Short Summary (Shown on Club Cards)
        </span>
        <input
          type="text"
          disabled={!canEdit}
          value={form.short_description}
          onChange={(e) => updateField('short_description', e.target.value)}
          className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
        />
      </label>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="block space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Full Club Description
          </span>
          <textarea
            rows={4}
            disabled={!canEdit}
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="block space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Club Objectives (one per line)
          </span>
          <textarea
            rows={4}
            disabled={!canEdit}
            placeholder="Enter one objective per line..."
            value={form.objectivesText}
            onChange={(e) => updateField('objectivesText', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>
      </div>

      <label className="block max-w-xs space-y-1.5 text-xs">
        <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
          Display Order
        </span>
        <input
          type="number"
          disabled={!canEdit}
          value={form.display_order}
          onChange={(e) => updateField('display_order', e.target.value)}
          className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
        />
      </label>

      {error && (
        <p className="flex items-center gap-2 text-xs text-red-300" role="alert">
          <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {success && (
        <p
          className="flex items-center gap-2 text-xs text-emerald-300"
          role="status"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{success}</span>
        </p>
      )}

      <div className="flex items-center gap-3">
        {canEdit && (
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-maroon px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-gold hover:text-navy-dark disabled:opacity-45"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            <span>
              {saving
                ? 'Saving...'
                : initialClub
                  ? 'Save Club Profile'
                  : 'Create Club'}
            </span>
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
