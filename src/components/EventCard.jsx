import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar } from 'lucide-react';

export default function EventCard({ event, featured = false, className = '' }) {
  return (
    <Link
      to={`/events/${event.slug}`}
      className={`group relative flex flex-col justify-end overflow-hidden rounded-xl border bg-navy-deep text-left transition-all duration-300 ${
        featured
          ? 'min-h-[430px] lg:min-h-[560px] border-gold/55 hover:border-gold'
          : 'min-h-[260px] lg:min-h-[270px] border-line/15 hover:border-gold/70'
      } ${className}`}
    >
      {/* Cover Photography */}
      <div className="absolute inset-0 overflow-hidden bg-navy-dark">
        <img
          src={event.coverImage}
          alt={event.title}
          loading={featured ? 'eager' : 'lazy'}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
        <div
          className={`absolute inset-0 ${
            featured
              ? 'bg-gradient-to-t from-navy-dark/95 via-navy-dark/45 to-navy-dark/15'
              : 'bg-gradient-to-t from-navy-dark/95 via-navy-dark/55 to-navy-dark/20'
          }`}
          aria-hidden="true"
        />
      </div>

      {/* Category & Date Top Meta */}
      <div className="relative z-10 mb-auto flex flex-wrap items-center justify-between gap-2 p-5 sm:p-6">
        <span className="rounded-sm bg-maroon/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-paper">
          {event.category}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-sm border border-paper/20 bg-navy-dark/70 px-2.5 py-1 text-[11px] font-medium text-paper/85 backdrop-blur-xs">
          <Calendar className="h-3 w-3 text-gold-light" aria-hidden="true" />
          <span>{event.date}</span>
        </span>
      </div>

      {/* Editorial Title & CTA */}
      <div className="relative z-10 p-5 sm:p-6 lg:p-7">
        <h3
          className={`font-display font-bold tracking-tight text-paper ${
            featured ? 'text-2xl sm:text-3xl lg:text-4xl' : 'text-xl sm:text-2xl'
          }`}
        >
          {event.title}
        </h3>
        <p
          className={`mt-2 line-clamp-2 text-paper/75 ${
            featured ? 'max-w-md text-sm sm:text-base' : 'text-xs sm:text-sm'
          }`}
        >
          {event.subtitle}
        </p>

        <div className="mt-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold-light transition-colors group-hover:text-paper">
          <span>View Details</span>
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}
