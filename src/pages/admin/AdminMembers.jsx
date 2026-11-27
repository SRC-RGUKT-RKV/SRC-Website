import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Star,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  STORAGE_BUCKETS,
  getPublicStorageUrl,
  deleteFileFromBucket,
} from '../../lib/storage';
import MemberForm from '../../components/admin/MemberForm';

export default function AdminMembers() {
  const { canEdit } = useAdminAuth();

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [formBatchId, setFormBatchId] = useState('');

  const loadData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const [batchesRes, membersRes] = await Promise.all([
        supabase
          .from('batches')
          .select('id, name, slug, academic_year, is_current')
          .order('is_current', { ascending: false })
          .order('start_year', { ascending: false }),
        supabase
          .from('members')
          .select('*, batch:batches(id, name, slug, is_current)')
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false }),
      ]);

      if (batchesRes.error) throw batchesRes.error;
      if (membersRes.error) throw membersRes.error;

      const batchList = batchesRes.data || [];
      setBatches(batchList);
      setMembers(membersRes.data || []);

      if (!formBatchId && batchList.length > 0) {
        const current = batchList.find((b) => b.is_current) || batchList[0];
        setFormBatchId(current.id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load council members.');
    } finally {
      setLoading(false);
    }
  }, [formBatchId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredMembers = members.filter((m) => {
    if (selectedBatchId !== 'all' && m.batch_id !== selectedBatchId) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    return true;
  });

  const openCreate = () => {
    const defaultBatch =
      selectedBatchId !== 'all'
        ? selectedBatchId
        : (batches.find((b) => b.is_current) || batches[0])?.id || '';
    setFormBatchId(defaultBatch);
    setEditingMember(null);
    setError('');
    setFeedback('');
    setShowForm(true);
  };

  const openEdit = (member) => {
    setFormBatchId(member.batch_id);
    setEditingMember(member);
    setError('');
    setFeedback('');
    setShowForm(true);
  };

  const handleDelete = async (member) => {
    if (!canEdit || !supabase) return;
    if (!window.confirm(`Delete member "${member.full_name}"?`)) return;

    setError('');
    setFeedback('');
    try {
      const { error: delErr } = await supabase
        .from('members')
        .delete()
        .eq('id', member.id);
      if (delErr) throw delErr;

      if (member.photo_url) {
        await deleteFileFromBucket(
          STORAGE_BUCKETS.MEMBER_PHOTOS,
          member.photo_url
        ).catch(() => {});
      }

      setFeedback(`Deleted member "${member.full_name}".`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete member.');
    }
  };

  const activeFormBatch = batches.find((b) => b.id === formBatchId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-line/15 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
            PostgreSQL · public.members + public.social_links
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-paper">
            Member Management
          </h1>
          <p className="mt-1 text-sm text-paper/65">
            Manage council portraits, split designations, responsibilities, and
            member social links.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            disabled={batches.length === 0}
            onClick={openCreate}
            className="inline-flex items-center gap-2 self-start rounded-md bg-maroon px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-gold hover:text-navy-dark disabled:opacity-45 sm:self-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add Member</span>
          </button>
        )}
      </div>

      {batches.length === 0 && !loading && (
        <div className="rounded-lg border border-gold/30 bg-navy p-4 text-xs text-gold-light">
          Create an Academic Batch first before adding council members.
        </div>
      )}

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

      {/* Create / Edit Member Form */}
      {showForm && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/15 bg-navy-deep px-5 py-3.5">
            <h2 className="font-display text-lg font-bold text-paper">
              {editingMember
                ? `Editing: ${editingMember.full_name}`
                : 'New Council Member'}
            </h2>
            <label className="flex items-center gap-2 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                Assigned Batch:
              </span>
              <select
                disabled={!canEdit}
                value={formBatchId}
                onChange={(e) => setFormBatchId(e.target.value)}
                className="rounded-md border border-line/20 bg-navy px-3 py-1.5 text-xs text-paper"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} {b.is_current ? '(Current)' : '(Vault)'}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <MemberForm
            key={editingMember?.id || 'new'}
            batchId={formBatchId}
            batchSlug={activeFormBatch?.slug || 'current'}
            initialMember={editingMember}
            canEdit={canEdit}
            onSaved={async () => {
              setShowForm(false);
              setEditingMember(null);
              setFeedback('Member saved to PostgreSQL.');
              await loadData();
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingMember(null);
            }}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          aria-label="Filter by batch"
          value={selectedBatchId}
          onChange={(e) => setSelectedBatchId(e.target.value)}
          className="rounded-md border border-line/20 bg-navy px-3 py-2 text-xs text-paper"
        >
          <option value="all">All Batches ({members.length})</option>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.is_current ? '★ Current' : ''}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-line/20 bg-navy px-3 py-2 text-xs text-paper"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Members Table */}
      <div className="overflow-hidden rounded-xl border border-line/15 bg-navy">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-xs text-paper/65">
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
            <span>Loading members from Supabase...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-10 text-center text-sm text-paper/65">
            No members match the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line/15 bg-navy-deep text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-light">
                <tr>
                  <th className="px-5 py-3.5">Member</th>
                  <th className="px-5 py-3.5">Designation</th>
                  <th className="px-5 py-3.5">Batch</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/10">
                {filteredMembers.map((m) => {
                  const thumb = m.photo_url
                    ? getPublicStorageUrl(
                        STORAGE_BUCKETS.MEMBER_PHOTOS,
                        m.photo_url
                      )
                    : '';
                  return (
                    <tr key={m.id} className="hover:bg-navy-deep/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md border border-line/20 bg-navy-dark">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={m.full_name}
                                className="h-full w-full object-cover object-top"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gold-light">
                                {m.full_name.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="flex items-center gap-1.5 font-display font-bold text-paper">
                              <span>{m.full_name}</span>
                              {m.is_featured && (
                                <Star
                                  className="h-3.5 w-3.5 fill-gold text-gold"
                                  title="Featured"
                                />
                              )}
                            </p>
                            <p className="text-xs text-paper/55">
                              {m.department}
                              {m.academic_batch ? ` · ${m.academic_batch}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-paper/85">
                        {m.designation}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-paper/75">
                        {m.batch?.name || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-sm border border-line/20 bg-navy-deep px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(m)}
                            className="rounded-md border border-line/20 p-2 text-paper/75 hover:border-gold hover:text-gold-light"
                            title={canEdit ? 'Edit member' : 'Inspect member'}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleDelete(m)}
                              className="rounded-md border border-maroon/60 p-2 text-paper/75 hover:bg-maroon hover:text-paper"
                              title="Delete member"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
