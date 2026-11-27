import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { fetchPublishedEvents } from '../lib/publicApi';
import EventCard from '../components/EventCard';
import { LoadingState, EmptyState, ErrorState } from '../components/QueryState';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchPublishedEvents();
      setEvents(list);
    } catch (err) {
      setError(err.message || 'Unable to load published events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(events.map((e) => e.category).filter(Boolean)));
    return ['All', ...unique];
  }, [events]);

  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'All') return events;
    return events.filter((e) => e.category === selectedCategory);
  }, [events, selectedCategory]);

  const featuredEvent = filteredEvents[0];
  const secondaryPair = filteredEvents.slice(1, 3);
  const remainingEvents = filteredEvents.slice(3);

  return (
    <div className="bg-navy text-paper">
      {/* Editorial Header */}
      <section className="border-b border-line/15 bg-navy-deep pt-14 pb-12 sm:pt-18 sm:pb-16">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
                Visual Archive · CSE SRC
              </p>
              <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-paper sm:text-6xl">
                Events
              </h1>
              <p className="mt-3 text-base text-paper/75 sm:text-lg">
                Moments that define us — keynotes, 24-hour builds, student town
                halls, and cultural milestones.
              </p>
            </div>

            {categories.length > 1 && (
              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label="Filter events by category"
              >
                {categories.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setSelectedCategory(cat)}
                      className={`rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                        active
                          ? 'border border-gold/60 bg-maroon text-paper'
                          : 'border border-line/20 bg-navy text-paper/75 hover:border-gold/50 hover:text-gold-light'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Asymmetric Editorial Events Grid */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1320px] space-y-6 px-5 sm:px-8 lg:px-12">
          {loading ? (
            <LoadingState label="Loading events archive..." dark />
          ) : error ? (
            <ErrorState message={error} onRetry={loadEvents} dark />
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              title="No Published Events Yet"
              description="Published SRC events and visual galleries added through the Admin Dashboard will appear here automatically."
              dark
            />
          ) : (
            <>
              {featuredEvent && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                  <div
                    className={
                      secondaryPair.length > 0 ? 'lg:col-span-6' : 'lg:col-span-12'
                    }
                  >
                    <EventCard
                      event={featuredEvent}
                      featured
                      className="h-full"
                    />
                  </div>

                  {secondaryPair.length > 0 && (
                    <div className="grid grid-cols-1 gap-5 lg:col-span-6">
                      {secondaryPair.map((event) => (
                        <EventCard key={event.id || event.slug} event={event} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {remainingEvents.length > 0 && (
                <div className="grid grid-cols-1 gap-5 pt-4 md:grid-cols-2 lg:grid-cols-3">
                  {remainingEvents.map((event) => (
                    <EventCard key={event.id || event.slug} event={event} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
