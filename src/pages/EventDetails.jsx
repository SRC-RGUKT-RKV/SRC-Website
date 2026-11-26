import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  CheckCircle2,
  Play,
} from 'lucide-react';
import { eventsData } from '../data/events';
import PhotoGallery from '../components/PhotoGallery';

export default function EventDetails() {
  const { slug } = useParams();
  const event = eventsData.find((e) => e.slug === slug);

  if (!event) {
    return (
      <div className="flex min-h-[65dvh] flex-col items-center justify-center bg-navy px-5 text-center text-paper">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
          Archive Entry Missing
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold">
          Event Not Found
        </h1>
        <Link
          to="/events"
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-maroon px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-paper hover:bg-gold hover:text-navy-dark"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Events</span>
        </Link>
      </div>
    );
  }

  const hasVideos = Array.isArray(event.videos) && event.videos.length > 0;
  const hasLinks = Array.isArray(event.links) && event.links.length > 0;

  return (
    <article className="bg-navy text-paper">
      {/* Top Breadcrumb & Title */}
      <section className="border-b border-line/15 bg-navy-deep pt-12 pb-12 sm:pt-16">
        <div className="mx-auto max-w-[1180px] px-5 sm:px-8 lg:px-12">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-light transition-colors hover:text-paper"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to Events</span>
          </Link>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <span className="rounded-sm bg-maroon px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-paper">
              {event.category}
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-paper/75">
              <Calendar className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
              <span>{event.date}</span>
            </span>
          </div>

          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold leading-[1.04] tracking-tight text-paper sm:text-5xl lg:text-6xl">
            {event.title}
          </h1>

          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-paper/75">
            {event.subtitle}
          </p>
        </div>
      </section>

      {/* Cover Image & Editorial Overview */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-[1180px] space-y-14 px-5 sm:px-8 lg:px-12">
          {/* Large Cover Frame */}
          <div className="aspect-[16/9] overflow-hidden rounded-xl border border-gold/30 bg-navy-deep shadow-2xl">
            <img
              src={event.coverImage}
              alt={event.title}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Description + Highlights Split */}
          <div className="grid grid-cols-1 gap-10 border-b border-line/15 pb-14 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
                Overview
              </p>
              <p className="text-base leading-relaxed text-paper/85 sm:text-lg">
                {event.description}
              </p>
            </div>

            {event.highlights && event.highlights.length > 0 && (
              <div className="lg:col-span-5 rounded-xl border border-line/15 bg-navy-deep p-6">
                <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
                  Key Highlights
                </p>
                <ul className="space-y-3">
                  {event.highlights.map((point, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-paper/80"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                        aria-hidden="true"
                      />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Photo Gallery with Lightbox */}
          {event.gallery && event.gallery.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
                    Photography
                  </p>
                  <h2 className="mt-1 font-display text-2xl font-bold text-paper sm:text-3xl">
                    Event Gallery
                  </h2>
                </div>
                <p className="text-xs text-paper/55">
                  Click any photo to inspect
                </p>
              </div>
              <PhotoGallery images={event.gallery} eventTitle={event.title} />
            </div>
          )}

          {/* Videos Section — ONLY shown when actually provided */}
          {hasVideos && (
            <div className="space-y-6 border-t border-line/15 pt-12">
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-gold" aria-hidden="true" />
                <h2 className="font-display text-2xl font-bold text-paper">
                  Event Recordings
                </h2>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {event.videos.map((video, idx) => (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-xl border border-line/15 bg-navy-deep"
                  >
                    <div className="aspect-video">
                      <iframe
                        src={video.embedUrl}
                        title={video.title || `${event.title} Video ${idx + 1}`}
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="h-full w-full border-0"
                      />
                    </div>
                    {video.title && (
                      <p className="p-4 text-sm font-medium text-paper/85">
                        {video.title}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* External Links — ONLY shown when actually provided */}
          {hasLinks && (
            <div className="space-y-4 border-t border-line/15 pt-12">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
                Related Resources
              </p>
              <div className="flex flex-wrap gap-3">
                {event.links.map((linkItem) => (
                  <a
                    key={linkItem.label}
                    href={linkItem.url}
                    target={linkItem.url.startsWith('http') ? '_blank' : undefined}
                    rel={linkItem.url.startsWith('http') ? 'noreferrer' : undefined}
                    className="inline-flex items-center gap-2 rounded-md border border-gold/45 bg-navy-deep px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-paper transition-colors hover:border-gold hover:bg-gold hover:text-navy-dark"
                  >
                    <span>{linkItem.label}</span>
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </article>
  );
}
