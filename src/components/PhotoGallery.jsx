import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

/**
 * Lazy-loaded editorial photo gallery with accessible lightbox:
 * - Next/previous keyboard & button navigation
 * - Escape key closing
 * - Mobile horizontal touch swipe gestures
 */
export default function PhotoGallery({ images = [], eventTitle = 'Event' }) {
  const [activeIdx, setActiveIdx] = useState(null);
  const touchStartX = useRef(0);
  const closeBtnRef = useRef(null);

  const isOpen = activeIdx !== null;

  const goNext = useCallback(() => {
    setActiveIdx((prev) =>
      prev === null ? null : (prev + 1) % images.length
    );
  }, [images.length]);

  const goPrev = useCallback(() => {
    setActiveIdx((prev) =>
      prev === null ? null : (prev - 1 + images.length) % images.length
    );
  }, [images.length]);

  const closeLightbox = useCallback(() => {
    setActiveIdx(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    closeBtnRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, closeLightbox, goNext, goPrev]);

  if (!images || images.length === 0) return null;

  const handleTouchStart = (e) => {
    touchStartX.current = e.changedTouches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  const currentItem = isOpen ? images[activeIdx] : null;

  return (
    <div>
      {/* Editorial Asymmetric Thumbnail Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((item, idx) => (
          <button
            key={`${item.src}-${idx}`}
            type="button"
            onClick={() => setActiveIdx(idx)}
            aria-label={`Open photo ${idx + 1} of ${images.length}: ${item.caption || eventTitle}`}
            className={`group relative overflow-hidden rounded-xl border border-line/15 bg-navy-deep text-left transition-colors hover:border-gold/70 ${
              idx === 0 && images.length >= 3
                ? 'sm:col-span-2 aspect-[16/10]'
                : 'aspect-[4/3]'
            }`}
          >
            <img
              src={item.src}
              alt={item.caption || `${eventTitle} photo ${idx + 1}`}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-navy-dark/80 via-transparent to-transparent opacity-80 transition-opacity group-hover:opacity-100" />
            <span className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-paper/25 bg-navy-dark/65 text-paper opacity-0 transition-opacity group-hover:opacity-100">
              <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            {item.caption && (
              <p className="absolute right-4 bottom-3 left-4 truncate text-xs text-paper/90">
                {item.caption}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox Dialog */}
      {isOpen && currentItem && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${eventTitle} image lightbox`}
          className="fixed inset-0 z-[110] flex flex-col justify-between bg-navy-dark/96 p-4 backdrop-blur-md sm:p-8"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Top Bar */}
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
            <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
              {String(activeIdx + 1).padStart(2, '0')} /{' '}
              {String(images.length).padStart(2, '0')}
            </span>

            <button
              ref={closeBtnRef}
              type="button"
              onClick={closeLightbox}
              aria-label="Close lightbox"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-paper/25 text-paper transition-colors hover:border-gold hover:bg-gold hover:text-navy-dark"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Active Image */}
          <div className="relative mx-auto my-4 flex w-full max-w-5xl flex-1 items-center justify-center">
            {images.length > 1 && (
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous photo"
                className="absolute left-0 z-10 hidden h-12 w-12 items-center justify-center rounded-full border border-paper/20 bg-navy/80 text-paper transition-colors hover:border-gold hover:text-gold-light sm:flex"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
            )}

            <figure className="flex max-h-[75dvh] flex-col items-center">
              <img
                src={currentItem.src}
                alt={currentItem.caption || eventTitle}
                className="max-h-[68dvh] max-w-full rounded-lg border border-gold/25 object-contain shadow-2xl"
              />
              {currentItem.caption && (
                <figcaption className="mt-4 max-w-xl text-center text-sm text-paper/80">
                  {currentItem.caption}
                </figcaption>
              )}
            </figure>

            {images.length > 1 && (
              <button
                type="button"
                onClick={goNext}
                aria-label="Next photo"
                className="absolute right-0 z-10 hidden h-12 w-12 items-center justify-center rounded-full border border-paper/20 bg-navy/80 text-paper transition-colors hover:border-gold hover:text-gold-light sm:flex"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Mobile Controls */}
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-4 sm:hidden">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous photo"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-paper/25 text-paper"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <span className="text-[11px] uppercase tracking-[0.18em] text-paper/55">
                Swipe or tap
              </span>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next photo"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-paper/25 text-paper"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
