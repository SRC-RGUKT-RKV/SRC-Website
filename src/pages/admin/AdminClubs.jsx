import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  History,
  Globe,
  EyeOff,
  FolderKanban,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAdminAuth } from '../../context/AdminAuthContext';
import {
  STORAGE_BUCKETS,
  getPublicStorageUrl,
  deleteFileFromBucket,
} from '../../lib/storage';
import ClubForm from '../../components/admin/ClubForm';
import ClubYearWorkspace from '../../components/admin/ClubYearWorkspace';

export default function AdminClubs() {
  const { canEdit } = useAdminAuth();

  const [clubs, setClubs] = useState([]);
  const [batches, setBatches] = useState([]);
  const [selectedClubId, setSelectedClubId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [showClubForm, setShowClubForm] = useState(false);
  const [editingClub, setEditingClub] = useState(null);

  const loadData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const [clubsRes, batchesRes] = await Promise.all([
        supabase
          .from('clubs')
          .select(
            `
            *,
            club_academic_years(
              id,
              academic_year,
              start_year,
              end_year,
              is_current,
              is_active,
              status
            )
          `
          )
          .order('display_order', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('batches')
          .select('id, name, academic_year, is_current')
          .order('is_current', { ascending: false })
          .order('start_year', { ascending: false }),
      ]);

      if (clubsRes.error) throw clubsRes.error;
      if (batchesRes.error) throw batchesRes.error;

      const list = clubsRes.data || [];
      setClubs(list);
      setBatches(batchesRes.data || []);

      setSelectedClubId((prev) =>
        list.some((c) => c.id === prev) ? prev : list[0]?.id || ''
      );
    } catch (err) {
      setError(
        err.message ||
          'Failed to load clubs. Make sure migration 20261127000300_src_clubs.sql has been run in Supabase.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateClub = () => {
    setEditingClub(null);
    setError('');
    setFeedback('');
    setShowClubForm(true);
  };

  const openEditClub = (club) => {
    setEditingClub(club);
    setError('');
    setFeedback('');
    setShowClubForm(true);
  };

  const handleToggleClubPublish = async (club) => {
    if (!canEdit || !supabase) return;
    const nextStatus = club.status === 'published' ? 'draft' : 'published';
    setError('');
    setFeedback('');
    try {
      const { error: updErr } = await supabase
        .from('clubs')
        .update({ status: nextStatus })
        .eq('id', club.id);
      if (updErr) throw updErr;

      setFeedback(
        nextStatus === 'published'
          ? `Published "${club.name}" — it is now visible on /clubs.`
          : `Moved "${club.name}" to draft.`
      );
      await loadData();
    } catch (err) {
      setError(err.message || 'Could not update club publication status.');
    }
  };

  const handleDeleteClub = async (club) => {
    if (!canEdit || !supabase) return;
    const confirmed = window.confirm(
      `Delete "${club.name}"? This will also delete all academic-year teams, activities, and media records linked to this club.`
    );
    if (!confirmed) return;

    setError('');
    setFeedback('');
    try {
      const { error: delErr } = await supabase
        .from('clubs')
        .delete()
        .eq('id', club.id);
      if (delErr) throw delErr;

      if (club.logo_url) {
        await deleteFileFromBucket(
          STORAGE_BUCKETS.EVENT_MEDIA,
          club.logo_url
        ).catch(() => {});
      }
      if (club.cover_image_url) {
        await deleteFileFromBucket(
          STORAGE_BUCKETS.EVENT_MEDIA,
          club.cover_image_url
        ).catch(() => {});
      }

      setFeedback(`Deleted club "${club.name}".`);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to delete club.');
    }
  };

  const selectedClub = clubs.find((c) => c.id === selectedClubId) || null;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-line/15 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
            PostgreSQL · clubs + academic-year continuity
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-paper">
            Clubs Management
          </h1>
          <p className="mt-1 text-sm text-paper/65">
            Create and manage CSE SRC clubs, academic-year teams, student &amp;
            faculty coordinators, workshops, achievements, and historical
            archives.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openCreateClub}
            className="inline-flex items-center gap-2 self-start rounded-md bg-maroon px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-gold hover:text-navy-dark sm:self-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New Club</span>
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

      {/* Create / Edit Club Identity Form */}
      {showClubForm && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold text-paper">
            {editingClub ? `Edit Club: ${editingClub.name}` : 'Create New Club'}
          </h2>
          <ClubForm
            key={editingClub?.id || 'new-club'}
            initialClub={editingClub}
            canEdit={canEdit}
            onSaved={async (saved) => {
              setShowClubForm(false);
              setEditingClub(null);
              setFeedback(`Saved club "${saved.name}".`);
              await loadData();
              setSelectedClubId(saved.id);
            }}
            onCancel={() => {
              setShowClubForm(false);
              setEditingClub(null);
            }}
          />
        </div>
      )}

      {/* Clubs Directory Cards */}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-line/15 bg-navy p-10 text-xs text-paper/65">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          <span>Loading clubs from Supabase...</span>
        </div>
      ) : clubs.length === 0 ? (
        <div className="rounded-xl border border-line/15 bg-navy p-10 text-center text-sm text-paper/65">
          No clubs exist yet. Run the clubs migration or click{' '}
          <strong>New Club</strong> to add one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {clubs.map((club) => {
            const years = club.club_academic_years || [];
            const currentYear = years.find((y) => y.is_current);
            const isActiveNow = Boolean(currentYear?.is_active);
            const isSelected = club.id === selectedClub?.id;
            const logoUrl = club.logo_url
              ? getPublicStorageUrl(STORAGE_BUCKETS.EVENT_MEDIA, club.logo_url)
              : '';

            return (
              <div
                key={club.id}
                className={`flex flex-col justify-between rounded-xl border p-5 transition-colors ${
                  isSelected
                    ? 'border-gold bg-navy shadow-lg'
                    : 'border-line/15 bg-navy/75 hover:border-gold/50'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gold/30 bg-navy-deep">
                      {logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={club.name}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <span className="font-serif text-base font-bold text-gold-light">
                          {club.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="font-display text-lg font-bold text-paper">
                          {club.name}
                        </h3>
                        <span className="rounded-sm border border-line/20 bg-navy-deep px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">
                          {club.status}
                        </span>
                      </div>

                      <p className="mt-0.5 text-xs text-paper/65">
                        {club.target_audience || 'All CSE Students'} ·{' '}
                        {years.length}{' '}
                        {years.length === 1 ? 'academic year' : 'academic years'}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {isActiveNow ? (
                          <span className="inline-flex items-center gap-1 rounded-sm bg-maroon px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-paper">
                            <Sparkles className="h-3 w-3 text-gold-light" />
                            <span>Active · {currentYear.academic_year}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-sm border border-gold/35 bg-navy-deep px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">
                            <History className="h-3 w-3" />
                            <span>
                              {currentYear
                                ? `Inactive · ${currentYear.academic_year}`
                                : 'History Only'}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line/15 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedClubId(club.id)}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                      isSelected
                        ? 'bg-gold text-navy-dark'
                        : 'border border-gold/40 bg-navy-deep text-gold-light hover:bg-gold hover:text-navy-dark'
                    }`}
                  >
                    <FolderKanban className="h-3.5 w-3.5" />
                    <span>
                      {isSelected ? 'Managing Below' : 'Manage Teams & History'}
                    </span>
                  </button>

                  {canEdit && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleClubPublish(club)}
                        className="inline-flex items-center gap-1 rounded-md border border-line/20 px-2.5 py-1.5 text-[11px] font-semibold text-paper/80 hover:border-gold hover:text-gold-light"
                        title={
                          club.status === 'published'
                            ? 'Move to draft'
                            : 'Publish club'
                        }
                      >
                        {club.status === 'published' ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Globe className="h-3.5 w-3.5 text-gold" />
                        )}
                        <span>
                          {club.status === 'published' ? 'Unpublish' : 'Publish'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditClub(club)}
                        className="rounded-md border border-line/20 p-1.5 text-paper/75 hover:border-gold hover:text-gold-light"
                        title="Edit club profile"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteClub(club)}
                        className="rounded-md border border-maroon/60 p-1.5 text-paper/75 hover:bg-maroon hover:text-paper"
                        title="Delete club"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Academic-Year Continuity Workspace for Selected Club */}
      {selectedClub && (
        <ClubYearWorkspace
          key={selectedClub.id}
          club={selectedClub}
          batches={batches}
          canEdit={canEdit}
          onClubDataChanged={loadData}
        />
      )}
    </div>
  );
}
