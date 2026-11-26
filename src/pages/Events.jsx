import React, { useState, useMemo } from 'react';
import { eventsData } from '../data/events';
import EventCard from '../components/EventCard';

export default function Events() {
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => {
    const unique = Array.from(new Set(eventsData.map((e) => e.category)));
    return ['All', ...unique];
  }, []);

  const filteredEvents = useMemo(() => {
    if (selectedCategory === 'All') return eventsData;
    return eventsData.filter((e) => e.category === selectedCategory);
  }, [selectedCategory]);

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

            {/* Category Filter Pills */}
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
                        ? 'bg-maroon text-paper border border-gold/60'
                        : 'border border-line/20 bg-navy text-paper/75 hover:border-gold/50 hover:text-gold-light'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Asymmetric Editorial Events Grid */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1320px] space-y-6 px-5 sm:px-8 lg:px-12">
          {featuredEvent && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Large Tall Featured Event Card (Left) */}
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

              {/* Stacked Secondary Event Cards (Right) */}
              {secondaryPair.length > 0 && (
                <div className="grid grid-cols-1 gap-5 lg:col-span-6">
                  {secondaryPair.map((event) => (
                    <EventCard key={event.slug} event={event} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Remaining Archived Events */}
          {remainingEvents.length > 0 && (
            <div className="grid grid-cols-1 gap-5 pt-4 md:grid-cols-2 lg:grid-cols-3">
              {remainingEvents.map((event) => (
                <EventCard key={event.slug} event={event} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
