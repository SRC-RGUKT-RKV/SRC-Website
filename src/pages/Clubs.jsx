import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Layers, History, Sparkles } from 'lucide-react';
import { fetchPublishedClubs } from '../lib/publicApi';
import { ANIMATION_CONFIG } from '../animations/animationConfig';
import ClubCard from '../components/ClubCard';
import { LoadingState, EmptyState, ErrorState } from '../components/QueryState';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FILTER_TABS = [
  { id: 'all', label: 'All Clubs' },
  { id: 'active', label: 'Active This Year' },
  { id: 'history', label: 'With Previous History' },
];

export default function Clubs() {
  const pageRef = useRef(null);
  const [clubs, setClubs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadClubs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchPublishedClubs();
      setClubs(list);
    } catch (err) {
      setError(err.message || 'Unable to load SRC clubs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClubs();
  }, [loadClubs]);

  const activeClubs = useMemo(
    () => clubs.filter((c) => c.isCurrentlyActive),
    [clubs]
  );

  const archiveOnlyClubs = useMemo(
    () => clubs.filter((c) => !c.isCurrentlyActive),
    [clubs]
  );

  const historicalClubsCount = useMemo(
    () => clubs.filter((c) => c.historicalYears.length > 0).length,
    [clubs]
  );

  const filteredClubs = useMemo(() => {
    if (filter === 'active') return activeClubs;
    if (filter === 'history') {
      return clubs.filter((c) => c.historicalYears.length > 0);
    }
    return clubs;
  }, [clubs, activeClubs, filter]);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      gsap.fromTo(
        '[data-clubs-hero]',
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: ANIMATION_CONFIG.hero.duration,
          stagger: 0.08,
          ease: ANIMATION_CONFIG.hero.ease,
          clearProps: 'transform,opacity',
        }
      );
    },
    { scope: pageRef }
  );

  useGSAP(
    () => {
      if (
        loading ||
        clubs.length === 0 ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      gsap.fromTo(
        '[data-club-card]',
        { y: 22, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          stagger: 0.08,
          ease: ANIMATION_CONFIG.scrollReveal.ease,
          clearProps: 'transform,opacity',
        }
      );
    },
    { scope: pageRef, dependencies: [loading, filter, clubs.length] }
  );

  return (
    <div ref={pageRef} className="bg-navy text-paper">
      {/* ================= EDITORIAL HERO ================= */}
      <section className="relative overflow-hidden border-b border-gold/25 bg-navy-deep pt-14 pb-14 sm:pt-20 sm:pb-18">
        {/* Subtle Signature Diagonal Maroon & Gold Corner Accent */}
        <svg
          viewBox="0 0 180 130"
          preserveAspectRatio="none"
          className="pointer-events-none absolute right-0 bottom-0 h-20 w-28 -scale-x-100 opacity-75 sm:h-28 sm:w-40"
          aria-hidden="true"
        >
          <polygon points="0,12 164,130 128,130 0,38" fill="#6d2331" />
          <polygon points="0,38 128,130 92,130 0,64" fill="#b8863b" />
          <polygon points="0,64 92,130 0,130" fill="#541a25" />
        </svg>

        <div className="relative z-10 mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 items-end gap-10 lg:grid-cols-12">
            <div className="lg:col-span-8">
              <p
                data-clubs-hero
                className="inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold-light"
              >
                <span className="h-[2px] w-7 bg-gold" aria-hidden="true" />
                <span>Department of CSE · Student Communities</span>
              </p>

              <h1
                data-clubs-hero
                className="mt-4 font-serif text-4xl font-bold leading-[1.04] tracking-tight text-paper sm:text-6xl"
              >
                SRC <span className="text-gold-light">Clubs</span>
              </h1>

              <p
                data-clubs-hero
                className="mt-5 max-w-2xl text-base leading-relaxed text-paper/75 sm:text-lg"
              >
                Student-led technical and academic communities under the Student
                Recreation Center — mentoring every batch from foundational E1
                learning to competitive exam readiness, while preserving the
                continuity of every academic year&apos;s student teams.
              </p>
            </div>

            {/* Live Continuity Counters */}
            <div
              data-clubs-hero
              className="grid grid-cols-3 gap-3 rounded-xl border border-gold/25 bg-navy/85 p-4 lg:col-span-4"
            >
              <div className="px-2">
                <p className="font-display text-2xl font-bold text-paper sm:text-3xl">
                  {loading ? '—' : String(clubs.length).padStart(2, '0')}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">
                  Total Clubs
                </p>
              </div>
              <div className="border-l border-line/15 px-3">
                <p className="font-display text-2xl font-bold text-paper sm:text-3xl">
                  {loading ? '—' : String(activeClubs.length).padStart(2, '0')}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">
                  Active Now
                </p>
              </div>
              <div className="border-l border-line/15 px-3">
                <p className="font-display text-2xl font-bold text-paper sm:text-3xl">
                  {loading ? '—' : String(historicalClubsCount).padStart(2, '0')}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold-light">
                  With Archive
                </p>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          {!loading && !error && clubs.length > 0 && (
            <div
              data-clubs-hero
              className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-line/15 pt-6"
            >
              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label="Filter SRC clubs"
              >
                {FILTER_TABS.map((tab) => {
                  const isSelected = filter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setFilter(tab.id)}
                      className={`rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${
                        isSelected
                          ? 'src-btn-maroon border border-gold/60'
                          : 'src-btn-navy border border-line/20 text-paper/75 hover:text-gold-light'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-paper/55">
                Select any club to view its current coordinators, activities,
                galleries, and previous academic-year history.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ================= CLUBS DIRECTORY ================= */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          {loading ? (
            <LoadingState label="Loading SRC clubs and continuity records..." dark />
          ) : error ? (
            <ErrorState message={error} onRetry={loadClubs} dark />
          ) : clubs.length === 0 ? (
            <EmptyState
              title="No Published Clubs Yet"
              description="Published SRC clubs, coordinators, activities, and historical teams added through the Admin Dashboard will appear here automatically."
              dark
            />
          ) : filter === 'all' ? (
            <div className="space-y-16">
              {/* Current Active Clubs */}
              {activeClubs.length > 0 && (
                <div>
                  <div className="mb-8 flex flex-col justify-between gap-3 border-b border-line/15 pb-5 sm:flex-row sm:items-end">
                    <div>
                      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
                        <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                        <span>Current Academic Year</span>
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-bold text-paper sm:text-3xl">
                        Active Department Clubs
                      </h2>
                    </div>
                    <p className="max-w-md text-xs leading-relaxed text-paper/65">
                      Clubs actively operating this academic year. Where a club
                      continues from a previous academic year, its full prior team
                      and archive are preserved inside its detail page.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {activeClubs.map((club) => (
                      <div key={club.id} data-club-card>
                        <ClubCard club={club} className="h-full" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Preserved Historical / Inactive Clubs */}
              {archiveOnlyClubs.length > 0 && (
                <div>
                  <div className="mb-8 flex flex-col justify-between gap-3 border-b border-line/15 pb-5 sm:flex-row sm:items-end">
                    <div>
                      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
                        <History className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                        <span>Preserved Academic-Year History</span>
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-bold text-paper sm:text-3xl">
                        Previous-Year Clubs &amp; Archive
                      </h2>
                    </div>
                    <p className="max-w-md text-xs leading-relaxed text-paper/65">
                      Clubs operated in previous academic years whose history is
                      preserved permanently. Current-year activation is managed
                      explicitly by SRC administrators.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {archiveOnlyClubs.map((club) => (
                      <div key={club.id} data-club-card>
                        <ClubCard club={club} className="h-full" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : filteredClubs.length === 0 ? (
            <EmptyState
              title="No Clubs Match This Filter"
              description="Try selecting All Clubs to view both active and archived club records."
              dark
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredClubs.map((club) => (
                <div key={club.id} data-club-card>
                  <ClubCard club={club} className="h-full" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ================= CONTINUITY NOTE STRIP ================= */}
      <section className="border-t border-line bg-paper py-14 text-ink sm:py-16">
        <div className="mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-8 px-5 sm:px-8 lg:grid-cols-12 lg:px-12">
          <div className="lg:col-span-8">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-maroon">
              <Layers className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Academic-Year Continuity</span>
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-navy sm:text-3xl">
              Every cohort&apos;s leadership is preserved — never overwritten.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/75 sm:text-base">
              When a new academic year begins, SRC clubs retain their unified
              identity while storing each year&apos;s student coordinators,
              faculty advisors, workshops, achievements, and galleries under
              distinct academic-year records.
            </p>
          </div>
          <div className="rounded-xl border border-line bg-cream p-5 lg:col-span-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-maroon">
              How Continuity Works
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-ink/80">
              <li>• Current teams are displayed first with explicit Active status.</li>
              <li>• Previous academic-year teams remain intact under Club History.</li>
              <li>• Clubs are activated per academic year by authorized SRC admins.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
