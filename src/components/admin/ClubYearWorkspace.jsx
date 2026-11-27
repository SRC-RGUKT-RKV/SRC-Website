import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus,
  Save,
  Trash2,
  Pencil,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Users,
  Award,
  Image as ImageIcon,
  History,
  Sparkles,
  Upload,
  Power,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import {
  STORAGE_BUCKETS,
  uploadFileToBucket,
  deleteFileFromBucket,
  getPublicStorageUrl,
} from '../../lib/storage';
import ImageUploadField from './ImageUploadField';

const EMPTY_YEAR_FORM = {
  academic_year: '',
  start_year: new Date().getFullYear(),
  end_year: new Date().getFullYear() + 1,
  batch_id: '',
  is_current: false,
  is_active: false,
  summary: '',
  status: 'draft',
};

const EMPTY_MEMBER_FORM = {
  full_name: '',
  member_type: 'student_coordinator',
  role_title: 'Student Coordinator',
  department: 'CSE',
  academic_batch: '',
  email: '',
  bio: '',
  photo_url: '',
  display_order: 0,
  status: 'published',
};

const EMPTY_ACTIVITY_FORM = {
  activity_type: 'workshop',
  title: '',
  description: '',
  activity_date: '',
  venue: '',
  outcome: '',
  display_order: 0,
  status: 'published',
};

/**
 * Academic-year continuity workspace for a single SRC club.
 * Keeps every academic year's teams, coordinators, activities, and galleries
 * strictly separated so previous academic-year data is never overwritten.
 */
export default function ClubYearWorkspace({
  club,
  batches = [],
  canEdit = true,
  onClubDataChanged,
}) {
  const galleryInputRef = useRef(null);

  const [years, setYears] = useState([]);
  const [selectedYearId, setSelectedYearId] = useState('');
  const [activeTab, setActiveTab] = useState('team');

  const [members, setMembers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);

  const [loadingYears, setLoadingYears] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Create new academic year panel
  const [showNewYearForm, setShowNewYearForm] = useState(false);
  const [newYearForm, setNewYearForm] = useState(EMPTY_YEAR_FORM);
  const [savingNewYear, setSavingNewYear] = useState(false);

  // Selected academic year settings
  const [yearEditForm, setYearEditForm] = useState({
    batch_id: '',
    is_current: false,
    is_active: false,
    summary: '',
    team_photo_url: '',
    status: 'draft',
  });
  const [pendingTeamPhoto, setPendingTeamPhoto] = useState(null);
  const [savingYearSettings, setSavingYearSettings] = useState(false);

  // Member add/edit state
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [memberForm, setMemberForm] = useState(EMPTY_MEMBER_FORM);
  const [pendingMemberPhoto, setPendingMemberPhoto] = useState(null);
  const [savingMember, setSavingMember] = useState(false);

  // Activity add/edit state
  const [editingActivityId, setEditingActivityId] = useState(null);
  const [activityForm, setActivityForm] = useState(EMPTY_ACTIVITY_FORM);
  const [savingActivity, setSavingActivity] = useState(false);

  // Gallery upload state
  const [uploadingGallery, setUploadingGallery] = useState(false);

  const loadYears = useCallback(async () => {
    if (!supabase || !club?.id) return;
    setLoadingYears(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('club_academic_years')
        .select('*')
        .eq('club_id', club.id)
        .order('is_current', { ascending: false })
        .order('start_year', { ascending: false });
      if (err) throw err;

      const list = data || [];
      setYears(list);
      setSelectedYearId((prev) =>
        list.some((y) => y.id === prev) ? prev : list[0]?.id || ''
      );
    } catch (err) {
      setError(err.message || 'Failed to load club academic years.');
    } finally {
      setLoadingYears(false);
    }
  }, [club?.id]);

  useEffect(() => {
    setSelectedYearId('');
    setShowNewYearForm(false);
    setFeedback('');
    setError('');
    loadYears();
  }, [loadYears]);

  const selectedYear = years.find((y) => y.id === selectedYearId) || null;

  const loadYearRecords = useCallback(async (yearId) => {
    if (!supabase || !yearId) {
      setMembers([]);
      setActivities([]);
      setMediaItems([]);
      return;
    }
    setLoadingRecords(true);
    setError('');
    try {
      const [memRes, actRes, medRes] = await Promise.all([
        supabase
          .from('club_members')
          .select('*')
          .eq('club_academic_year_id', yearId)
          .order('member_type', { ascending: true })
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('club_activities')
          .select('*')
          .eq('club_academic_year_id', yearId)
          .order('activity_date', { ascending: false })
          .order('display_order', { ascending: true }),
        supabase
          .from('club_media')
          .select('*')
          .eq('club_academic_year_id', yearId)
          .order('display_order', { ascending: true })
          .order('created_at', { ascending: false }),
      ]);

      if (memRes.error) throw memRes.error;
      if (actRes.error) throw actRes.error;
      if (medRes.error) throw medRes.error;

      setMembers(memRes.data || []);
      setActivities(actRes.data || []);
      setMediaItems(medRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load academic-year records.');
    } finally {
      setLoadingRecords(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedYear) {
      setMembers([]);
      setActivities([]);
      setMediaItems([]);
      return;
    }
    setYearEditForm({
      batch_id: selectedYear.batch_id || '',
      is_current: Boolean(selectedYear.is_current),
      is_active: Boolean(selectedYear.is_active),
      summary: selectedYear.summary || '',
      team_photo_url: selectedYear.team_photo_url || '',
      status: selectedYear.status || 'draft',
    });
    setPendingTeamPhoto(null);
    setEditingMemberId(null);
    setMemberForm(EMPTY_MEMBER_FORM);
    setPendingMemberPhoto(null);
    setEditingActivityId(null);
    setActivityForm(EMPTY_ACTIVITY_FORM);
    loadYearRecords(selectedYear.id);
  }, [selectedYear, loadYearRecords]);

  // ---------- Create New Academic Year (never overwrites previous years) ----------
  const handleCreateAcademicYear = async (e) => {
    e.preventDefault();
    if (!canEdit || !supabase) return;

    const cleanLabel = newYearForm.academic_year.trim();
    const startYear = Number(newYearForm.start_year);
    const endYear = Number(newYearForm.end_year);

    if (!cleanLabel) {
      setError('Academic year label is required (e.g. 2026–2027).');
      return;
    }
    if (
      Number.isNaN(startYear) ||
      Number.isNaN(endYear) ||
      startYear < 2000 ||
      endYear < startYear ||
      endYear > 2105
    ) {
      setError('End year must be greater than or equal to start year.');
      return;
    }

    setError('');
    setFeedback('');
    setSavingNewYear(true);
    try {
      if (newYearForm.is_current) {
        const { error: clrErr } = await supabase
          .from('club_academic_years')
          .update({ is_current: false })
          .eq('club_id', club.id)
          .eq('is_current', true);
        if (clrErr) throw clrErr;
      }

      const { data: created, error: insErr } = await supabase
        .from('club_academic_years')
        .insert({
          club_id: club.id,
          batch_id: newYearForm.batch_id || null,
          academic_year: cleanLabel,
          start_year: startYear,
          end_year: endYear,
          is_current: Boolean(newYearForm.is_current),
          is_active: Boolean(newYearForm.is_active),
          summary: newYearForm.summary.trim() || null,
          status: newYearForm.status,
        })
        .select()
        .single();

      if (insErr) throw insErr;

      setNewYearForm(EMPTY_YEAR_FORM);
      setShowNewYearForm(false);
      setFeedback(
        `Added academic year "${cleanLabel}" to ${club.name}. Previous years remain untouched.`
      );
      await loadYears();
      setSelectedYearId(created.id);
      onClubDataChanged?.();
    } catch (err) {
      setError(err.message || 'Failed to add academic year.');
    } finally {
      setSavingNewYear(false);
    }
  };

  // ---------- Save Selected Academic Year Settings ----------
  const handleSaveYearSettings = async (e) => {
    e.preventDefault();
    if (!canEdit || !supabase || !selectedYear) return;

    setError('');
    setFeedback('');
    setSavingYearSettings(true);
    let uploadedTeamPhoto = null;
    try {
      let resolvedTeamPhoto = yearEditForm.team_photo_url || null;

      if (pendingTeamPhoto) {
        const { path } = await uploadFileToBucket({
          bucket: STORAGE_BUCKETS.EVENT_MEDIA,
          file: pendingTeamPhoto,
          folder: `clubs/${club.slug}/${selectedYear.start_year}-${selectedYear.end_year}`,
          slugPrefix: 'team-photo',
        });
        uploadedTeamPhoto = path;
        resolvedTeamPhoto = path;
      }

      if (yearEditForm.is_current && !selectedYear.is_current) {
        const { error: clrErr } = await supabase
          .from('club_academic_years')
          .update({ is_current: false })
          .eq('club_id', club.id)
          .eq('is_current', true)
          .neq('id', selectedYear.id);
        if (clrErr) throw clrErr;
      }

      const { error: updErr } = await supabase
        .from('club_academic_years')
        .update({
          batch_id: yearEditForm.batch_id || null,
          is_current: Boolean(yearEditForm.is_current),
          is_active: Boolean(yearEditForm.is_active),
          summary: yearEditForm.summary.trim() || null,
          team_photo_url: resolvedTeamPhoto,
          status: yearEditForm.status,
        })
        .eq('id', selectedYear.id);
      if (updErr) throw updErr;

      if (
        selectedYear.team_photo_url &&
        selectedYear.team_photo_url !== resolvedTeamPhoto
      ) {
        const { count } = await supabase
          .from('club_academic_years')
          .select('id', { count: 'exact', head: true })
          .eq('team_photo_url', selectedYear.team_photo_url);
        if (count === 0) {
          await deleteFileFromBucket(
            STORAGE_BUCKETS.EVENT_MEDIA,
            selectedYear.team_photo_url
          ).catch(() => {});
        }
      }

      setPendingTeamPhoto(null);
      setFeedback(
        `Saved ${club.name} (${selectedYear.academic_year}) settings.`
      );
      await loadYears();
      onClubDataChanged?.();
    } catch (err) {
      if (uploadedTeamPhoto) {
        await deleteFileFromBucket(
          STORAGE_BUCKETS.EVENT_MEDIA,
          uploadedTeamPhoto
        ).catch(() => {});
      }
      setError(err.message || 'Failed to save academic-year settings.');
    } finally {
      setSavingYearSettings(false);
    }
  };

  // ---------- Quick Active / Inactive Toggle for Selected Year ----------
  const handleQuickToggleActive = async () => {
    if (!canEdit || !supabase || !selectedYear) return;
    const nextActive = !selectedYear.is_active;
    setError('');
    setFeedback('');
    try {
      const { error: updErr } = await supabase
        .from('club_academic_years')
        .update({ is_active: nextActive })
        .eq('id', selectedYear.id);
      if (updErr) throw updErr;

      setFeedback(
        nextActive
          ? `Activated ${club.name} for ${selectedYear.academic_year}.`
          : `Deactivated ${club.name} for ${selectedYear.academic_year} (history preserved).`
      );
      await loadYears();
      onClubDataChanged?.();
    } catch (err) {
      setError(err.message || 'Could not update club active state.');
    }
  };

  // ---------- Add / Edit / Delete Club Members & Coordinators ----------
  const handleSaveMember = async (e) => {
    e.preventDefault();
    if (!canEdit || !supabase || !selectedYear) return;

    const cleanName = memberForm.full_name.trim();
    const cleanRole = memberForm.role_title.trim();
    if (!cleanName || !cleanRole) {
      setError('Full name and role title are required.');
      return;
    }

    setError('');
    setFeedback('');
    setSavingMember(true);
    let uploadedPortrait = null;
    try {
      let resolvedPhoto = memberForm.photo_url || null;

      if (pendingMemberPhoto) {
        const { path } = await uploadFileToBucket({
          bucket: STORAGE_BUCKETS.MEMBER_PHOTOS,
          file: pendingMemberPhoto,
          folder: `clubs/${club.slug}`,
          slugPrefix: cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        });
        uploadedPortrait = path;
        resolvedPhoto = path;
      }

      const payload = {
        club_id: club.id,
        club_academic_year_id: selectedYear.id,
        full_name: cleanName,
        member_type: memberForm.member_type,
        role_title: cleanRole,
        department: memberForm.department.trim() || 'CSE',
        academic_batch: memberForm.academic_batch.trim() || null,
        email: memberForm.email.trim() || null,
        bio: memberForm.bio.trim() || null,
        photo_url: resolvedPhoto,
        display_order: Number(memberForm.display_order) || 0,
        status: memberForm.status,
      };

      const { error: dbErr } = editingMemberId
        ? await supabase
            .from('club_members')
            .update(payload)
            .eq('id', editingMemberId)
        : await supabase.from('club_members').insert(payload);

      if (dbErr) throw dbErr;

      setEditingMemberId(null);
      setMemberForm(EMPTY_MEMBER_FORM);
      setPendingMemberPhoto(null);
      setFeedback(
        editingMemberId
          ? `Updated "${cleanName}".`
          : `Added "${cleanName}" to ${selectedYear.academic_year}.`
      );
      await loadYearRecords(selectedYear.id);
    } catch (err) {
      if (uploadedPortrait) {
        await deleteFileFromBucket(
          STORAGE_BUCKETS.MEMBER_PHOTOS,
          uploadedPortrait
        ).catch(() => {});
      }
      setError(err.message || 'Failed to save club member.');
    } finally {
      setSavingMember(false);
    }
  };

  const handleEditMember = (m) => {
    setEditingMemberId(m.id);
    setPendingMemberPhoto(null);
    setMemberForm({
      full_name: m.full_name || '',
      member_type: m.member_type || 'student_coordinator',
      role_title: m.role_title || '',
      department: m.department || 'CSE',
      academic_batch: m.academic_batch || '',
      email: m.email || '',
      bio: m.bio || '',
      photo_url: m.photo_url || '',
      display_order: m.display_order ?? 0,
      status: m.status || 'published',
    });
  };

  const handleDeleteMember = async (m) => {
    if (!canEdit || !supabase) return;
    if (
      !window.confirm(
        `Remove "${m.full_name}" from ${club.name} (${selectedYear?.academic_year})?`
      )
    ) {
      return;
    }
    setError('');
    try {
      const { error: delErr } = await supabase
        .from('club_members')
        .delete()
        .eq('id', m.id);
      if (delErr) throw delErr;

      if (m.photo_url) {
        const { count } = await supabase
          .from('club_members')
          .select('id', { count: 'exact', head: true })
          .eq('photo_url', m.photo_url);
        if (count === 0) {
          await deleteFileFromBucket(
            STORAGE_BUCKETS.MEMBER_PHOTOS,
            m.photo_url
          ).catch(() => {});
        }
      }

      if (editingMemberId === m.id) {
        setEditingMemberId(null);
        setMemberForm(EMPTY_MEMBER_FORM);
      }
      setFeedback(`Removed "${m.full_name}".`);
      await loadYearRecords(selectedYear.id);
    } catch (err) {
      setError(err.message || 'Failed to delete member.');
    }
  };

  // ---------- Add / Edit / Delete Club Activities & Achievements ----------
  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!canEdit || !supabase || !selectedYear) return;

    const cleanTitle = activityForm.title.trim();
    if (!cleanTitle) {
      setError('Activity title is required.');
      return;
    }

    setError('');
    setFeedback('');
    setSavingActivity(true);
    try {
      const payload = {
        club_id: club.id,
        club_academic_year_id: selectedYear.id,
        activity_type: activityForm.activity_type,
        title: cleanTitle,
        description: activityForm.description.trim() || null,
        activity_date: activityForm.activity_date || null,
        venue: activityForm.venue.trim() || null,
        outcome: activityForm.outcome.trim() || null,
        display_order: Number(activityForm.display_order) || 0,
        status: activityForm.status,
      };

      const { error: dbErr } = editingActivityId
        ? await supabase
            .from('club_activities')
            .update(payload)
            .eq('id', editingActivityId)
        : await supabase.from('club_activities').insert(payload);

      if (dbErr) throw dbErr;

      setEditingActivityId(null);
      setActivityForm(EMPTY_ACTIVITY_FORM);
      setFeedback(
        editingActivityId
          ? `Updated "${cleanTitle}".`
          : `Added "${cleanTitle}" to ${selectedYear.academic_year}.`
      );
      await loadYearRecords(selectedYear.id);
    } catch (err) {
      setError(err.message || 'Failed to save activity.');
    } finally {
      setSavingActivity(false);
    }
  };

  const handleEditActivity = (act) => {
    setEditingActivityId(act.id);
    setActivityForm({
      activity_type: act.activity_type || 'workshop',
      title: act.title || '',
      description: act.description || '',
      activity_date: act.activity_date || '',
      venue: act.venue || '',
      outcome: act.outcome || '',
      display_order: act.display_order ?? 0,
      status: act.status || 'published',
    });
  };

  const handleDeleteActivity = async (act) => {
    if (!canEdit || !supabase) return;
    if (!window.confirm(`Delete "${act.title}"?`)) return;
    setError('');
    try {
      const { error: delErr } = await supabase
        .from('club_activities')
        .delete()
        .eq('id', act.id);
      if (delErr) throw delErr;
      if (editingActivityId === act.id) {
        setEditingActivityId(null);
        setActivityForm(EMPTY_ACTIVITY_FORM);
      }
      setFeedback(`Deleted "${act.title}".`);
      await loadYearRecords(selectedYear.id);
    } catch (err) {
      setError(err.message || 'Failed to delete activity.');
    }
  };

  // ---------- Upload / Update / Delete Club Gallery Media ----------
  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !canEdit || !supabase || !selectedYear) return;

    setError('');
    setFeedback('');
    setUploadingGallery(true);
    try {
      const rows = [];
      for (const file of files) {
        const { path } = await uploadFileToBucket({
          bucket: STORAGE_BUCKETS.EVENT_MEDIA,
          file,
          folder: `clubs/${club.slug}/${selectedYear.start_year}-${selectedYear.end_year}`,
          slugPrefix: 'gallery',
        });
        rows.push({
          club_id: club.id,
          club_academic_year_id: selectedYear.id,
          media_type: file.type.startsWith('video/') ? 'video' : 'image',
          url: path,
          title: file.name,
          caption: '',
          display_order: mediaItems.length + rows.length,
          status: 'published',
        });
      }

      const { error: insErr } = await supabase.from('club_media').insert(rows);
      if (insErr) throw insErr;

      setFeedback(`Uploaded ${rows.length} photo(s) to ${selectedYear.academic_year}.`);
      await loadYearRecords(selectedYear.id);
    } catch (err) {
      setError(err.message || 'Gallery upload failed.');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const handleUpdateMediaCaption = async (item, nextCaption) => {
    if (!canEdit || !supabase) return;
    setMediaItems((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, caption: nextCaption } : m))
    );
    await supabase
      .from('club_media')
      .update({ caption: nextCaption.trim() || null })
      .eq('id', item.id);
  };

  const handleToggleMediaStatus = async (item) => {
    if (!canEdit || !supabase) return;
    const nextStatus = item.status === 'published' ? 'draft' : 'published';
    const { error: updErr } = await supabase
      .from('club_media')
      .update({ status: nextStatus })
      .eq('id', item.id);
    if (!updErr) {
      await loadYearRecords(selectedYear.id);
    }
  };

  const handleDeleteMedia = async (item) => {
    if (!canEdit || !supabase) return;
    if (!window.confirm('Delete this club photograph permanently?')) return;
    setError('');
    try {
      const { error: delErr } = await supabase
        .from('club_media')
        .delete()
        .eq('id', item.id);
      if (delErr) throw delErr;

      if (item.url) {
        await deleteFileFromBucket(
          STORAGE_BUCKETS.EVENT_MEDIA,
          item.url
        ).catch(() => {});
      }
      setFeedback('Deleted club media item.');
      await loadYearRecords(selectedYear.id);
    } catch (err) {
      setError(err.message || 'Failed to delete media item.');
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-gold/30 bg-navy p-5 sm:p-7">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-line/15 pb-5 sm:flex-row sm:items-end">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light">
            <History className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
            <span>Academic-Year Continuity Workspace</span>
          </p>
          <h2 className="mt-1 font-display text-2xl font-bold text-paper">
            {club.name} — Teams, Activities &amp; History
          </h2>
          <p className="mt-1 text-xs text-paper/65">
            Each academic year stores its own coordinators, team members,
            workshops, achievements, and gallery without overwriting earlier
            years.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={() => setShowNewYearForm((prev) => !prev)}
            className="src-btn-maroon inline-flex items-center gap-2 self-start rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] sm:self-auto"
          >
            {showNewYearForm ? (
              <X className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span>
              {showNewYearForm ? 'Cancel New Year' : 'Add Academic Year'}
            </span>
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
          className="flex items-start gap-2.5 rounded-lg border border-gold/40 bg-navy-deep p-3.5 text-xs text-gold-light"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Add New Academic Year Form */}
      {showNewYearForm && canEdit && (
        <form
          onSubmit={handleCreateAcademicYear}
          className="space-y-4 rounded-xl border border-gold/40 bg-navy-deep p-5"
        >
          <h3 className="font-display text-base font-bold text-paper">
            Add Academic Year Record for {club.name}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                Academic Year *
              </span>
              <input
                type="text"
                required
                placeholder="e.g. 2026–2027"
                value={newYearForm.academic_year}
                onChange={(e) =>
                  setNewYearForm((p) => ({ ...p, academic_year: e.target.value }))
                }
                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                Start Year *
              </span>
              <input
                type="number"
                required
                value={newYearForm.start_year}
                onChange={(e) =>
                  setNewYearForm((p) => ({ ...p, start_year: e.target.value }))
                }
                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                End Year *
              </span>
              <input
                type="number"
                required
                value={newYearForm.end_year}
                onChange={(e) =>
                  setNewYearForm((p) => ({ ...p, end_year: e.target.value }))
                }
                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
              />
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                Publication Status
              </span>
              <select
                value={newYearForm.status}
                onChange={(e) =>
                  setNewYearForm((p) => ({ ...p, status: e.target.value }))
                }
                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                Linked SRC Batch (Optional)
              </span>
              <select
                value={newYearForm.batch_id}
                onChange={(e) =>
                  setNewYearForm((p) => ({ ...p, batch_id: e.target.value }))
                }
                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
              >
                <option value="">None</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.academic_year})
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs">
              <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                Year Summary (Optional)
              </span>
              <input
                type="text"
                placeholder="Brief summary of this academic year's team or focus..."
                value={newYearForm.summary}
                onChange={(e) =>
                  setNewYearForm((p) => ({ ...p, summary: e.target.value }))
                }
                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-paper/85">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={newYearForm.is_current}
                onChange={(e) =>
                  setNewYearForm((p) => ({ ...p, is_current: e.target.checked }))
                }
                className="h-4 w-4 accent-gold"
              />
              <span>Mark as Current Academic Year (archives previous current year)</span>
            </label>

            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={newYearForm.is_active}
                onChange={(e) =>
                  setNewYearForm((p) => ({ ...p, is_active: e.target.checked }))
                }
                className="h-4 w-4 accent-gold"
              />
              <span>Activate club for this academic year</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={savingNewYear}
            className="src-btn-maroon inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] disabled:opacity-50"
          >
            {savingNewYear ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span>Create Academic Year</span>
          </button>
        </form>
      )}

      {/* Academic Year Selector Pills */}
      {loadingYears ? (
        <div className="flex items-center gap-2 py-6 text-xs text-paper/65">
          <Loader2 className="h-4 w-4 animate-spin text-gold" />
          <span>Loading academic years...</span>
        </div>
      ) : years.length === 0 ? (
        <div className="rounded-xl border border-line/15 bg-navy-deep p-6 text-sm text-paper/65">
          No academic years recorded for <strong>{club.name}</strong> yet. Add
          an academic year above to start adding coordinators, members,
          activities, and photographs.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {years.map((yr) => {
              const selected = yr.id === selectedYear?.id;
              return (
                <button
                  key={yr.id}
                  type="button"
                  onClick={() => setSelectedYearId(yr.id)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-xs font-semibold ${
                    selected
                      ? 'src-btn-maroon border-gold'
                      : 'src-btn-navy border-line/20 bg-navy-deep text-paper/80 hover:text-gold-light'
                  }`}
                >
                  {yr.is_current ? (
                    <Sparkles className="h-3.5 w-3.5 text-gold-light" />
                  ) : (
                    <History className="h-3.5 w-3.5 text-paper/55" />
                  )}
                  <span>{yr.academic_year}</span>
                  <span className="rounded-sm bg-navy-dark/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wider">
                    {yr.is_current
                      ? yr.is_active
                        ? 'Current · Active'
                        : 'Current · Inactive'
                      : 'History'}
                  </span>
                </button>
              );
            })}
          </div>

          {selectedYear && (
            <div className="space-y-6">
              {/* Academic Year Settings Card */}
              <form
                onSubmit={handleSaveYearSettings}
                className="space-y-4 rounded-xl border border-line/15 bg-navy-deep p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-bold text-paper">
                      {selectedYear.academic_year} Settings &amp; Status
                    </h3>
                    <p className="text-xs text-paper/55">
                      Control whether {club.name} is active, current, and
                      published for {selectedYear.academic_year}.
                    </p>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleQuickToggleActive}
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                        selectedYear.is_active
                          ? 'border-gold/50 bg-gold/15 text-gold-light hover:bg-maroon hover:text-paper'
                          : 'border-line/25 bg-navy text-paper/75 hover:border-gold hover:text-gold-light'
                      }`}
                    >
                      <Power className="h-3.5 w-3.5" />
                      <span>
                        {selectedYear.is_active
                          ? 'Deactivate Year'
                          : 'Activate Year'}
                      </span>
                    </button>
                  )}
                </div>

                <ImageUploadField
                  label={`Team Photograph (${selectedYear.academic_year})`}
                  bucket={STORAGE_BUCKETS.EVENT_MEDIA}
                  folder={`clubs/${club.slug}/${selectedYear.start_year}-${selectedYear.end_year}`}
                  slugPrefix="team-photo"
                  valuePath={yearEditForm.team_photo_url}
                  onChangePath={(path) =>
                    setYearEditForm((p) => ({ ...p, team_photo_url: path }))
                  }
                  pendingFile={pendingTeamPhoto}
                  onSelectPendingFile={setPendingTeamPhoto}
                  canEdit={canEdit}
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  helperText="Group photo for this specific academic year (uploads once on Save)."
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <label className="space-y-1 text-xs md:col-span-2">
                    <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                      Year Summary
                    </span>
                    <textarea
                      rows={2}
                      disabled={!canEdit}
                      value={yearEditForm.summary}
                      onChange={(e) =>
                        setYearEditForm((p) => ({ ...p, summary: e.target.value }))
                      }
                      className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                    />
                  </label>

                  <div className="space-y-3">
                    <label className="block space-y-1 text-xs">
                      <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                        Publication Status
                      </span>
                      <select
                        disabled={!canEdit}
                        value={yearEditForm.status}
                        onChange={(e) =>
                          setYearEditForm((p) => ({ ...p, status: e.target.value }))
                        }
                        className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </label>

                    <label className="block space-y-1 text-xs">
                      <span className="font-semibold uppercase tracking-[0.14em] text-gold-light">
                        Linked SRC Batch
                      </span>
                      <select
                        disabled={!canEdit}
                        value={yearEditForm.batch_id}
                        onChange={(e) =>
                          setYearEditForm((p) => ({
                            ...p,
                            batch_id: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                      >
                        <option value="">None</option>
                        {batches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} ({b.academic_year})
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line/15 pt-4">
                  <div className="flex flex-wrap items-center gap-5 text-xs text-paper/85">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={yearEditForm.is_current}
                        onChange={(e) =>
                          setYearEditForm((p) => ({
                            ...p,
                            is_current: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-gold"
                      />
                      <span>Current Academic Year</span>
                    </label>

                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        disabled={!canEdit}
                        checked={yearEditForm.is_active}
                        onChange={(e) =>
                          setYearEditForm((p) => ({
                            ...p,
                            is_active: e.target.checked,
                          }))
                        }
                        className="h-4 w-4 accent-gold"
                      />
                      <span>Club Active in {selectedYear.academic_year}</span>
                    </label>
                  </div>

                  {canEdit && (
                    <button
                      type="submit"
                      disabled={savingYearSettings}
                      className="src-btn-maroon inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] disabled:opacity-50"
                    >
                      {savingYearSettings ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      <span>Save Year Settings</span>
                    </button>
                  )}
                </div>
              </form>

              {/* Sub-Tabs for Selected Academic Year */}
              <div className="flex flex-wrap gap-2 border-b border-line/15 pb-3">
                {[
                  {
                    id: 'team',
                    label: `Coordinators & Team (${members.length})`,
                    icon: Users,
                  },
                  {
                    id: 'activities',
                    label: `Activities & Achievements (${activities.length})`,
                    icon: Award,
                  },
                  {
                    id: 'gallery',
                    label: `Gallery (${mediaItems.length})`,
                    icon: ImageIcon,
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${
                        active
                          ? 'src-btn-gold'
                          : 'src-btn-navy border border-line/20 bg-navy-deep text-paper/75 hover:text-gold-light'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {loadingRecords ? (
                <div className="flex items-center gap-2 py-8 text-xs text-paper/65">
                  <Loader2 className="h-4 w-4 animate-spin text-gold" />
                  <span>Loading {selectedYear.academic_year} records...</span>
                </div>
              ) : (
                <>
                  {/* ============ TAB 1: COORDINATORS & TEAM ============ */}
                  {activeTab === 'team' && (
                    <div className="space-y-5">
                      {canEdit && (
                        <form
                          onSubmit={handleSaveMember}
                          className="space-y-4 rounded-xl border border-line/15 bg-navy-deep p-5"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-gold-light">
                              {editingMemberId
                                ? 'Edit Coordinator / Member'
                                : `Add Coordinator or Member (${selectedYear.academic_year})`}
                            </h4>
                            {editingMemberId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMemberId(null);
                                  setMemberForm(EMPTY_MEMBER_FORM);
                                  setPendingMemberPhoto(null);
                                }}
                                className="text-xs text-paper/65 hover:text-paper"
                              >
                                Cancel Edit
                              </button>
                            )}
                          </div>

                          <ImageUploadField
                            label="Portrait (Optional)"
                            bucket={STORAGE_BUCKETS.MEMBER_PHOTOS}
                            folder={`clubs/${club.slug}`}
                            slugPrefix={memberForm.full_name || 'coordinator'}
                            valuePath={memberForm.photo_url}
                            onChangePath={(path) =>
                              setMemberForm((p) => ({ ...p, photo_url: path }))
                            }
                            pendingFile={pendingMemberPhoto}
                            onSelectPendingFile={setPendingMemberPhoto}
                            canEdit={canEdit}
                            helperText="Stored in member-photos; uploads once on Save."
                          />

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <label className="space-y-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                                Category *
                              </span>
                              <select
                                value={memberForm.member_type}
                                onChange={(e) => {
                                  const nextType = e.target.value;
                                  const defaultRole =
                                    nextType === 'faculty_coordinator'
                                      ? 'Faculty Coordinator'
                                      : nextType === 'student_coordinator'
                                        ? 'Student Coordinator'
                                        : 'Core Member';
                                  setMemberForm((p) => ({
                                    ...p,
                                    member_type: nextType,
                                    role_title: defaultRole,
                                  }));
                                }}
                                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                              >
                                <option value="faculty_coordinator">
                                  Faculty Coordinator
                                </option>
                                <option value="student_coordinator">
                                  Student Coordinator
                                </option>
                                <option value="member">Club Member</option>
                              </select>
                            </label>

                            <label className="space-y-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                                Full Name *
                              </span>
                              <input
                                type="text"
                                required
                                value={memberForm.full_name}
                                onChange={(e) =>
                                  setMemberForm((p) => ({
                                    ...p,
                                    full_name: e.target.value,
                                  }))
                                }
                                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                              />
                            </label>

                            <label className="space-y-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                                Role Title *
                              </span>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Lead Student Coordinator"
                                value={memberForm.role_title}
                                onChange={(e) =>
                                  setMemberForm((p) => ({
                                    ...p,
                                    role_title: e.target.value,
                                  }))
                                }
                                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                              />
                            </label>

                            <label className="space-y-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                                Batch / Designation
                              </span>
                              <input
                                type="text"
                                placeholder="e.g. E2, E3, Faculty"
                                value={memberForm.academic_batch}
                                onChange={(e) =>
                                  setMemberForm((p) => ({
                                    ...p,
                                    academic_batch: e.target.value,
                                  }))
                                }
                                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                              />
                            </label>

                            <label className="space-y-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                                Email (Optional)
                              </span>
                              <input
                                type="email"
                                value={memberForm.email}
                                onChange={(e) =>
                                  setMemberForm((p) => ({
                                    ...p,
                                    email: e.target.value,
                                  }))
                                }
                                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                              />
                            </label>

                            <label className="space-y-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                                Status
                              </span>
                              <select
                                value={memberForm.status}
                                onChange={(e) =>
                                  setMemberForm((p) => ({
                                    ...p,
                                    status: e.target.value,
                                  }))
                                }
                                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                              >
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                                <option value="archived">Archived</option>
                              </select>
                            </label>
                          </div>

                          <label className="block space-y-1 text-xs">
                            <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                              Short Note / Bio (Optional)
                            </span>
                            <input
                              type="text"
                              value={memberForm.bio}
                              onChange={(e) =>
                                setMemberForm((p) => ({
                                  ...p,
                                  bio: e.target.value,
                                }))
                              }
                              className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                            />
                          </label>

                          <button
                            type="submit"
                            disabled={savingMember}
                            className="src-btn-maroon inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] disabled:opacity-50"
                          >
                            {savingMember ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {editingMemberId
                                ? 'Update Person'
                                : 'Add to Academic Year'}
                            </span>
                          </button>
                        </form>
                      )}

                      {members.length === 0 ? (
                        <p className="rounded-lg border border-line/15 bg-navy-deep p-5 text-xs text-paper/60">
                          No coordinators or members recorded for{' '}
                          {selectedYear.academic_year} yet.
                        </p>
                      ) : (
                        <div className="divide-y divide-line/10 overflow-hidden rounded-xl border border-line/15 bg-navy-deep">
                          {members.map((m) => {
                            const thumb = m.photo_url
                              ? getPublicStorageUrl(
                                  STORAGE_BUCKETS.MEMBER_PHOTOS,
                                  m.photo_url
                                )
                              : '';
                            return (
                              <div
                                key={m.id}
                                className="flex flex-wrap items-center justify-between gap-3 p-4"
                              >
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
                                    <p className="font-display text-sm font-bold text-paper">
                                      {m.full_name}
                                    </p>
                                    <p className="text-xs text-paper/65">
                                      {m.role_title} ·{' '}
                                      {m.member_type.replace('_', ' ')}
                                      {m.academic_batch
                                        ? ` · ${m.academic_batch}`
                                        : ''}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="rounded-sm border border-line/20 bg-navy px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">
                                    {m.status}
                                  </span>
                                  {canEdit && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleEditMember(m)}
                                        className="src-btn-outline-subtle rounded-md p-1.5"
                                        title="Edit person"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMember(m)}
                                        className="src-btn-outline-maroon rounded-md p-1.5"
                                        title="Remove person"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ============ TAB 2: ACTIVITIES & ACHIEVEMENTS ============ */}
                  {activeTab === 'activities' && (
                    <div className="space-y-5">
                      {canEdit && (
                        <form
                          onSubmit={handleSaveActivity}
                          className="space-y-4 rounded-xl border border-line/15 bg-navy-deep p-5"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-gold-light">
                              {editingActivityId
                                ? 'Edit Workshop / Activity / Achievement'
                                : `Add Workshop, Session, Activity or Achievement (${selectedYear.academic_year})`}
                            </h4>
                            {editingActivityId && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingActivityId(null);
                                  setActivityForm(EMPTY_ACTIVITY_FORM);
                                }}
                                className="text-xs text-paper/65 hover:text-paper"
                              >
                                Cancel Edit
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <label className="space-y-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                                Type *
                              </span>
                              <select
                                value={activityForm.activity_type}
                                onChange={(e) =>
                                  setActivityForm((p) => ({
                                    ...p,
                                    activity_type: e.target.value,
                                  }))
                                }
                                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                              >
                                <option value="workshop">Workshop</option>
                                <option value="session">Session</option>
                                <option value="activity">Activity</option>
                                <option value="achievement">Achievement</option>
                              </select>
                            </label>

                            <label className="space-y-1 text-xs sm:col-span-2">
                              <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                                Title *
                              </span>
                              <input
                                type="text"
                                required
                                value={activityForm.title}
                                onChange={(e) =>
                                  setActivityForm((p) => ({
                                    ...p,
                                    title: e.target.value,
                                  }))
                                }
                                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                              />
                            </label>

                            <label className="space-y-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                                Date (Optional)
                              </span>
                              <input
                                type="date"
                                value={activityForm.activity_date}
                                onChange={(e) =>
                                  setActivityForm((p) => ({
                                    ...p,
                                    activity_date: e.target.value,
                                  }))
                                }
                                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                              />
                            </label>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <label className="space-y-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                                Venue (Optional)
                              </span>
                              <input
                                type="text"
                                placeholder="e.g. CSE Seminar Hall"
                                value={activityForm.venue}
                                onChange={(e) =>
                                  setActivityForm((p) => ({
                                    ...p,
                                    venue: e.target.value,
                                  }))
                                }
                                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                              />
                            </label>

                            <label className="space-y-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                                Outcome / Impact (Optional)
                              </span>
                              <input
                                type="text"
                                placeholder="e.g. 85 E2 students participated"
                                value={activityForm.outcome}
                                onChange={(e) =>
                                  setActivityForm((p) => ({
                                    ...p,
                                    outcome: e.target.value,
                                  }))
                                }
                                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                              />
                            </label>

                            <label className="space-y-1 text-xs">
                              <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                                Status
                              </span>
                              <select
                                value={activityForm.status}
                                onChange={(e) =>
                                  setActivityForm((p) => ({
                                    ...p,
                                    status: e.target.value,
                                  }))
                                }
                                className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                              >
                                <option value="published">Published</option>
                                <option value="draft">Draft</option>
                                <option value="archived">Archived</option>
                              </select>
                            </label>
                          </div>

                          <label className="block space-y-1 text-xs">
                            <span className="font-semibold uppercase tracking-[0.12em] text-gold-light">
                              Description
                            </span>
                            <textarea
                              rows={2}
                              value={activityForm.description}
                              onChange={(e) =>
                                setActivityForm((p) => ({
                                  ...p,
                                  description: e.target.value,
                                }))
                              }
                              className="w-full rounded-md border border-line/20 bg-navy px-3 py-2 text-sm text-paper"
                            />
                          </label>

                          <button
                            type="submit"
                            disabled={savingActivity}
                            className="src-btn-maroon inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] disabled:opacity-50"
                          >
                            {savingActivity ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {editingActivityId
                                ? 'Update Entry'
                                : 'Add Entry'}
                            </span>
                          </button>
                        </form>
                      )}

                      {activities.length === 0 ? (
                        <p className="rounded-lg border border-line/15 bg-navy-deep p-5 text-xs text-paper/60">
                          No workshops, sessions, activities, or achievements
                          recorded for {selectedYear.academic_year} yet.
                        </p>
                      ) : (
                        <div className="divide-y divide-line/10 overflow-hidden rounded-xl border border-line/15 bg-navy-deep">
                          {activities.map((act) => (
                            <div
                              key={act.id}
                              className="flex flex-wrap items-start justify-between gap-3 p-4"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded-sm bg-maroon px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-paper">
                                    {act.activity_type}
                                  </span>
                                  {act.activity_date && (
                                    <span className="text-xs text-paper/55">
                                      {act.activity_date}
                                    </span>
                                  )}
                                  {act.venue && (
                                    <span className="text-xs text-paper/55">
                                      · {act.venue}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1.5 font-display text-sm font-bold text-paper">
                                  {act.title}
                                </p>
                                {act.description && (
                                  <p className="mt-1 text-xs text-paper/70">
                                    {act.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="rounded-sm border border-line/20 bg-navy px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">
                                  {act.status}
                                </span>
                                {canEdit && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleEditActivity(act)}
                                      className="src-btn-outline-subtle rounded-md p-1.5"
                                      title="Edit entry"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteActivity(act)}
                                      className="src-btn-outline-maroon rounded-md p-1.5"
                                      title="Delete entry"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ============ TAB 3: CLUB GALLERY PHOTOGRAPHS ============ */}
                  {activeTab === 'gallery' && (
                    <div className="space-y-5">
                      {canEdit && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line/15 bg-navy-deep p-4">
                          <p className="text-xs text-paper/70">
                            Upload photographs for{' '}
                            <strong className="text-paper">
                              {club.name} ({selectedYear.academic_year})
                            </strong>{' '}
                            into the existing <code>event-media</code> bucket.
                          </p>
                          <div>
                            <input
                              ref={galleryInputRef}
                              type="file"
                              multiple
                              accept="image/jpeg,image/png,image/webp,image/avif"
                              disabled={uploadingGallery}
                              onChange={handleGalleryUpload}
                              className="hidden"
                            />
                            <button
                              type="button"
                              disabled={uploadingGallery}
                              onClick={() => galleryInputRef.current?.click()}
                              className="src-btn-maroon inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] disabled:opacity-50"
                            >
                              {uploadingGallery ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Upload className="h-3.5 w-3.5" />
                              )}
                              <span>
                                {uploadingGallery
                                  ? 'Uploading...'
                                  : 'Upload Club Photos'}
                              </span>
                            </button>
                          </div>
                        </div>
                      )}

                      {mediaItems.length === 0 ? (
                        <p className="rounded-lg border border-line/15 bg-navy-deep p-5 text-xs text-paper/60">
                          No gallery photographs uploaded for{' '}
                          {selectedYear.academic_year} yet.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {mediaItems.map((item) => {
                            const url = getPublicStorageUrl(
                              STORAGE_BUCKETS.EVENT_MEDIA,
                              item.url
                            );
                            return (
                              <div
                                key={item.id}
                                className="overflow-hidden rounded-xl border border-line/15 bg-navy-deep"
                              >
                                <div className="h-40 overflow-hidden bg-navy-dark">
                                  <img
                                    src={url}
                                    alt={item.caption || item.title || club.name}
                                    loading="lazy"
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <div className="space-y-2.5 p-3.5">
                                  <input
                                    type="text"
                                    disabled={!canEdit}
                                    placeholder="Add photo caption..."
                                    value={item.caption || ''}
                                    onChange={(e) =>
                                      handleUpdateMediaCaption(
                                        item,
                                        e.target.value
                                      )
                                    }
                                    className="w-full rounded border border-line/20 bg-navy px-2.5 py-1.5 text-xs text-paper"
                                  />
                                  <div className="flex items-center justify-between">
                                    <button
                                      type="button"
                                      disabled={!canEdit}
                                      onClick={() =>
                                        handleToggleMediaStatus(item)
                                      }
                                      className="rounded-sm border border-line/20 bg-navy px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light hover:border-gold disabled:opacity-60"
                                    >
                                      {item.status}
                                    </button>
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteMedia(item)}
                                        className="rounded p-1 text-paper/55 hover:bg-maroon/40 hover:text-paper"
                                        aria-label="Delete photo"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
