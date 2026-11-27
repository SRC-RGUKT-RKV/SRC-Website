import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Users, History, Sparkles, Calendar } from 'lucide-react';

/**
 * Editorial SRC club card displaying club logo, target audience, current vs.
 * historical status, short description, and academic-year continuity metadata.
 */
export default function ClubCard({ club, className = '' }) {
  const initials = (club.name || 'SRC')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || '')
    .join('');

  const hasHistory = club.historicalYears.length > 0;
  const activeYearLabel = club.currentYear?.academicYear || '';
  const latestHistoryYear = club.historicalYears[0]?.academicYear || '';

  const totalActivities = club.allYears.reduce(
    (sum, yr) => sum + (yr.activities?.length || 0),
    0
  );

  return (
    <Link
      to={`/clubs/${club.slug}`}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-navy-deep transition-all duration-300 hover:-translate-y-1 hover:border-gold/70 hover:shadow-2xl ${
        club.isCurrentlyActive ? 'border-gold/30' : 'border-line/20'
      } ${className}`}
    >
      {/* Top accent hairline */}
      <div
        className={`h-1 w-full transition-colors ${
          club.isCurrentlyActive
            ? 'bg-gradient-to-r from-maroon via-gold to-gold-light'
            : 'bg-line/25 group-hover:bg-gold/60'
        }`}
        aria-hidden="true"
      />

      {/* Optional Cover Banner */}
      {club.coverImage && (
        <div className="relative h-40 w-full overflow-hidden border-b border-line/15 bg-navy-dark">
          <img
            src={club.coverImage}
            alt={club.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/35 to-transparent" />
        </div>
      )}

      <div className="flex flex-1 flex-col justify-between p-6 sm:p-7">
        <div>
          {/* Logo + Status Badges */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gold/40 bg-navy shadow-md">
              {club.logo ? (
                <img
                  src={club.logo}
                  alt={`${club.name} logo`}
                  loading="lazy"
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <span className="font-serif text-xl font-bold tracking-tight text-gold-light">
                  {initials}
                </span>
              )}
            </div>

            <div className="flex flex-wrap justify-end gap-1.5">
              {club.isCurrentlyActive ? (
                <span className="inline-flex items-center gap-1 rounded-sm bg-maroon px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-paper">
                  <Sparkles className="h-3 w-3 text-gold-light" aria-hidden="true" />
                  <span>Active · {activeYearLabel}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-sm border border-gold/35 bg-navy px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-light">
                  <History className="h-3 w-3" aria-hidden="true" />
                  <span>
                    {latestHistoryYear
                      ? `Archive · ${latestHistoryYear}`
                      : 'History Preserved'}
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Club Name & Target Audience */}
          <div className="mt-5">
            {club.targetAudience && (
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-light">
                <Users className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                <span>{club.targetAudience}</span>
              </p>
            )}

            <h3 className="mt-2 font-serif text-2xl font-bold leading-snug tracking-tight text-paper transition-colors group-hover:text-gold-light sm:text-3xl">
              {club.name}
            </h3>

            {club.focusArea && (
              <p className="mt-1 text-xs font-medium text-paper/60">
                {club.focusArea}
              </p>
            )}
          </div>

          {/* Short Description */}
          {(club.shortDescription || club.description) && (
            <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-paper/75">
              {club.shortDescription || club.description}
            </p>
          )}
        </div>

        {/* Footer Metadata & Continuity Strip */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-line/15 pt-4">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-paper/60">
            {hasHistory && club.isCurrentlyActive && (
              <span className="inline-flex items-center gap-1 text-gold-light/90">
                <History className="h-3.5 w-3.5" aria-hidden="true" />
                <span>
                  +{club.historicalYears.length} past{' '}
                  {club.historicalYears.length === 1 ? 'year' : 'years'}
                </span>
              </span>
            )}
            {totalActivities > 0 && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-gold/80" aria-hidden="true" />
                <span>
                  {totalActivities}{' '}
                  {totalActivities === 1 ? 'activity' : 'activities'}
                </span>
              </span>
            )}
            {!hasHistory && totalActivities === 0 && club.foundedAcademicYear && (
              <span>Est. {club.foundedAcademicYear}</span>
            )}
          </div>

          <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold-light transition-transform group-hover:translate-x-0.5">
            <span>Explore</span>
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </div>
    </Link>
  );
}
