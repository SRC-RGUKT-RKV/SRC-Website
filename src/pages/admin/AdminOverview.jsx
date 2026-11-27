import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  Users,
  Calendar,
  Award,
  Link2,
  Image as ImageIcon,
  Shield,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAdminAuth } from '../../context/AdminAuthContext';

export default function AdminOverview() {
  const { profile, roleLabel, isSuperAdmin, canEdit } = useAdminAuth();

  const [stats, setStats] = useState(null);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [recentMembers, setRecentMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError('');

    try {
      const [
        batchesTotal,
        batchesPublished,
        membersTotal,
        membersPublished,
        eventsTotal,
        eventsPublished,
        achievementsTotal,
        socialLinksTotal,
        eventMediaTotal,
        currentBatchRes,
        recentEventsRes,
        recentMembersRes,
        adminProfilesRes,
      ] = await Promise.all([
        supabase.from('batches').select('*', { count: 'exact', head: true }),
        supabase
          .from('batches')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published'),
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase
          .from('members')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published'),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'published'),
        supabase
          .from('achievements')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('social_links')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('event_media')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('batches')
          .select('id, name, academic_year, status, slug')
          .eq('is_current', true)
          .maybeSingle(),
        supabase
          .from('events')
          .select('id, title, category, event_date, status')
          .order('updated_at', { ascending: false })
          .limit(5),
        supabase
          .from('members')
          .select('id, full_name, designation, status, batch:batches(name)')
          .order('updated_at', { ascending: false })
          .limit(5),
        isSuperAdmin
          ? supabase
              .from('admin_profiles')
              .select('*', { count: 'exact', head: true })
          : Promise.resolve({ count: null, error: null }),
      ]);

      const firstErr = [
        batchesTotal.error,
        membersTotal.error,
        eventsTotal.error,
        achievementsTotal.error,
        socialLinksTotal.error,
        eventMediaTotal.error,
        currentBatchRes.error,
        recentEventsRes.error,
        recentMembersRes.error,
        adminProfilesRes.error,
      ].find(Boolean);

      if (firstErr) throw firstErr;

      setStats({
        batchesTotal: batchesTotal.count ?? 0,
        batchesPublished: batchesPublished.count ?? 0,
        membersTotal: membersTotal.count ?? 0,
        membersPublished: membersPublished.count ?? 0,
        eventsTotal: eventsTotal.count ?? 0,
        eventsPublished: eventsPublished.count ?? 0,
        achievementsTotal: achievementsTotal.count ?? 0,
        socialLinksTotal: socialLinksTotal.count ?? 0,
        eventMediaTotal: eventMediaTotal.count ?? 0,
        adminProfilesTotal: adminProfilesRes.count,
      });
      setCurrentBatch(currentBatchRes.data || null);
      setRecentEvents(recentEventsRes.data || []);
      setRecentMembers(recentMembersRes.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard overview.');
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const statCards = stats
    ? [
        {
          label: 'Academic Batches',
          value: stats.batchesTotal,
          sub: `${stats.batchesPublished} published`,
          icon: Layers,
          to: '/admin/batches',
        },
        {
          label: 'Council Members',
          value: stats.membersTotal,
          sub: `${stats.membersPublished} published`,
          icon: Users,
          to: '/admin/members',
        },
        {
          label: 'Events Archive',
          value: stats.eventsTotal,
          sub: `${stats.eventsPublished} published`,
          icon: Calendar,
          to: '/admin/events',
        },
        {
          label: 'Achievements',
          value: stats.achievementsTotal,
          sub: 'Vault & batch milestones',
          icon: Award,
          to: '/admin/vault',
        },
        {
          label: 'Event Media',
          value: stats.eventMediaTotal,
          sub: 'Photos, videos & links',
          icon: ImageIcon,
          to: '/admin/media',
        },
        {
          label: 'Social Links',
          value: stats.socialLinksTotal,
          sub: 'Member & SRC links',
          icon: Link2,
          to: '/admin/members',
        },
        ...(isSuperAdmin
          ? [
              {
                label: 'Admin Accounts',
                value: stats.adminProfilesTotal ?? 0,
                sub: 'Super Admin managed',
                icon: Shield,
                to: '/admin/users',
              },
            ]
          : []),
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-line/15 pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
            Dashboard Overview · Live PostgreSQL
          </p>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight text-paper sm:text-4xl">
            Welcome, {profile?.full_name}
          </h1>
          <p className="mt-1 text-sm text-paper/65">
            Signed in as <strong className="text-gold-light">{roleLabel}</strong>.
            All counts and records below are queried directly from Supabase.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOverview}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-md border border-gold/40 bg-navy px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold-light transition-colors hover:bg-gold hover:text-navy-dark disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-maroon bg-maroon/25 p-4 text-sm text-paper"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-gold-light" />
          <span>{error}</span>
        </div>
      )}

      {/* Current Active Batch Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-gold/30 bg-navy p-5 sm:flex-row sm:items-center sm:p-6">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light">
            Active Current Panel (Single-Current Enforced)
          </p>
          {currentBatch ? (
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-display text-2xl font-bold text-paper">
                {currentBatch.name} ({currentBatch.academic_year})
              </h2>
              <span className="rounded-sm bg-maroon px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-paper">
                {currentBatch.status}
              </span>
            </div>
          ) : (
            <p className="text-sm text-paper/75">
              No batch is marked as <code>is_current = true</code> yet. Create or
              promote a batch in Academic Batches.
            </p>
          )}
        </div>

        <Link
          to="/admin/batches"
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-maroon px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-paper transition-colors hover:bg-gold hover:text-navy-dark"
        >
          <span>Manage Batches</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      {/* Live Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading && !stats
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-line/10 bg-navy/60"
              />
            ))
          : statCards.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.label}
                  to={card.to}
                  className="group flex flex-col justify-between rounded-xl border border-line/15 bg-navy p-5 transition-colors hover:border-gold/60"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-[0.15em] text-paper/65">
                      {card.label}
                    </span>
                    <Icon
                      className="h-4 w-4 text-gold transition-transform group-hover:scale-110"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mt-5">
                    <p className="font-display text-3xl font-bold text-paper">
                      {card.value}
                    </p>
                    <p className="mt-1 text-xs text-gold-light/85">{card.sub}</p>
                  </div>
                </Link>
              );
            })}
      </div>

      {/* Recent Database Activity & Role Capabilities */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Recent Members */}
        <section className="rounded-xl border border-line/15 bg-navy p-6 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-paper">
              Recently Updated Members
            </h2>
            <Link
              to="/admin/members"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-light hover:text-paper"
            >
              All Members →
            </Link>
          </div>

          {recentMembers.length === 0 ? (
            <p className="rounded-lg border border-line/10 bg-navy-deep p-4 text-xs text-paper/60">
              No member rows in PostgreSQL yet.
            </p>
          ) : (
            <ul className="divide-y divide-line/10">
              {recentMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-paper">
                      {m.full_name}
                    </p>
                    <p className="truncate text-xs text-paper/60">
                      {m.designation} · {m.batch?.name || 'Unassigned'}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-sm border border-line/20 bg-navy-deep px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">
                    {m.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent Events */}
        <section className="rounded-xl border border-line/15 bg-navy p-6 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-paper">
              Recently Updated Events
            </h2>
            <Link
              to="/admin/events"
              className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-light hover:text-paper"
            >
              All Events →
            </Link>
          </div>

          {recentEvents.length === 0 ? (
            <p className="rounded-lg border border-line/10 bg-navy-deep p-4 text-xs text-paper/60">
              No event rows in PostgreSQL yet.
            </p>
          ) : (
            <ul className="divide-y divide-line/10">
              {recentEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-paper">{ev.title}</p>
                    <p className="truncate text-xs text-paper/60">
                      {ev.category} · {ev.event_date}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-sm border border-line/20 bg-navy-deep px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">
                    {ev.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Verified RLS Permission Summary */}
      <section className="rounded-xl border border-line/15 bg-navy-deep p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
          Active Role Permissions ({roleLabel})
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 text-xs text-paper/80 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg border border-line/15 bg-navy p-3.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-gold" />
            <span>Read all published, draft &amp; archived records</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-line/15 bg-navy p-3.5">
            <CheckCircle2
              className={`h-4 w-4 shrink-0 ${canEdit ? 'text-gold' : 'text-paper/25'}`}
            />
            <span>
              {canEdit
                ? 'Create, update, delete content & upload media'
                : 'Content editing & media uploads disabled (Viewer)'}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-line/15 bg-navy p-3.5">
            <CheckCircle2
              className={`h-4 w-4 shrink-0 ${isSuperAdmin ? 'text-gold' : 'text-paper/25'}`}
            />
            <span>
              {isSuperAdmin
                ? 'Manage administrator roles & accounts'
                : 'Administrator account management restricted to Super Admin'}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
