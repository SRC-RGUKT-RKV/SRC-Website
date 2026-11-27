import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Star,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { STORAGE_BUCKETS, deleteFileFromBucket } from '../../lib/storage';
import ImageUploadField from '../../components/admin/ImageUploadField';

function toSlug(val = '') {
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const EMPTY_FORM = {
  name: '',
  slug: '',
  academic_year: '',
  start_year: new Date().getFullYear(),
  end_year: new Date().getFullYear() + 1,
  tagline: '',
  summary: '',
  contributions: '',
  team_photo_url: '',
  is_current: false,
  status: 'draft',
  display_order: 0,
};

export default function AdminBatches() {
  const { canEdit } = useAdminAuth();

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadBatches = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('batches')
        .select('*')
        .order('is_current', { ascending: false })
        .order('start_year', { ascending: false })
        .order('display_order', { ascending: true });
      if (err) throw err;
      setBatches(data || []);
    } catch (err) {
      setError(err.message || 'Failed to load academic batches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setFeedback('');
    setShowForm(true);
  };

  const openEdit = (batch) => {
    setEditingId(batch.id);
    setForm({
      name: batch.name || '',
      slug: batch.slug || '',
      academic_year: batch.academic_year || '',
      start_year: batch.start_year,
      end_year: batch.end_year,
      tagline: batch.tagline || '',
      summary: batch.summary || '',
      contributions: batch.contributions || '',
      team_photo_url: batch.team_photo_url || '',
      is_current: Boolean(batch.is_current),
      status: batch.status || 'draft',
      display_order: batch.display_order ?? 0,
    });
    setError('');
    setFeedback('');
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit || !supabase) return;

    setError('');
    setFeedback('');

    const cleanName = form.name.trim();
    const cleanAcademicYear = form.academic_year.trim();
    const resolvedSlug = form.slug.trim() || toSlug(cleanName);
    const startYear = Number(form.start_year);
    const endYear = Number(form.end_year);

    if (!cleanName) {
      setError('Batch name is required.');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(resolvedSlug)) {
      setError('Slug must use lowercase letters, numbers, and hyphens only.');
      return;
    }
    if (!cleanAcademicYear) {
      setError('Academic year is required (e.g. 2026–2027).');
      return;
    }
    if (
      Number.isNaN(startYear) ||
      Number.isNaN(endYear) ||
      startYear < 2000 ||
      endYear < startYear ||
      endYear > 2105
    ) {
      setError('End year must be greater than or equal to start year (2000–2105).');
      return;
    }

    setSaving(true);
    try {
      // Respect idx_batches_single_current: clear existing current flag before setting a new one
      if (form.is_current) {
        let clearQuery = supabase
          .from('batches')
          .update({ is_current: false })
          .eq('is_current', true);
        if (editingId) {
          clearQuery = clearQuery.neq('id', editingId);
        }
        const { error: clearErr } = await clearQuery;
        if (clearErr) throw clearErr;
      }

      const payload = {
        name: cleanName,
        slug: resolvedSlug,
        academic_year: cleanAcademicYear,
        start_year: startYear,
        end_year: endYear,
        tagline: form.tagline.trim() || null,
        summary: form.summary.trim() || null,
        contributions: form.contributions.trim() || null,
        team_photo_url: form.team_photo_url || null,
        is_current: Boolean(form.is_current),
        status: form.status,
        display_order: Number(form.display_order) || 0,
      };

      const { error: saveErr } = editingId
        ? await supabase.from('batches').update(payload).eq('id', editingId)
        : await supabase.from('batches').insert(payload);

      if (saveErr) throw saveErr;

      setFeedback(
        editingId
          ? `Updated batch "${cleanName}".`
          : `Created batch "${cleanName}".`
      );
      setShowForm(false);
      setEditingId(null);
      await loadBatches();
    } catch (err) {
      setError(err.message || 'Failed to save batch.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetCurrent = async (batch) => {
    if (!canEdit || !supabase || batch.is_current) return;
    setError('');
    setFeedback('');
    try {
      const { error: clearErr } = await supabase
        .from('batches')
        .update({ is_current: false })
        .eq('is_current', true);
      if (clearErr) throw clearErr;

      const { error: setErr } = await supabase
        .from('batches')
        .update({ is_current: true })
        .eq('id', batch.id);
      if (setErr) throw setErr;

      setFeedback(`"${batch.name}" is now the active current SRC batch.`);
      await loadBatches();
    } catch (err) {
      setError(err.message || 'Could not update current batch.');
    }
  };

  const handleTogglePublish = async (batch) => {
    if (!canEdit || !supabase) return;
    const nextStatus = batch.status === 'published' ? 'draft' : 'published';
    setError('');
    setFeedback('');
    try {
      const { error: updErr } = await supabase
        .from('batches')
        .update({ status: nextStatus })
        .eq('id', batch.id);
      if (updErr) throw updErr;

      setFeedback(
        nextStatus === 'published'
          ? `Published "${batch.name}" — it is now visible on the public website.`
          : `Moved "${batch.name}" back to draft.`
      );
      await loadBatches();
    } catch (err) {
      setError(err.message || 'Could not update publication status.');
    }
  };

  const handleDelete = async (batch) => {
    if (!canEdit || !supabase) return;
    const confirmed = window.confirm(
      `Delete "${batch.name}"? This will also cascade-delete all members and achievements inside this batch.`
    );
    if (!confirmed) return;

    setError('');
    setFeedback('');
    try {
      const { error: delErr } = await supabase
        .from('batches')
        .delete()
        .eq('id', batch.id);
      if (delErr) throw delErr;

      if (batch.team_photo_url) {
        await deleteFileFromBucket(
          STORAGE_BUCKETS.VAULT_MEDIA,
          batch.team_photo_url
        ).catch(() => {});
      }

      setFeedback(`Deleted batch "${batch.name}".`);
      await loadBatches();
    } catch (err) {
      setError(err.message || 'Failed to delete batch.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-line/15 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
            PostgreSQL · public.batches
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-paper">
            Academic Batches
          </h1>
          <p className="mt-1 text-sm text-paper/65">
            Manage the single active SRC panel and historical academic year
            batches.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 self-start rounded-md bg-maroon px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-gold hover:text-navy-dark sm:self-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New Batch</span>
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-maroon bg-maroon/25 p-3.5 text-xs text-paper"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-gold/40 bg-navy p-3.5 text-xs text-gold-light"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Create / Edit Form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="space-y-5 rounded-xl border border-gold/35 bg-navy p-6"
        >
          <div className="flex items-center justify-between border-b border-line/15 pb-4">
            <h2 className="font-display text-xl font-bold text-paper">
              {editingId ? 'Edit Academic Batch' : 'Create Academic Batch'}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md p-1.5 text-paper/65 hover:text-paper"
              aria-label="Close form"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <ImageUploadField
            label="Batch Team Photograph"
            bucket={STORAGE_BUCKETS.VAULT_MEDIA}
            folder={form.slug || toSlug(form.name || 'batch')}
            slugPrefix="team-photo"
            valuePath={form.team_photo_url}
            onChangePath={(path) =>
              setForm((prev) => ({ ...prev, team_photo_url: path }))
            }
            canEdit={canEdit}
            helperText="Stored in bucket vault-media; path saved in batches.team_photo_url."
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1.5 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                Batch Name *
              </span>
              <input
                type="text"
                required
                disabled={!canEdit}
                placeholder="e.g. Batch 2026"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                Slug *
              </span>
              <input
                type="text"
                disabled={!canEdit}
                placeholder="batch-2026"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, slug: e.target.value }))
                }
                className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                Academic Year *
              </span>
              <input
                type="text"
                required
                disabled={!canEdit}
                placeholder="2026–2027"
                value={form.academic_year}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, academic_year: e.target.value }))
                }
                className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                Start Year *
              </span>
              <input
                type="number"
                required
                min={2000}
                max={2100}
                disabled={!canEdit}
                value={form.start_year}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, start_year: e.target.value }))
                }
                className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
              />
            </label>

            <label className="space-y-1.5 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                End Year *
              </span>
              <input
                type="number"
                required
                min={2000}
                max={2105}
                disabled={!canEdit}
                value={form.end_year}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, end_year: e.target.value }))
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
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, status: e.target.value }))
                }
                className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
              >
                <option value="draft">Draft (Admin only)</option>
                <option value="published">Published (Visible on public site)</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          <label className="block space-y-1.5 text-xs">
            <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
              Tagline
            </span>
            <input
              type="text"
              disabled={!canEdit}
              value={form.tagline}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tagline: e.target.value }))
              }
              className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
            />
          </label>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="block space-y-1.5 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                Summary
              </span>
              <textarea
                rows={3}
                disabled={!canEdit}
                value={form.summary}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, summary: e.target.value }))
                }
                className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
              />
            </label>

            <label className="block space-y-1.5 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                Lasting Contributions
              </span>
              <textarea
                rows={3}
                disabled={!canEdit}
                value={form.contributions}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contributions: e.target.value }))
                }
                className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
              />
            </label>
          </div>

          <label className="inline-flex items-center gap-2.5 text-sm text-paper">
            <input
              type="checkbox"
              disabled={!canEdit}
              checked={form.is_current}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, is_current: e.target.checked }))
              }
              className="h-4 w-4 accent-gold"
            />
            <span>
              Mark as <strong>Current Active SRC Batch</strong> (automatically
              demotes any previous current batch)
            </span>
          </label>

          {canEdit && (
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-maroon px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-paper hover:bg-gold hover:text-navy-dark disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{saving ? 'Saving...' : 'Save Batch'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-md border border-line/25 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-paper/75 hover:text-paper"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      )}

      {/* Batches Table */}
      <div className="overflow-hidden rounded-xl border border-line/15 bg-navy">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-xs text-paper/65">
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
            <span>Loading batches from Supabase...</span>
          </div>
        ) : batches.length === 0 ? (
          <div className="p-10 text-center text-sm text-paper/65">
            No academic batches exist yet.{' '}
            {canEdit
              ? 'Click "New Batch" to create your first SRC panel.'
              : 'Ask a Super Admin or Content Manager to create one.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line/15 bg-navy-deep text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-light">
                <tr>
                  <th className="px-5 py-3.5">Batch</th>
                  <th className="px-5 py-3.5">Academic Year</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/10">
                {batches.map((b) => (
                  <tr key={b.id} className="hover:bg-navy-deep/50">
                    <td className="px-5 py-4">
                      <p className="font-display font-bold text-paper">
                        {b.name}
                      </p>
                      <p className="font-mono text-xs text-paper/50">
                        {b.slug}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-paper/80">
                      {b.academic_year} ({b.start_year}–{b.end_year})
                    </td>
                    <td className="px-5 py-4">
                      {b.is_current ? (
                        <span className="inline-flex items-center gap-1 rounded-sm bg-gold px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-navy-dark">
                          <Star className="h-3 w-3" /> Current Panel
                        </span>
                      ) : (
                        <span className="text-xs text-paper/55">
                          Vault Archive
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-sm border border-line/20 bg-navy-deep px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">
                        {b.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(b)}
                            className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                              b.status === 'published'
                                ? 'border border-line/25 text-paper/75 hover:border-gold hover:text-gold-light'
                                : 'bg-maroon text-paper hover:bg-gold hover:text-navy-dark'
                            }`}
                          >
                            {b.status === 'published' ? 'Unpublish' : 'Publish'}
                          </button>
                        )}
                        {canEdit && !b.is_current && (
                          <button
                            type="button"
                            onClick={() => handleSetCurrent(b)}
                            className="rounded-md border border-gold/40 px-2.5 py-1.5 text-[11px] font-semibold text-gold-light hover:bg-gold hover:text-navy-dark"
                          >
                            Set Current
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(b)}
                          className="rounded-md border border-line/20 p-2 text-paper/75 hover:border-gold hover:text-gold-light"
                          title={canEdit ? 'Edit batch' : 'Inspect batch'}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDelete(b)}
                            className="rounded-md border border-maroon/60 p-2 text-paper/75 hover:bg-maroon hover:text-paper"
                            title="Delete batch"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
