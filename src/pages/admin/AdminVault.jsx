import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Award,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Save,
  Users,
  Calendar,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  STORAGE_BUCKETS,
  uploadFileToBucket,
  deleteFileFromBucket,
} from '../../lib/storage';
import ImageUploadField from '../../components/admin/ImageUploadField';

/**
 * Dedicated Vault Management for historical batches (is_current = false).
 * Manages Vault team photography (vault-media), contributions, and public.achievements.
 */
export default function AdminVault() {
  const { canEdit } = useAdminAuth();

  const [historicalBatches, setHistoricalBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [batchMembers, setBatchMembers] = useState([]);
  const [batchEvents, setBatchEvents] = useState([]);
  const [achievements, setAchievements] = useState([]);

  const [archiveForm, setArchiveForm] = useState({
    tagline: '',
    summary: '',
    contributions: '',
    team_photo_url: '',
    status: 'draft',
  });

  const [newAchievement, setNewAchievement] = useState({
    title: '',
    description: '',
    category: 'milestone',
    achieved_on: '',
    member_id: '',
    status: 'published',
  });

  const [loading, setLoading] = useState(true);
  const [pendingTeamPhoto, setPendingTeamPhoto] = useState(null);
  const [savingBatch, setSavingBatch] = useState(false);
  const [savingAch, setSavingAch] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const loadHistoricalBatches = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('batches')
        .select('*')
        .eq('is_current', false)
        .order('start_year', { ascending: false });
      if (err) throw err;

      const list = data || [];
      setHistoricalBatches(list);
      if (list.length > 0 && !selectedBatchId) {
        setSelectedBatchId(list[0].id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load Vault batches.');
    } finally {
      setLoading(false);
    }
  }, [selectedBatchId]);

  useEffect(() => {
    loadHistoricalBatches();
  }, [loadHistoricalBatches]);

  const loadBatchDetails = useCallback(async (batchId) => {
    if (!supabase || !batchId) return;
    setError('');
    try {
      const [membersRes, eventsRes, achRes] = await Promise.all([
        supabase
          .from('members')
          .select('id, full_name, designation, status')
          .eq('batch_id', batchId)
          .order('display_order', { ascending: true }),
        supabase
          .from('events')
          .select('id, title, event_date, status')
          .eq('batch_id', batchId)
          .order('event_date', { ascending: false }),
        supabase
          .from('achievements')
          .select('*, member:members(full_name)')
          .eq('batch_id', batchId)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false }),
      ]);

      if (membersRes.error) throw membersRes.error;
      if (eventsRes.error) throw eventsRes.error;
      if (achRes.error) throw achRes.error;

      setBatchMembers(membersRes.data || []);
      setBatchEvents(eventsRes.data || []);
      setAchievements(achRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load batch archive details.');
    }
  }, []);

  const selectedBatch = historicalBatches.find((b) => b.id === selectedBatchId);

  useEffect(() => {
    if (!selectedBatch) return;
    setPendingTeamPhoto(null);
    setArchiveForm({
      tagline: selectedBatch.tagline || '',
      summary: selectedBatch.summary || '',
      contributions: selectedBatch.contributions || '',
      team_photo_url: selectedBatch.team_photo_url || '',
      status: selectedBatch.status || 'draft',
    });
    loadBatchDetails(selectedBatch.id);
  }, [selectedBatch, loadBatchDetails]);

  const handleSaveBatchArchive = async (e) => {
    e.preventDefault();
    if (!canEdit || !supabase || !selectedBatch) return;
    setError('');
    setFeedback('');
    setSavingBatch(true);
    let newlyUploadedPath = null;
    try {
      let resolvedPhotoPath = archiveForm.team_photo_url || null;

      if (pendingTeamPhoto) {
        const { path } = await uploadFileToBucket({
          bucket: STORAGE_BUCKETS.VAULT_MEDIA,
          file: pendingTeamPhoto,
          folder: selectedBatch.slug,
          slugPrefix: 'vault-team',
        });
        newlyUploadedPath = path;
        resolvedPhotoPath = path;
      }

      const { error: updErr } = await supabase
        .from('batches')
        .update({
          tagline: archiveForm.tagline.trim() || null,
          summary: archiveForm.summary.trim() || null,
          contributions: archiveForm.contributions.trim() || null,
          team_photo_url: resolvedPhotoPath,
          status: archiveForm.status,
        })
        .eq('id', selectedBatch.id);
      if (updErr) throw updErr;

      const previousPath = selectedBatch.team_photo_url;
      if (previousPath && previousPath !== resolvedPhotoPath) {
        const { count } = await supabase
          .from('batches')
          .select('id', { count: 'exact', head: true })
          .eq('team_photo_url', previousPath);
        if (count === 0) {
          await deleteFileFromBucket(
            STORAGE_BUCKETS.VAULT_MEDIA,
            previousPath
          ).catch(() => {});
        }
      }

      setPendingTeamPhoto(null);
      setFeedback(`Updated Vault archive for "${selectedBatch.name}".`);
      await loadHistoricalBatches();
    } catch (err) {
      if (newlyUploadedPath) {
        await deleteFileFromBucket(
          STORAGE_BUCKETS.VAULT_MEDIA,
          newlyUploadedPath
        ).catch(() => {});
      }
      setError(err.message || 'Failed to update Vault archive.');
    } finally {
      setSavingBatch(false);
    }
  };

  const handleAddAchievement = async (e) => {
    e.preventDefault();
    if (!canEdit || !supabase || !selectedBatch) return;
    if (!newAchievement.title.trim()) {
      setError('Achievement title is required.');
      return;
    }

    setError('');
    setFeedback('');
    setSavingAch(true);
    try {
      const { error: insErr } = await supabase.from('achievements').insert({
        batch_id: selectedBatch.id,
        member_id: newAchievement.member_id || null,
        title: newAchievement.title.trim(),
        description: newAchievement.description.trim() || null,
        category: newAchievement.category.trim() || 'milestone',
        achieved_on: newAchievement.achieved_on || null,
        status: newAchievement.status,
        display_order: achievements.length,
      });
      if (insErr) throw insErr;

      setNewAchievement({
        title: '',
        description: '',
        category: 'milestone',
        achieved_on: '',
        member_id: '',
        status: 'published',
      });
      setFeedback('Achievement added to Vault batch.');
      await loadBatchDetails(selectedBatch.id);
    } catch (err) {
      setError(err.message || 'Failed to add achievement.');
    } finally {
      setSavingAch(false);
    }
  };

  const handleDeleteAchievement = async (ach) => {
    if (!canEdit || !supabase) return;
    if (!window.confirm(`Delete achievement "${ach.title}"?`)) return;

    setError('');
    try {
      const { error: delErr } = await supabase
        .from('achievements')
        .delete()
        .eq('id', ach.id);
      if (delErr) throw delErr;
      setFeedback(`Deleted achievement "${ach.title}".`);
      await loadBatchDetails(selectedBatch.id);
    } catch (err) {
      setError(err.message || 'Failed to delete achievement.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 border-b border-line/15 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
            The Vault · Historical Batches &amp; Achievements
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-paper">
            Vault Management
          </h1>
          <p className="mt-1 text-sm text-paper/65">
            Curate past SRC panels (strictly separated from the active current
            batch), team photography, and historical achievements.
          </p>
        </div>

        <Link
          to="/admin/batches"
          className="src-btn-outline-gold inline-flex items-center gap-2 self-start rounded-md bg-navy px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] sm:self-auto"
        >
          <span>Create Historical Batch</span>
        </Link>
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

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-line/15 bg-navy p-10 text-xs text-paper/65">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          <span>Loading historical Vault batches...</span>
        </div>
      ) : historicalBatches.length === 0 ? (
        <div className="rounded-xl border border-line/15 bg-navy p-10 text-center text-sm text-paper/70">
          No historical batches (<code>is_current = false</code>) exist yet.
          Create one under{' '}
          <Link to="/admin/batches" className="text-gold-light underline">
            Academic Batches
          </Link>
          .
        </div>
      ) : (
        <>
          {/* Historical Batch Selector Pills */}
          <div className="flex flex-wrap gap-2">
            {historicalBatches.map((b) => {
              const active = b.id === selectedBatchId;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBatchId(b.id)}
                  className={`rounded-md px-4 py-2 font-display text-xs font-semibold uppercase tracking-[0.14em] ${
                    active
                      ? 'src-btn-maroon border border-gold'
                      : 'src-btn-navy border border-line/20 text-paper/75 hover:text-gold-light'
                  }`}
                >
                  {b.name} ({b.academic_year})
                </button>
              );
            })}
          </div>

          {selectedBatch && (
            <div className="space-y-6">
              {/* Vault Batch Metadata & Team Photo */}
              <form
                onSubmit={handleSaveBatchArchive}
                className="space-y-5 rounded-xl border border-line/15 bg-navy p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-xl font-bold text-paper">
                    {selectedBatch.name} Archive Profile
                  </h2>
                  <select
                    disabled={!canEdit}
                    value={archiveForm.status}
                    onChange={(e) =>
                      setArchiveForm((prev) => ({
                        ...prev,
                        status: e.target.value,
                      }))
                    }
                    className="rounded-md border border-line/20 bg-navy-deep px-3 py-1.5 text-xs text-paper"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <ImageUploadField
                  label="Historical Team Photograph"
                  bucket={STORAGE_BUCKETS.VAULT_MEDIA}
                  folder={selectedBatch.slug}
                  slugPrefix="vault-team"
                  valuePath={archiveForm.team_photo_url}
                  onChangePath={(path) =>
                    setArchiveForm((prev) => ({ ...prev, team_photo_url: path }))
                  }
                  pendingFile={pendingTeamPhoto}
                  onSelectPendingFile={setPendingTeamPhoto}
                  canEdit={canEdit}
                  helperText="Uploads once to vault-media when you click Save Archive Details (or choose an existing image)."
                />

                <label className="block space-y-1.5 text-xs">
                  <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                    Tagline
                  </span>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={archiveForm.tagline}
                    onChange={(e) =>
                      setArchiveForm((prev) => ({
                        ...prev,
                        tagline: e.target.value,
                      }))
                    }
                    className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
                  />
                </label>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <label className="block space-y-1.5 text-xs">
                    <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                      Archive Summary
                    </span>
                    <textarea
                      rows={3}
                      disabled={!canEdit}
                      value={archiveForm.summary}
                      onChange={(e) =>
                        setArchiveForm((prev) => ({
                          ...prev,
                          summary: e.target.value,
                        }))
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
                      value={archiveForm.contributions}
                      onChange={(e) =>
                        setArchiveForm((prev) => ({
                          ...prev,
                          contributions: e.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-line/20 bg-navy-deep px-3 py-2 text-sm text-paper"
                    />
                  </label>
                </div>

                {canEdit && (
                  <button
                    type="submit"
                    disabled={savingBatch}
                    className="src-btn-maroon inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] disabled:opacity-50"
                  >
                    {savingBatch ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    <span>{savingBatch ? 'Saving...' : 'Save Archive Details'}</span>
                  </button>
                )}
              </form>

              {/* Achievements CRUD (public.achievements) */}
              <section className="space-y-4 rounded-xl border border-line/15 bg-navy p-6">
                <div className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-gold" />
                  <h2 className="font-display text-xl font-bold text-paper">
                    Batch Achievements ({achievements.length})
                  </h2>
                </div>

                {canEdit && (
                  <form
                    onSubmit={handleAddAchievement}
                    className="grid grid-cols-1 gap-3 rounded-lg border border-line/15 bg-navy-deep p-4 sm:grid-cols-12"
                  >
                    <input
                      type="text"
                      required
                      placeholder="Achievement title *"
                      value={newAchievement.title}
                      onChange={(e) =>
                        setNewAchievement((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="rounded-md border border-line/20 bg-navy px-3 py-2 text-xs text-paper sm:col-span-5"
                    />
                    <input
                      type="date"
                      value={newAchievement.achieved_on}
                      onChange={(e) =>
                        setNewAchievement((prev) => ({
                          ...prev,
                          achieved_on: e.target.value,
                        }))
                      }
                      className="rounded-md border border-line/20 bg-navy px-3 py-2 text-xs text-paper sm:col-span-3"
                    />
                    <select
                      value={newAchievement.member_id}
                      onChange={(e) =>
                        setNewAchievement((prev) => ({
                          ...prev,
                          member_id: e.target.value,
                        }))
                      }
                      className="rounded-md border border-line/20 bg-navy px-2.5 py-2 text-xs text-paper sm:col-span-4"
                    >
                      <option value="">Whole Batch (no single member)</option>
                      {batchMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.full_name} ({m.designation})
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Optional description"
                      value={newAchievement.description}
                      onChange={(e) =>
                        setNewAchievement((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      className="rounded-md border border-line/20 bg-navy px-3 py-2 text-xs text-paper sm:col-span-7"
                    />
                    <select
                      value={newAchievement.status}
                      onChange={(e) =>
                        setNewAchievement((prev) => ({
                          ...prev,
                          status: e.target.value,
                        }))
                      }
                      className="rounded-md border border-line/20 bg-navy px-2.5 py-2 text-xs text-paper sm:col-span-2"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                      <option value="archived">Archived</option>
                    </select>
                    <button
                      type="submit"
                      disabled={savingAch}
                      className="src-btn-maroon inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] disabled:opacity-50 sm:col-span-3"
                    >
                      {savingAch ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      <span>Add</span>
                    </button>
                  </form>
                )}

                {achievements.length === 0 ? (
                  <p className="text-xs text-paper/60">
                    No achievements logged for {selectedBatch.name} yet.
                  </p>
                ) : (
                  <ul className="divide-y divide-line/10">
                    {achievements.map((ach) => (
                      <li
                        key={ach.id}
                        className="flex items-start justify-between gap-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-paper">{ach.title}</p>
                          {ach.description && (
                            <p className="mt-0.5 text-xs text-paper/65">
                              {ach.description}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-gold-light/85">
                            {ach.status.toUpperCase()}
                            {ach.achieved_on ? ` · ${ach.achieved_on}` : ''}
                            {ach.member?.full_name
                              ? ` · ${ach.member.full_name}`
                              : ''}
                          </p>
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => handleDeleteAchievement(ach)}
                            className="rounded-md p-1.5 text-paper/55 hover:bg-maroon/30 hover:text-paper"
                            aria-label="Delete achievement"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {/* Linked Historical Roster & Events Summary */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <section className="rounded-xl border border-line/15 bg-navy p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gold-light">
                      <Users className="h-4 w-4" />
                      <h3 className="font-display text-base font-bold text-paper">
                        Archived Roster ({batchMembers.length})
                      </h3>
                    </div>
                    <Link
                      to="/admin/members"
                      className="text-xs font-semibold text-gold-light hover:underline"
                    >
                      Manage in Members →
                    </Link>
                  </div>
                  {batchMembers.length === 0 ? (
                    <p className="text-xs text-paper/55">
                      No members assigned to this batch yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-paper/80">
                      {batchMembers.map((m) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between rounded bg-navy-deep px-3 py-2"
                        >
                          <span>
                            <strong>{m.full_name}</strong> — {m.designation}
                          </span>
                          <span className="text-[10px] uppercase text-gold-light">
                            {m.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section className="rounded-xl border border-line/15 bg-navy p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gold-light">
                      <Calendar className="h-4 w-4" />
                      <h3 className="font-display text-base font-bold text-paper">
                        Batch Events ({batchEvents.length})
                      </h3>
                    </div>
                    <Link
                      to="/admin/events"
                      className="text-xs font-semibold text-gold-light hover:underline"
                    >
                      Manage in Events →
                    </Link>
                  </div>
                  {batchEvents.length === 0 ? (
                    <p className="text-xs text-paper/55">
                      No events linked to this batch yet.
                    </p>
                  ) : (
                    <ul className="space-y-1.5 text-xs text-paper/80">
                      {batchEvents.map((ev) => (
                        <li
                          key={ev.id}
                          className="flex items-center justify-between rounded bg-navy-deep px-3 py-2"
                        >
                          <span>
                            <strong>{ev.title}</strong> ({ev.event_date})
                          </span>
                          <span className="text-[10px] uppercase text-gold-light">
                            {ev.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
