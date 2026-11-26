import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import MemberCard from './MemberCard';

/**
 * Horizontal CSS scroll-snap carousel for mobile & tablet viewports (< 1024px).
 * Supports natural touch swiping without hijacking vertical scroll, plus progress bar & pagination.
 */
export default function MobileCarousel({ members = [] }) {
  const scrollerRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || members.length === 0) return;

    const firstCard = el.querySelector('[data-carousel-item]');
    if (!firstCard) return;

    const cardWidth = firstCard.getBoundingClientRect().width + 16; // card + gap-4 (16px)
    const idx = Math.round(el.scrollLeft / cardWidth);
    setActiveIndex(Math.max(0, Math.min(members.length - 1, idx)));
  }, [members.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const scrollToIndex = (targetIdx) => {
    const el = scrollerRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(members.length - 1, targetIdx));
    const card = el.querySelectorAll('[data-carousel-item]')[clamped];
    if (card) {
      card.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  };

  const progress =
    members.length > 0 ? ((activeIndex + 1) / members.length) * 100 : 0;

  return (
    <div className="lg:hidden">
      {/* Scroll-snap horizontal track */}
      <div
        ref={scrollerRef}
        className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:px-8"
        style={{
          touchAction: 'pan-x pan-y',
          WebkitOverflowScrolling: 'touch',
        }}
        role="region"
        aria-label="SRC Team Members Carousel"
      >
        {members.map((member) => (
          <div
            key={member.id}
            data-carousel-item
            className="w-[82vw] max-w-[340px] shrink-0 snap-center sm:w-[320px]"
          >
            <MemberCard
              member={member}
              variant="featured"
              className="!min-h-[410px]"
            />
          </div>
        ))}
      </div>

      {/* Pagination & Progress Controls */}
      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-display text-xs font-semibold tracking-[0.16em] text-gold-light">
            {String(activeIndex + 1).padStart(2, '0')} /{' '}
            {String(members.length).padStart(2, '0')}
          </span>
          <div
            className="h-[3px] w-28 overflow-hidden rounded-full bg-paper/15 sm:w-40"
            aria-hidden="true"
          >
            <div
              className="h-full rounded-full bg-gold transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex - 1)}
            disabled={activeIndex === 0}
            aria-label="Previous member"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line/25 text-paper transition-colors hover:border-gold hover:text-gold-light disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scrollToIndex(activeIndex + 1)}
            disabled={activeIndex === members.length - 1}
            aria-label="Next member"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line/25 text-paper transition-colors hover:border-gold hover:text-gold-light disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-paper/45">
        Swipe to explore · Tap card to view introduction
      </p>
    </div>
  );
}
