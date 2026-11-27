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
import EventForm from '../../components/admin/EventForm';

export default function AdminEvents() {
  const { canEdit } = useAdminAuth();

  const [batches, setBatches] = useState([]);
  const [events, setEvents] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editingGallery, setEditingGallery] = useState([]);

  const loadEvents = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');
    try {
      const [batchesRes, eventsRes] = await Promise.all([
        supabase
          .from('batches')
          .select('id, name, academic_year')
          .order('start_year', { ascending: false }),
        supabase
          .from('events')
          .select('*, batch:batches(name), event_media(id, url, media_type, title, caption, display_order)')
          .order('event_date', { ascending: false }),
      ]);

      if (batchesRes.error) throw batchesRes.error;
      if (eventsRes.error) throw eventsRes.error;

      setBatches(batchesRes.data || []);
      setEvents(eventsRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = events.filter(
    (ev) => statusFilter === 'all' || ev.status === statusFilter
  );

  const openCreate = () => {
    setEditingEvent(null);
    setEditingGallery([]);
    setError('');
    setFeedback('');
    setShowForm(true);
  };

  const openEdit = (ev) => {
    setEditingEvent(ev);
    const sortedMedia = [...(ev.event_media || [])].sort(
      (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
    );
    setEditingGallery(sortedMedia);
    setError('');
    setFeedback('');
    setShowForm(true);
  };

  const handleDelete = async (ev) => {
    if (!canEdit || !supabase) return;
    if (
      !window.confirm(
        `Delete event "${ev.title}" and all linked event_media records?`
      )
    ) {
      return;
    }

    setError('');
    setFeedback('');
    try {
      const { error: delErr } = await supabase
        .from('events')
        .delete()
        .eq('id', ev.id);
      if (delErr) throw delErr;

      if (ev.cover_image_url) {
        await deleteFileFromBucket(
          STORAGE_BUCKETS.EVENT_MEDIA,
          ev.cover_image_url
        ).catch(() => {});
      }
      for (const media of ev.event_media || []) {
        if (media.url && !/^https?:\/\//i.test(media.url)) {
          await deleteFileFromBucket(
            STORAGE_BUCKETS.EVENT_MEDIA,
            media.url
          ).catch(() => {});
        }
      }

      setFeedback(`Deleted event "${ev.title}".`);
      await loadEvents();
    } catch (err) {
      setError(err.message || 'Failed to delete event.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-line/15 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
            PostgreSQL · public.events + public.event_media
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-paper">
            Event Management
          </h1>
          <p className="mt-1 text-sm text-paper/65">
            Create events, upload cover photos and galleries, and attach video
            embed URLs or external links.
          </p>
        </div>

        {canEdit && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 self-start rounded-md bg-maroon px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-gold hover:text-navy-dark sm:self-auto"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>New Event</span>
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

      {showForm && (
        <EventForm
          key={editingEvent?.id || 'new-event'}
          batches={batches}
          initialEvent={editingEvent}
          initialGallery={editingGallery}
          canEdit={canEdit}
          onSaved={async () => {
            setShowForm(false);
            setEditingEvent(null);
            setFeedback('Event and media paths saved in PostgreSQL.');
            await loadEvents();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingEvent(null);
          }}
        />
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <select
          aria-label="Filter events by status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-line/20 bg-navy px-3 py-2 text-xs text-paper"
        >
          <option value="all">All Statuses ({events.length})</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Events Table */}
      <div className="overflow-hidden rounded-xl border border-line/15 bg-navy">
        {loading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-xs text-paper/65">
            <Loader2 className="h-4 w-4 animate-spin text-gold" />
            <span>Loading events from Supabase...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-10 text-center text-sm text-paper/65">
            No events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line/15 bg-navy-deep text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-light">
                <tr>
                  <th className="px-5 py-3.5">Event</th>
                  <th className="px-5 py-3.5">Date &amp; Category</th>
                  <th className="px-5 py-3.5">Media</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/10">
                {filteredEvents.map((ev) => {
                  const thumb = ev.cover_image_url
                    ? getPublicStorageUrl(
                        STORAGE_BUCKETS.EVENT_MEDIA,
                        ev.cover_image_url
                      )
                    : '';
                  return (
                    <tr key={ev.id} className="hover:bg-navy-deep/50">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-16 shrink-0 overflow-hidden rounded-md border border-line/20 bg-navy-dark">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt={ev.title}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-paper/35">
                                No cover
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="flex items-center gap-1.5 font-display font-bold text-paper">
                              <span>{ev.title}</span>
                              {ev.is_featured && (
                                <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                              )}
                            </p>
                            <p className="font-mono text-xs text-paper/50">
                              {ev.slug}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-xs font-medium text-paper/85">
                          {ev.event_date}
                        </p>
                        <p className="text-xs text-paper/55">{ev.category}</p>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-paper/75">
                        {(ev.event_media || []).length} item(s)
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-sm border border-line/20 bg-navy-deep px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">
                          {ev.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(ev)}
                            className="rounded-md border border-line/20 p-2 text-paper/75 hover:border-gold hover:text-gold-light"
                            title={canEdit ? 'Edit event' : 'Inspect event'}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => handleDelete(ev)}
                              className="rounded-md border border-maroon/60 p-2 text-paper/75 hover:bg-maroon hover:text-paper"
                              title="Delete event"
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
