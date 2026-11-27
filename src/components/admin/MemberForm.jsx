import React, { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  Link2,
} from 'lucide-react';
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
 * Member create/edit form connected to Supabase Storage (`member-photos`),
 * `public.members`, and `public.social_links`.
 * Saves ONLY relative storage paths in PostgreSQL, never image binaries.
 */
export default function MemberForm({
  batchId,
  batchSlug = 'current',
  initialMember = null,
  canEdit = true,
  onSaved,
  onCancel,
}) {
  const [form, setForm] = useState({
    full_name: initialMember?.full_name || '',
    slug: initialMember?.slug || '',
    designation: initialMember?.designation || '',
    designation_left: initialMember?.designation_left || '',
    designation_right: initialMember?.designation_right || '',
    department: initialMember?.department || 'CSE',
    academic_batch: initialMember?.academic_batch || '',
    area_of_focus: initialMember?.area_of_focus || '',
    email: initialMember?.email || '',
    about: initialMember?.about || '',
    quote: initialMember?.quote || '',
    responsibilitiesText: (initialMember?.responsibilities || []).join('\n'),
    photo_url: initialMember?.photo_url || '',
    bento_span: initialMember?.bento_span || '',
    is_featured: Boolean(initialMember?.is_featured),
    display_order: initialMember?.display_order ?? 0,
    status: initialMember?.status || 'draft',
  });

  const [socialLinks, setSocialLinks] = useState([]);
  const [newSocial, setNewSocial] = useState({
    platform: 'linkedin',
    label: 'LinkedIn',
    url: '',
  });
  const [pendingPhotoFile, setPendingPhotoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!initialMember?.id || !supabase) return;
    supabase
      .from('social_links')
      .select('id, platform, label, url, display_order, status')
      .eq('member_id', initialMember.id)
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        if (data) setSocialLinks(data);
      });
  }, [initialMember?.id]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddSocialLink = () => {
    if (!canEdit) return;
    setError('');
    const cleanUrl = newSocial.url.trim();
    if (!cleanUrl || !/^(https?:\/\/|mailto:)/i.test(cleanUrl)) {
      setError('Social URL must start with https://, http://, or mailto:.');
      return;
    }
    setSocialLinks((prev) => [
      ...prev,
      {
        platform: newSocial.platform.trim() || 'website',
        label: newSocial.label.trim() || newSocial.platform,
        url: cleanUrl,
        display_order: prev.length,
        status: form.status,
      },
    ]);
    setNewSocial({ platform: 'github', label: 'GitHub', url: '' });
  };

  const handleRemoveSocialLink = async (idx) => {
    if (!canEdit) return;
    const item = socialLinks[idx];
    if (item?.id && supabase) {
      const { error: delErr } = await supabase
        .from('social_links')
        .delete()
        .eq('id', item.id);
      if (delErr) {
        setError(delErr.message || 'Failed to delete social link.');
        return;
      }
    }
    setSocialLinks((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase client is not configured.');
      return;
    }
    if (!batchId) {
      setError('Please select an academic batch before saving a member.');
      return;
    }

    const cleanName = form.full_name.trim();
    const cleanDesignation = form.designation.trim();
    const resolvedSlug = form.slug.trim() || toSlug(cleanName || cleanDesignation);

    if (!cleanName || !cleanDesignation) {
      setError('Full name and designation are required.');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resolvedSlug)) {
      setError('Slug must contain only lowercase letters, numbers, and hyphens.');
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);

    let newlyUploadedPath = null;
    try {
      let resolvedPhotoPath = form.photo_url || null;

      if (pendingPhotoFile) {
        const { path } = await uploadFileToBucket({
          bucket: STORAGE_BUCKETS.MEMBER_PHOTOS,
          file: pendingPhotoFile,
          folder: batchSlug,
          slugPrefix: resolvedSlug || 'member',
        });
        newlyUploadedPath = path;
        resolvedPhotoPath = path;
      }

      const responsibilities = form.responsibilitiesText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      const payload = {
        batch_id: batchId,
        slug: resolvedSlug,
        full_name: cleanName,
        designation: cleanDesignation,
        designation_left: form.designation_left.trim() || null,
        designation_right: form.designation_right.trim() || null,
        department: form.department.trim() || 'CSE',
        academic_batch: form.academic_batch.trim() || null,
        area_of_focus: form.area_of_focus.trim() || null,
        email: form.email.trim() || null,
        about: form.about.trim() || null,
        quote: form.quote.trim() || null,
        responsibilities,
        photo_url: resolvedPhotoPath,
        bento_span: form.bento_span.trim() || null,
        is_featured: Boolean(form.is_featured),
        display_order: Number(form.display_order) || 0,
        status: form.status,
      };

      const query = initialMember?.id
        ? supabase
            .from('members')
            .update(payload)
            .eq('id', initialMember.id)
            .select()
            .single()
        : supabase.from('members').insert(payload).select().single();

      const { data: savedMember, error: dbError } = await query;
      if (dbError) throw dbError;

      // Insert any newly added social links into public.social_links
      const unsavedLinks = socialLinks
        .filter((link) => !link.id)
        .map((link, idx) => ({
          member_id: savedMember.id,
          is_organization_link: false,
          platform: link.platform,
          label: link.label,
          url: link.url,
          display_order: link.display_order ?? idx,
          status: form.status,
        }));

      if (unsavedLinks.length > 0) {
        const { error: linkErr } = await supabase
          .from('social_links')
          .insert(unsavedLinks);
        if (linkErr) throw linkErr;
      }

      // Safely remove previous photo from storage if replaced and no longer referenced
      const previousPath = initialMember?.photo_url;
      if (previousPath && previousPath !== resolvedPhotoPath) {
        const { count } = await supabase
          .from('members')
          .select('id', { count: 'exact', head: true })
          .eq('photo_url', previousPath);
        if (count === 0) {
          await deleteFileFromBucket(
            STORAGE_BUCKETS.MEMBER_PHOTOS,
            previousPath
          ).catch(() => {});
        }
      }

      setPendingPhotoFile(null);
      updateField('photo_url', resolvedPhotoPath || '');
      setSuccess('Member record and media path saved to PostgreSQL.');
      onSaved?.(savedMember);
    } catch (err) {
      // Roll back newly uploaded file if PostgreSQL save failed so zero orphans remain
      if (newlyUploadedPath) {
        await deleteFileFromBucket(
          STORAGE_BUCKETS.MEMBER_PHOTOS,
          newlyUploadedPath
        ).catch(() => {});
      }
      setError(err.message || 'Failed to save member.');
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
        label="Member Portrait"
        bucket={STORAGE_BUCKETS.MEMBER_PHOTOS}
        folder={batchSlug}
        slugPrefix={form.slug || toSlug(form.full_name || 'member')}
        valuePath={form.photo_url}
        onChangePath={(path) => updateField('photo_url', path)}
        pendingFile={pendingPhotoFile}
        onSelectPendingFile={setPendingPhotoFile}
        canEdit={canEdit}
        helperText="JPG, PNG, WebP, or AVIF up to 5 MB. Uploads once when you click Save Member (or choose an existing portrait)."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Full Name *
          </span>
          <input
            type="text"
            required
            disabled={!canEdit}
            value={form.full_name}
            onChange={(e) => updateField('full_name', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Designation *
          </span>
          <input
            type="text"
            required
            disabled={!canEdit}
            value={form.designation}
            onChange={(e) => updateField('designation', e.target.value)}
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
            Designation Left Half
          </span>
          <input
            type="text"
            disabled={!canEdit}
            placeholder="e.g. PRESI"
            value={form.designation_left}
            onChange={(e) => updateField('designation_left', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Designation Right Half
          </span>
          <input
            type="text"
            disabled={!canEdit}
            placeholder="e.g. DENT"
            value={form.designation_right}
            onChange={(e) => updateField('designation_right', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Status
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

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Department &amp; Year
          </span>
          <input
            type="text"
            disabled={!canEdit}
            placeholder="e.g. E3"
            value={form.academic_batch}
            onChange={(e) => updateField('academic_batch', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Area of Focus
          </span>
          <input
            type="text"
            disabled={!canEdit}
            placeholder="e.g. Technical Affairs"
            value={form.area_of_focus}
            onChange={(e) => updateField('area_of_focus', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Email
          </span>
          <input
            type="email"
            disabled={!canEdit}
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="block space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            About
          </span>
          <textarea
            rows={3}
            disabled={!canEdit}
            value={form.about}
            onChange={(e) => updateField('about', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="block space-y-1.5 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Responsibilities (one per line)
          </span>
          <textarea
            rows={3}
            disabled={!canEdit}
            value={form.responsibilitiesText}
            onChange={(e) => updateField('responsibilitiesText', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="space-y-1.5 text-xs sm:col-span-2">
          <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
            Quote
          </span>
          <input
            type="text"
            disabled={!canEdit}
            value={form.quote}
            onChange={(e) => updateField('quote', e.target.value)}
            className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
          />
        </label>

        <label className="space-y-1.5 text-xs">
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
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-paper">
        <input
          type="checkbox"
          disabled={!canEdit}
          checked={form.is_featured}
          onChange={(e) => updateField('is_featured', e.target.checked)}
          className="h-4 w-4 accent-gold"
        />
        <span>Featured in Home &amp; Team Bento Grid</span>
      </label>

      {/* Member Social Links (public.social_links) */}
      <div className="space-y-3 rounded-xl border border-line/15 bg-navy-deep p-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-gold" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-light">
            Member Social Links (public.social_links)
          </p>
        </div>

        {canEdit && (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
            <select
              value={newSocial.platform}
              onChange={(e) =>
                setNewSocial((prev) => ({
                  ...prev,
                  platform: e.target.value,
                  label:
                    e.target.value.charAt(0).toUpperCase() +
                    e.target.value.slice(1),
                }))
              }
              className="rounded-md border border-line/20 bg-navy px-2.5 py-2 text-xs text-paper sm:col-span-3"
            >
              <option value="linkedin">LinkedIn</option>
              <option value="github">GitHub</option>
              <option value="instagram">Instagram</option>
              <option value="website">Website</option>
            </select>
            <input
              type="url"
              placeholder="https://..."
              value={newSocial.url}
              onChange={(e) =>
                setNewSocial((prev) => ({ ...prev, url: e.target.value }))
              }
              className="rounded-md border border-line/20 bg-navy px-3 py-2 text-xs text-paper sm:col-span-7"
            />
            <button
              type="button"
              onClick={handleAddSocialLink}
              className="inline-flex items-center justify-center gap-1 rounded-md border border-gold/45 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-gold-light hover:bg-gold hover:text-navy-dark sm:col-span-2"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        )}

        {socialLinks.length > 0 && (
          <ul className="space-y-2">
            {socialLinks.map((link, idx) => (
              <li
                key={`${link.url}-${idx}`}
                className="flex items-center justify-between gap-3 rounded-md border border-line/15 bg-navy px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-semibold text-gold-light">
                    {link.label}:{' '}
                  </span>
                  <span className="truncate text-paper/80">{link.url}</span>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSocialLink(idx)}
                    className="text-paper/55 hover:text-paper"
                    aria-label="Remove social link"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
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
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-maroon px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-gold hover:text-navy-dark disabled:cursor-not-allowed disabled:opacity-45"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" aria-hidden="true" />
            )}
            <span>{saving ? 'Saving...' : 'Save Member'}</span>
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
