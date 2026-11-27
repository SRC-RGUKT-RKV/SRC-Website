import React, { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { X, Mail, CheckCircle2, ArrowUpRight, Award } from 'lucide-react';
import { useMemberIntro } from '../context/MemberIntroContext';
import { getDesignationHalves } from '../lib/publicApi';
import { ANIMATION_CONFIG } from '../animations/animationConfig';
import {
  preloadMemberImage,
  buildDesktopMemberTimeline,
  buildMobileMemberTimeline,
  buildReducedMotionTimeline,
} from '../animations/memberTimeline';

/**
 * Reusable Signature Cinematic Member Introduction Overlay.
 * Choreographed via GSAP matchMedia():
 *  - Desktop (>= 1024px): Circular expansion -> split designation opposite entrance ->
 *    physical per-letter collision & compression -> pushing + spring-back -> portrait emergence on right.
 *  - Mobile (< 1024px): Circular expansion -> portrait reveal + foreground designation drop
 *    to bottom edge -> authored bounce keyframes settling underneath portrait.
 *  - Reduced Motion: Clean short crossfade straight to Council Navy editorial layout.
 */
export default function MemberIntroduction() {
  const { activeSession, clearSession, isAnimatingRef } = useMemberIntro();
  const [imgError, setImgError] = useState(false);

  const rootRef = useRef(null);
  const circleRef = useRef(null);
  const backdropRef = useRef(null);
  const contentRef = useRef(null);
  const closeBtnRef = useRef(null);

  // Desktop refs
  const desktopDesignationRef = useRef(null);
  const leftHalfRef = useRef(null);
  const rightHalfRef = useRef(null);
  const desktopPhotoRef = useRef(null);

  // Mobile refs
  const mobilePhotoRef = useRef(null);
  const mobileDesignationRef = useRef(null);

  // Active GSAP timeline & matchMedia cleanup handles
  const timelineRef = useRef(null);
  const matchMediaRef = useRef(null);
  const isClosingRef = useRef(false);
  const closedViaPopstateRef = useRef(false);

  const member = activeSession?.member || null;
  const origin = activeSession?.origin || null;

  useEffect(() => {
    setImgError(false);
  }, [activeSession?.sessionId]);

  // Reverse GSAP timeline cleanly and restore scroll/history
  const handleClose = useCallback(
    (fromPopstate = false) => {
      if (!activeSession || isClosingRef.current) return;
      isClosingRef.current = true;
      isAnimatingRef.current = true;
      closedViaPopstateRef.current = fromPopstate;

      const tl = timelineRef.current;

      const finishClose = () => {
        document.body.classList.remove('intro-locked');
        if (matchMediaRef.current) {
          matchMediaRef.current.revert();
          matchMediaRef.current = null;
        }
        timelineRef.current = null;
        isClosingRef.current = false;

        // If closed via button or Escape (not browser back), pop the synthetic history entry
        if (
          !closedViaPopstateRef.current &&
          window.history.state &&
          window.history.state.srcMemberIntro
        ) {
          try {
            window.history.back();
          } catch {
            // Ignore history restrictions
          }
        }

        clearSession();
      };

      if (tl) {
        // Snappy reverse dismissal across both desktop & mobile timelines
        tl.timeScale(2.1);
        tl.eventCallback('onReverseComplete', finishClose);
        tl.reverse();
      } else {
        finishClose();
      }
    },
    [activeSession, clearSession, isAnimatingRef]
  );

  // Launch preloaded GSAP matchMedia choreography whenever a session opens
  useEffect(() => {
    if (!activeSession || !member || !origin) return;

    let cancelled = false;
    isClosingRef.current = false;
    isAnimatingRef.current = true;
    document.body.classList.add('intro-locked');

    const startChoreography = async () => {
      // Preload & decode portrait before starting the reveal
      await preloadMemberImage(member.image);
      if (cancelled) return;

      const mm = gsap.matchMedia();
      matchMediaRef.current = mm;

      const collectRefs = (isDesktopLayout) => {
        const root = rootRef.current;
        if (!root) return null;
        const activeContainer = root.querySelector(
          isDesktopLayout ? '[data-desktop-layout]' : '[data-mobile-layout]'
        );
        return {
          circleEl: circleRef.current,
          backdropEl: backdropRef.current,
          contentEl: contentRef.current,
          closeBtnEl: closeBtnRef.current,
          desktopDesignationEl: desktopDesignationRef.current,
          leftHalfEl: leftHalfRef.current,
          rightHalfEl: rightHalfRef.current,
          leftLetters: Array.from(
            leftHalfRef.current?.querySelectorAll('[data-letter]') || []
          ),
          rightLetters: Array.from(
            rightHalfRef.current?.querySelectorAll('[data-letter]') || []
          ),
          desktopPhotoEl: desktopPhotoRef.current,
          mobilePhotoEl: mobilePhotoRef.current,
          mobileDesignationEl: mobileDesignationRef.current,
          infoItems: Array.from(
            (activeContainer || root).querySelectorAll('[data-intro-info]')
          ),
        };
      };

      const bp = ANIMATION_CONFIG.desktopMinWidth;

      mm.add(
        {
          isDesktop: `(min-width: ${bp}px) and (prefers-reduced-motion: no-preference)`,
          isMobile: `(max-width: ${bp - 1}px) and (prefers-reduced-motion: no-preference)`,
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { isDesktop, reduceMotion } = context.conditions;
          const isDesktopViewport = window.innerWidth >= bp;
          const refs = collectRefs(isDesktopViewport);
          if (!refs) return;

          let tl;
          if (reduceMotion) {
            tl = buildReducedMotionTimeline(refs);
          } else if (isDesktop) {
            tl = buildDesktopMemberTimeline(refs, origin);
          } else {
            tl = buildMobileMemberTimeline(refs, origin);
          }

          timelineRef.current = tl;

          tl.eventCallback('onComplete', () => {
            isAnimatingRef.current = false;
            closeBtnRef.current?.focus({ preventScroll: true });
          });

          tl.play(0);

          return () => {
            tl.kill();
          };
        }
      );
    };

    // Wait a frame so DOM refs have accurate layout geometry before measuring
    const rafId = requestAnimationFrame(() => {
      startChoreography();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      document.body.classList.remove('intro-locked');
      if (matchMediaRef.current) {
        matchMediaRef.current.revert();
        matchMediaRef.current = null;
      }
      timelineRef.current = null;
      isAnimatingRef.current = false;
    };
  }, [activeSession, member, origin, isAnimatingRef]);

  // Escape key & browser Back (popstate) handlers
  useEffect(() => {
    if (!activeSession) return;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose(false);
      }
    };

    const onPopState = () => {
      handleClose(true);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('popstate', onPopState);
    };
  }, [activeSession, handleClose]);

  if (!activeSession || !member) return null;

  const [leftHalf, rightHalf] = getDesignationHalves(member);
  const fullDesignation = (member.role || '').toUpperCase();
  const socialList = Array.isArray(member.socialLinks)
    ? member.socialLinks.filter((s) => Boolean(s?.url))
    : Object.entries(member.socials || {})
        .filter(([, url]) => Boolean(url))
        .map(([label, url]) => ({ id: label, label, url }));
  const memberAchievements = Array.isArray(member.achievements)
    ? member.achievements
    : [];

  // Determine if leftHalf and rightHalf are two separate words (add small visual space) or one split word (e.g. PRESI|DENT)
  const isSingleWordSplit =
    `${leftHalf}${rightHalf}` === fullDesignation.replace(/\s+/g, '');

  const renderLetters = (text, colorClass) =>
    text.split('').map((char, idx) => (
      <span
        key={`${char}-${idx}`}
        data-letter
        aria-hidden="true"
        className={`inline-block will-change-transform ${colorClass}`}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ));

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`${member.name} — ${member.role}`}
      className="fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden"
    >
      {/* 1. Circular Scale Reveal Element (GPU transform: scale() only) */}
      <div
        ref={circleRef}
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-0 h-[100px] w-[100px] rounded-full will-change-transform"
        style={{ backgroundColor: '#0b121e' }}
      />

      {/* 2. Solid Council Navy Final Background */}
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="fixed inset-0 bg-navy opacity-0"
      >
        {/* Subtle editorial radial depth behind portrait */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_45%,rgba(217,181,113,0.12),transparent_52%)]" />
      </div>

      {/* 3. Foreground Content Layer */}
      <div
        ref={contentRef}
        className="relative z-10 flex h-[100dvh] w-full flex-col overflow-y-auto opacity-0"
      >
        {/* Top Minimal Overlay Header */}
        <div className="mx-auto flex w-full max-w-[1320px] shrink-0 items-center justify-between px-5 pt-5 pb-3 sm:px-8 lg:px-12 lg:pt-8">
          <div className="inline-flex items-baseline gap-0.5 font-display text-xl font-bold tracking-tight text-paper/90">
            <span>SRC</span>
            <span className="text-gold">/</span>
            <span className="ml-3 hidden text-xs font-medium uppercase tracking-[0.2em] text-gold-light/80 sm:inline">
              {member.term}
            </span>
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={() => handleClose(false)}
            aria-label="Close member introduction"
            className="src-btn-outline-gold inline-flex h-11 w-11 items-center justify-center rounded-full bg-navy-deep/70 text-paper"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* ================= DESKTOP EDITORIAL COMPOSITION (>= 1024px) ================= */}
        <div data-desktop-layout className="mx-auto hidden w-full max-w-[1320px] flex-1 grid-cols-12 items-center gap-10 px-12 pb-12 lg:grid">
          {/* Left Column: Split Designation + Member Details */}
          <div className="col-span-7 flex flex-col justify-center">
            {/* Split Animated Designation */}
            <h2
              ref={desktopDesignationRef}
              aria-label={fullDesignation}
              className={`flex flex-nowrap items-baseline whitespace-nowrap font-condensed font-extrabold uppercase leading-[0.94] tracking-tight select-none ${
                fullDesignation.length > 15
                  ? 'text-[clamp(2.8rem,4.5vw,4.5rem)]'
                  : 'text-[clamp(4rem,6.6vw,6.4rem)]'
              }`}
            >
              <span
                ref={leftHalfRef}
                aria-hidden="true"
                className="inline-flex will-change-transform"
              >
                {renderLetters(leftHalf, 'text-paper')}
              </span>
              {!isSingleWordSplit && (
                <span aria-hidden="true" className="inline-block w-3" />
              )}
              <span
                ref={rightHalfRef}
                aria-hidden="true"
                className="inline-flex will-change-transform"
              >
                {renderLetters(rightHalf, 'text-gold')}
              </span>
            </h2>

            {/* Name & Department */}
            <div data-intro-info className="mt-5">
              <p className="font-display text-3xl font-bold tracking-tight text-paper xl:text-4xl">
                {member.name}
              </p>
              <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
                {member.dept} · {member.area}
              </p>
            </div>

            {/* Gold Accent Divider */}
            <div
              data-intro-info
              className="my-6 h-[2px] w-16 bg-gold"
              aria-hidden="true"
            />

            {/* About */}
            <p
              data-intro-info
              className="max-w-xl text-base leading-relaxed text-paper/80"
            >
              {member.about}
            </p>

            {/* Responsibilities */}
            {member.responsibilities && member.responsibilities.length > 0 && (
              <div data-intro-info className="mt-6 max-w-xl space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light">
                  Key Responsibilities
                </p>
                <ul className="space-y-1.5">
                  {member.responsibilities.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 text-sm text-paper/75"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Achievements (when present from Supabase) */}
            {memberAchievements.length > 0 && (
              <div data-intro-info className="mt-5 max-w-xl space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light">
                  Achievements
                </p>
                <ul className="space-y-1.5">
                  {memberAchievements.map((ach) => (
                    <li
                      key={ach.id || ach.title}
                      className="flex items-start gap-2.5 text-sm text-paper/80"
                    >
                      <Award
                        className="mt-0.5 h-4 w-4 shrink-0 text-gold-light"
                        aria-hidden="true"
                      />
                      <span>{ach.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Contact & Optional Social Links */}
            <div
              data-intro-info
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              {member.email && (
                <a
                  href={`mailto:${member.email}`}
                  className="src-btn-outline-gold inline-flex items-center gap-2 rounded-md bg-navy-deep/70 px-4 py-2 text-xs font-medium tracking-wide text-paper"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{member.email}</span>
                </a>
              )}
              {socialList.map((social) => (
                <a
                  key={social.id || social.url}
                  href={social.url}
                  target="_blank"
                  rel="noreferrer"
                  className="src-btn-outline-subtle inline-flex items-center gap-1 rounded-md px-3.5 py-2 text-xs font-medium capitalize"
                >
                  <span>{social.label}</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Right Column: Large Dramatic Member Portrait */}
          <div className="col-span-5 flex items-center justify-end">
            <div
              ref={desktopPhotoRef}
              className="relative aspect-[3/4] w-full max-w-[440px] overflow-hidden rounded-xl border border-gold/30 bg-navy-deep shadow-2xl will-change-transform"
            >
              {!imgError && member.image ? (
                <img
                  src={member.image}
                  alt={member.name}
                  className="h-full w-full object-cover object-top"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-navy-deep font-display text-6xl font-bold text-gold-light">
                  {member.name.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-navy via-navy/35 to-transparent"
                aria-hidden="true"
              />
              {member.quote && (
                <p className="absolute right-5 bottom-4 left-5 text-xs italic text-paper/80">
                  “{member.quote}”
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ================= MOBILE EDITORIAL COMPOSITION (< 1024px) ================= */}
        <div data-mobile-layout className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-5 pt-2 pb-12 lg:hidden">
          {/* Central Prominent Portrait */}
          <div
            ref={mobilePhotoRef}
            className="relative z-10 aspect-[3/4] w-[72vw] max-w-[290px] overflow-hidden rounded-xl border border-gold/35 bg-navy-deep shadow-xl will-change-transform"
          >
            {!imgError && member.image ? (
              <img
                src={member.image}
                alt={member.name}
                className="h-full w-full object-cover object-top"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-5xl font-bold text-gold-light">
                {member.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          {/* Foreground Animated Designation — falls over photo to bottom edge, bounces back to settle HERE */}
          <h2
            ref={mobileDesignationRef}
            aria-label={fullDesignation}
            className="relative z-30 mt-5 text-center font-condensed text-[clamp(2.5rem,11vw,3.6rem)] font-extrabold uppercase leading-[0.95] tracking-tight will-change-transform select-none"
          >
            <span aria-hidden="true" className="text-paper">
              {leftHalf}
            </span>
            {!isSingleWordSplit && <span aria-hidden="true"> </span>}
            <span aria-hidden="true" className="text-gold">
              {rightHalf}
            </span>
          </h2>

          {/* Member Details Below Settled Designation */}
          <div className="relative z-20 mt-4 w-full space-y-5 text-center">
            <div data-intro-info>
              <p className="font-display text-2xl font-bold text-paper">
                {member.name}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
                {member.dept} · {member.area}
              </p>
            </div>

            <div
              data-intro-info
              className="mx-auto h-[2px] w-12 bg-gold"
              aria-hidden="true"
            />

            <p
              data-intro-info
              className="text-sm leading-relaxed text-paper/80"
            >
              {member.about}
            </p>

            {member.responsibilities && member.responsibilities.length > 0 && (
              <div
                data-intro-info
                className="rounded-lg border border-line/15 bg-navy-deep/60 p-4 text-left"
              >
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-light">
                  Responsibilities
                </p>
                <ul className="space-y-2">
                  {member.responsibilities.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-xs leading-relaxed text-paper/80"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold"
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {memberAchievements.length > 0 && (
              <div
                data-intro-info
                className="rounded-lg border border-line/15 bg-navy-deep/60 p-4 text-left"
              >
                <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-light">
                  Achievements
                </p>
                <ul className="space-y-2">
                  {memberAchievements.map((ach) => (
                    <li
                      key={ach.id || ach.title}
                      className="flex items-start gap-2 text-xs leading-relaxed text-paper/80"
                    >
                      <Award
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-light"
                        aria-hidden="true"
                      />
                      <span>{ach.title}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(member.email || socialList.length > 0) && (
              <div
                data-intro-info
                className="flex flex-wrap items-center justify-center gap-2.5 pt-1"
              >
                {member.email && (
                  <a
                    href={`mailto:${member.email}`}
                    className="inline-flex items-center gap-2 rounded-md border border-gold/40 bg-navy-deep/80 px-4 py-2.5 text-xs font-medium text-paper"
                  >
                    <Mail className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                    <span>{member.email}</span>
                  </a>
                )}
                {socialList.map((social) => (
                  <a
                    key={social.id || social.url}
                    href={social.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-paper/20 px-3 py-2 text-xs font-medium capitalize text-paper/85"
                  >
                    <span>{social.label}</span>
                    <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
