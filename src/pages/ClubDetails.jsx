import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  ArrowLeft,
  Users,
  Sparkles,
  History,
  CheckCircle2,
  Calendar,
  MapPin,
  Award,
  Wrench,
  BookOpen,
  Layers,
  Mail,
  GraduationCap,
} from 'lucide-react';
import { fetchPublishedClubBySlug } from '../lib/publicApi';
import { ANIMATION_CONFIG } from '../animations/animationConfig';
import PhotoGallery from '../components/PhotoGallery';
import { LoadingState, EmptyState, ErrorState } from '../components/QueryState';

gsap.registerPlugin(useGSAP);

const ACTIVITY_META = {
  workshop: { label: 'Workshop', icon: Wrench },
  session: { label: 'Session', icon: BookOpen },
  activity: { label: 'Activity', icon: Layers },
  achievement: { label: 'Achievement', icon: Award },
};

function PersonCard({ person, accent = 'gold' }) {
  const initials = (person.fullName || 'SRC')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="flex items-start gap-4 rounded-xl border border-line/15 bg-navy p-4 transition-colors hover:border-gold/50">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gold/30 bg-navy-dark">
        {person.photo ? (
          <img
            src={person.photo}
            alt={person.fullName}
            loading="lazy"
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <span className="font-display text-base font-bold text-gold-light">
            {initials}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <span
          className={`inline-block rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${
            accent === 'maroon'
              ? 'bg-maroon text-paper'
              : 'border border-gold/35 bg-navy-deep text-gold-light'
          }`}
        >
          {person.roleTitle}
        </span>
        <h4 className="mt-1.5 font-display text-base font-bold text-paper">
          {person.fullName}
        </h4>
        <p className="mt-0.5 text-xs text-paper/60">
          {[person.department, person.academicBatch].filter(Boolean).join(' · ')}
        </p>
        {person.bio && (
          <p className="mt-2 text-xs leading-relaxed text-paper/75">
            {person.bio}
          </p>
        )}
        {person.email && (
          <a
            href={`mailto:${person.email}`}
            className="mt-2 inline-flex items-center gap-1.5 text-xs text-gold-light hover:underline"
          >
            <Mail className="h-3 w-3" aria-hidden="true" />
            <span className="truncate">{person.email}</span>
          </a>
        )}
      </div>
    </div>
  );
}

function YearRecordsPanel({ yearData, clubName, isHistorical = false }) {
  const [activityFilter, setActivityFilter] = useState('all');

  const activities = yearData.activities || [];
  const filteredActivities =
    activityFilter === 'all'
      ? activities
      : activities.filter((a) => a.activityType === activityFilter);

  const hasPeople =
    yearData.facultyCoordinators.length > 0 ||
    yearData.studentCoordinators.length > 0 ||
    yearData.members.length > 0;

  return (
    <div className="space-y-12">
      {/* Year Overview & Optional Team Photograph */}
      {(yearData.summary || yearData.teamPhoto) && (
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
          {yearData.summary && (
            <div
              className={
                yearData.teamPhoto ? 'lg:col-span-6 space-y-3' : 'lg:col-span-12 space-y-3'
              }
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
                {isHistorical
                  ? `Archived Term · ${yearData.academicYear}`
                  : `Current Term · ${yearData.academicYear}`}
              </p>
              <p className="text-base leading-relaxed text-paper/85">
                {yearData.summary}
              </p>
            </div>
          )}

          {yearData.teamPhoto && (
            <div className={yearData.summary ? 'lg:col-span-6' : 'lg:col-span-12'}>
              <div className="aspect-[16/10] overflow-hidden rounded-xl border border-gold/30 bg-navy-dark shadow-xl">
                <img
                  src={yearData.teamPhoto}
                  alt={`${clubName} ${yearData.academicYear} team`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Coordinators & Team */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line/15 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
              {isHistorical ? 'Previous Team & Guidance' : 'Leadership & Team'}
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold text-paper">
              Coordinators &amp; Members ({yearData.academicYear})
            </h3>
          </div>
        </div>

        {!hasPeople ? (
          <div className="rounded-xl border border-line/15 bg-navy p-6 text-sm text-paper/65">
            Coordinator and student team details for{' '}
            <strong className="text-paper">{yearData.academicYear}</strong> have
            not been published yet. Authorized SRC admins can add them from the
            Clubs Management dashboard.
          </div>
        ) : (
          <div className="space-y-8">
            {yearData.facultyCoordinators.length > 0 && (
              <div className="space-y-3">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-light">
                  <GraduationCap className="h-4 w-4 text-gold" aria-hidden="true" />
                  <span>Faculty Coordinators</span>
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {yearData.facultyCoordinators.map((person) => (
                    <PersonCard
                      key={person.id}
                      person={person}
                      accent="maroon"
                    />
                  ))}
                </div>
              </div>
            )}

            {yearData.studentCoordinators.length > 0 && (
              <div className="space-y-3">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-light">
                  <Users className="h-4 w-4 text-gold" aria-hidden="true" />
                  <span>Student Coordinators</span>
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {yearData.studentCoordinators.map((person) => (
                    <PersonCard key={person.id} person={person} accent="gold" />
                  ))}
                </div>
              </div>
            )}

            {yearData.members.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-paper/65">
                  Club Team Members
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {yearData.members.map((person) => (
                    <PersonCard key={person.id} person={person} accent="gold" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workshops, Sessions, Activities & Achievements */}
      <div className="space-y-6">
        <div className="flex flex-col justify-between gap-4 border-b border-line/15 pb-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
              Programs &amp; Milestones
            </p>
            <h3 className="mt-1 font-display text-2xl font-bold text-paper">
              Workshops, Sessions &amp; Achievements ({yearData.academicYear})
            </h3>
          </div>

          {activities.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {['all', 'workshop', 'session', 'activity', 'achievement'].map(
                (type) => {
                  const count =
                    type === 'all'
                      ? activities.length
                      : activities.filter((a) => a.activityType === type).length;
                  if (type !== 'all' && count === 0) return null;
                  const active = activityFilter === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActivityFilter(type)}
                      className={`rounded-md px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                        active
                          ? 'border border-gold/60 bg-maroon text-paper'
                          : 'border border-line/20 bg-navy text-paper/70 hover:border-gold/50 hover:text-gold-light'
                      }`}
                    >
                      {type === 'all'
                        ? `All (${count})`
                        : `${ACTIVITY_META[type].label}s (${count})`}
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>

        {activities.length === 0 ? (
          <div className="rounded-xl border border-line/15 bg-navy p-6 text-sm text-paper/65">
            No published workshops, sessions, activities, or achievements are
            recorded yet for{' '}
            <strong className="text-paper">{yearData.academicYear}</strong>.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {filteredActivities.map((item) => {
              const meta =
                ACTIVITY_META[item.activityType] || ACTIVITY_META.activity;
              const Icon = meta.icon;
              const isAchievement = item.activityType === 'achievement';

              return (
                <article
                  key={item.id}
                  className={`flex flex-col justify-between rounded-xl border p-5 ${
                    isAchievement
                      ? 'border-gold/45 bg-navy'
                      : 'border-line/15 bg-navy'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
                          isAchievement
                            ? 'bg-gold text-navy-dark'
                            : 'bg-maroon text-paper'
                        }`}
                      >
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        <span>{meta.label}</span>
                      </span>

                      {item.date && (
                        <span className="inline-flex items-center gap-1 text-xs text-paper/60">
                          <Calendar
                            className="h-3.5 w-3.5 text-gold"
                            aria-hidden="true"
                          />
                          <span>{item.date}</span>
                        </span>
                      )}
                    </div>

                    <h4 className="mt-3 font-display text-lg font-bold text-paper">
                      {item.title}
                    </h4>

                    {item.description && (
                      <p className="mt-2 text-sm leading-relaxed text-paper/75">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {(item.venue || item.outcome) && (
                    <div className="mt-4 space-y-1.5 border-t border-line/15 pt-3 text-xs text-paper/70">
                      {item.venue && (
                        <p className="inline-flex items-center gap-1.5">
                          <MapPin
                            className="h-3.5 w-3.5 text-gold"
                            aria-hidden="true"
                          />
                          <span>{item.venue}</span>
                        </p>
                      )}
                      {item.outcome && (
                        <p className="text-gold-light/90">
                          <strong>Outcome:</strong> {item.outcome}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Club Photographs & Gallery */}
      {yearData.gallery && yearData.gallery.length > 0 && (
        <div className="space-y-5">
          <div className="flex items-end justify-between border-b border-line/15 pb-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
                Photography
              </p>
              <h3 className="mt-1 font-display text-2xl font-bold text-paper">
                Club Gallery ({yearData.academicYear})
              </h3>
            </div>
            <p className="text-xs text-paper/55">Click any photo to inspect</p>
          </div>

          <PhotoGallery
            images={yearData.gallery}
            eventTitle={`${clubName} ${yearData.academicYear}`}
          />
        </div>
      )}
    </div>
  );
}

export default function ClubDetails() {
  const { slug } = useParams();
  const pageRef = useRef(null);
  const [club, setClub] = useState(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadClub = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchPublishedClubBySlug(slug);
      setClub(data);
      if (data?.historicalYears?.length > 0) {
        setSelectedHistoryId(data.historicalYears[0].id);
      } else {
        setSelectedHistoryId('');
      }
    } catch (err) {
      setError(err.message || 'Unable to load club details.');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadClub();
  }, [loadClub]);

  useGSAP(
    () => {
      if (
        loading ||
        !club ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        return;
      }

      gsap.fromTo(
        '[data-club-detail-hero]',
        { y: 18, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: ANIMATION_CONFIG.hero.duration,
          stagger: 0.07,
          ease: ANIMATION_CONFIG.hero.ease,
          clearProps: 'transform,opacity',
        }
      );
    },
    { scope: pageRef, dependencies: [loading, club?.id] }
  );

  if (loading) {
    return (
      <div className="bg-navy py-20 text-paper">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-12">
          <LoadingState label="Loading club profile and academic-year history..." dark />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-navy py-20 text-paper">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-12">
          <ErrorState message={error} onRetry={loadClub} dark />
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="flex min-h-[65dvh] flex-col items-center justify-center bg-navy px-5 text-center text-paper">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
          Club Record Unavailable
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold">Club Not Found</h1>
        <Link
          to="/clubs"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-maroon px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-paper hover:bg-gold hover:text-navy-dark"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Clubs</span>
        </Link>
      </div>
    );
  }

  const initials = (club.name || 'SRC')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('');

  const activeHistoryYear =
    club.historicalYears.find((y) => y.id === selectedHistoryId) ||
    club.historicalYears[0] ||
    null;

  return (
    <article ref={pageRef} className="bg-navy text-paper">
      {/* ================= CLUB HERO HEADER ================= */}
      <section className="border-b border-gold/25 bg-navy-deep pt-12 pb-12 sm:pt-16 sm:pb-16">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-12">
          <Link
            to="/clubs"
            data-club-detail-hero
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-light transition-colors hover:text-paper"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to All Clubs</span>
          </Link>

          <div
            data-club-detail-hero
            className="mt-8 flex flex-col gap-6 sm:flex-row sm:items-start"
          >
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gold/45 bg-navy shadow-lg sm:h-24 sm:w-24">
              {club.logo ? (
                <img
                  src={club.logo}
                  alt={`${club.name} logo`}
                  className="h-full w-full object-contain p-2"
                />
              ) : (
                <span className="font-serif text-3xl font-bold text-gold-light">
                  {initials}
                </span>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2.5">
                {club.isCurrentlyActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-sm bg-maroon px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-paper">
                    <Sparkles className="h-3.5 w-3.5 text-gold-light" aria-hidden="true" />
                    <span>Active · {club.currentYear.academicYear}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-sm border border-gold/40 bg-navy px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-light">
                    <History className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>
                      {club.currentYear
                        ? `Inactive · ${club.currentYear.academicYear}`
                        : 'Historical Record Preserved'}
                    </span>
                  </span>
                )}

                {club.targetAudience && (
                  <span className="inline-flex items-center gap-1.5 rounded-sm border border-line/20 bg-navy px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-paper/85">
                    <Users className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                    <span>{club.targetAudience}</span>
                  </span>
                )}

                {club.foundedAcademicYear && (
                  <span className="text-xs text-paper/55">
                    Est. {club.foundedAcademicYear}
                  </span>
                )}
              </div>

              <h1 className="mt-4 font-serif text-4xl font-bold leading-[1.04] tracking-tight text-paper sm:text-5xl lg:text-6xl">
                {club.name}
              </h1>

              {club.focusArea && (
                <p className="mt-2 text-sm font-medium uppercase tracking-[0.16em] text-gold-light/90">
                  {club.focusArea}
                </p>
              )}

              {club.shortDescription && (
                <p className="mt-4 max-w-3xl text-base leading-relaxed text-paper/80 sm:text-lg">
                  {club.shortDescription}
                </p>
              )}
            </div>
          </div>

          {club.coverImage && (
            <div
              data-club-detail-hero
              className="mt-10 aspect-[16/8] overflow-hidden rounded-xl border border-gold/30 bg-navy-dark shadow-2xl"
            >
              <img
                src={club.coverImage}
                alt={club.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
        </div>
      </section>

      {/* ================= ABOUT & OBJECTIVES (EDITORIAL PAPER) ================= */}
      {(club.description || club.objectives.length > 0) && (
        <section className="border-b border-line bg-paper py-14 text-ink sm:py-18">
          <div className="mx-auto grid max-w-[1180px] grid-cols-1 gap-10 px-5 sm:px-8 lg:grid-cols-12 lg:px-12">
            {club.description && (
              <div
                className={
                  club.objectives.length > 0
                    ? 'lg:col-span-7 space-y-4'
                    : 'lg:col-span-12 space-y-4'
                }
              >
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-maroon">
                  About the Club
                </p>
                <p className="text-base leading-relaxed text-ink/85 sm:text-lg">
                  {club.description}
                </p>
              </div>
            )}

            {club.objectives.length > 0 && (
              <div className="rounded-xl border border-line bg-cream p-6 lg:col-span-5">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-maroon">
                  Core Objectives
                </p>
                <ul className="space-y-3">
                  {club.objectives.map((objective, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-ink/85"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-maroon"
                        aria-hidden="true"
                      />
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ================= CURRENT ACADEMIC YEAR SECTION ================= */}
      <section className="border-b border-line/15 bg-navy-deep py-14 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-12">
          {club.currentYear ? (
            <div className="space-y-10">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gold/25 pb-6">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
                    <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                    <span>
                      {club.currentYear.isActive
                        ? 'Current Active Term'
                        : 'Current Academic Year Status'}
                    </span>
                  </p>
                  <h2 className="mt-2 font-serif text-3xl font-bold text-paper sm:text-4xl">
                    Academic Year {club.currentYear.academicYear}
                  </h2>
                </div>

                <span
                  className={`rounded-sm px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] ${
                    club.currentYear.isActive
                      ? 'bg-maroon text-paper'
                      : 'border border-gold/40 bg-navy text-gold-light'
                  }`}
                >
                  {club.currentYear.isActive
                    ? 'Active This Year'
                    : 'Not Currently Active'}
                </span>
              </div>

              <YearRecordsPanel
                yearData={club.currentYear}
                clubName={club.name}
                isHistorical={false}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-gold/30 bg-navy p-7 sm:p-9">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
                <History className="h-4 w-4 text-gold" aria-hidden="true" />
                <span>Current Academic-Year Status</span>
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold text-paper">
                Current-Year Team Not Activated Yet
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-paper/75">
                {club.name}&apos;s previous academic-year records are preserved
                below. SRC administrators can add and activate a current
                academic-year record from the Admin Dashboard whenever a new
                team is formed.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ================= CLUB HISTORY (PREVIOUS ACADEMIC YEARS) ================= */}
      <section className="bg-navy py-14 sm:py-20">
        <div className="mx-auto max-w-[1180px] space-y-10 px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-4 border-b border-line/15 pb-6 sm:flex-row sm:items-end">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
                <History className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                <span>Continuity Archive</span>
              </p>
              <h2 className="mt-2 font-serif text-3xl font-bold text-paper sm:text-4xl">
                Club History
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-paper/70">
                Preserved teams, student coordinators, faculty guidance,
                activities, and photographs from previous academic years.
              </p>
            </div>

            {club.historicalYears.length > 1 && (
              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label="Select previous academic year"
              >
                {club.historicalYears.map((yr) => {
                  const selected = yr.id === activeHistoryYear?.id;
                  return (
                    <button
                      key={yr.id}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setSelectedHistoryId(yr.id)}
                      className={`rounded-md px-4 py-2 font-display text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                        selected
                          ? 'border border-gold bg-maroon text-paper'
                          : 'border border-line/20 bg-navy-deep text-paper/75 hover:border-gold/55 hover:text-gold-light'
                      }`}
                    >
                      {yr.academicYear}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {!activeHistoryYear ? (
            <EmptyState
              title="No Previous Academic-Year Records Yet"
              description={`Historical teams and activities for ${club.name} from earlier academic years will be archived here automatically as new academic years are added.`}
              dark
            />
          ) : (
            <div className="rounded-2xl border border-gold/25 bg-navy-deep p-6 sm:p-8 lg:p-10">
              <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-line/15 pb-5">
                <div className="flex items-center gap-3">
                  <span className="rounded-sm border border-gold/45 bg-navy px-3 py-1 font-display text-xs font-bold uppercase tracking-[0.16em] text-gold-light">
                    {activeHistoryYear.academicYear}
                  </span>
                  <span className="text-xs uppercase tracking-[0.16em] text-paper/55">
                    Previous Academic Year
                  </span>
                </div>
                <span className="text-xs text-paper/55">
                  {activeHistoryYear.allMembersCount}{' '}
                  {activeHistoryYear.allMembersCount === 1 ? 'member' : 'members'}{' '}
                  · {activeHistoryYear.activities.length}{' '}
                  {activeHistoryYear.activities.length === 1
                    ? 'activity'
                    : 'activities'}
                </span>
              </div>

              <YearRecordsPanel
                key={activeHistoryYear.id}
                yearData={activeHistoryYear}
                clubName={club.name}
                isHistorical
              />
            </div>
          )}
        </div>
      </section>
    </article>
  );
}
