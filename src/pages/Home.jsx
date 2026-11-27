import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { HOME_DATA } from '../data/home';
import { ANIMATION_CONFIG } from '../animations/animationConfig';
import { fetchCurrentTeamData, fetchFeaturedEvents } from '../lib/publicApi';
import MemberCard from '../components/MemberCard';
import MobileCarousel from '../components/MobileCarousel';
import EventCard from '../components/EventCard';
import { LoadingState, EmptyState, ErrorState } from '../components/QueryState';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Home() {
  const pageRef = useRef(null);

  // Live Supabase state for Current Team preview
  const [teamBatch, setTeamBatch] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamError, setTeamError] = useState('');

  // Live Supabase state for Featured Published Events
  const [featuredEvents, setFeaturedEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState('');

  const loadTeamPreview = useCallback(async () => {
    setTeamLoading(true);
    setTeamError('');
    try {
      const { batch, members } = await fetchCurrentTeamData();
      setTeamBatch(batch);
      setTeamMembers(members);
    } catch (err) {
      setTeamError(err.message || 'Could not load the current SRC team.');
    } finally {
      setTeamLoading(false);
    }
  }, []);

  const loadFeaturedEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError('');
    try {
      const list = await fetchFeaturedEvents(3);
      setFeaturedEvents(list);
    } catch (err) {
      setEventsError(err.message || 'Could not load featured events.');
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeamPreview();
    loadFeaturedEvents();
  }, [loadTeamPreview, loadFeaturedEvents]);

  useGSAP(
    () => {
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
      if (reducedMotion) return;

      const heroTl = gsap.timeline();
      heroTl
        .fromTo(
          '[data-hero-img]',
          { scale: ANIMATION_CONFIG.hero.imageScaleStart, opacity: 0.75 },
          {
            scale: 1,
            opacity: 1,
            duration: ANIMATION_CONFIG.hero.imageDuration,
            ease: 'power2.out',
          },
          0
        )
        .fromTo(
          '[data-hero-stagger]',
          { y: 22, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: ANIMATION_CONFIG.hero.duration,
            stagger: ANIMATION_CONFIG.hero.stagger,
            ease: ANIMATION_CONFIG.hero.ease,
            clearProps: 'transform,opacity',
          },
          0.08
        );

      gsap.utils.toArray('[data-reveal-group]').forEach((group) => {
        const targets = group.querySelectorAll('[data-reveal]');
        if (!targets.length) return;

        gsap.fromTo(
          targets,
          { y: ANIMATION_CONFIG.scrollReveal.yOffset, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: ANIMATION_CONFIG.scrollReveal.duration,
            stagger: ANIMATION_CONFIG.scrollReveal.stagger,
            ease: ANIMATION_CONFIG.scrollReveal.ease,
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: group,
              start: ANIMATION_CONFIG.scrollReveal.startTrigger,
              once: true,
            },
          }
        );
      });
    },
    { scope: pageRef }
  );

  const featuredLead = teamMembers[0] || null;
  const secondaryMembers = teamMembers.slice(1, 4);
  const mobilePreviewMembers = teamMembers.slice(0, 6);

  const primaryEvent = featuredEvents[0] || null;
  const secondaryEvents = featuredEvents.slice(1, 3);

  const pillarToneStyles = {
    navy: 'bg-navy text-paper border-gold/25',
    paper: 'bg-paper text-ink border-line',
    cream: 'bg-cream text-ink border-line',
    maroon: 'bg-maroon text-paper border-maroon-dark',
  };

  return (
    <div ref={pageRef} className="overflow-x-clip">
      {/* ================= SECTION 1: HERO ================= */}
      <section className="relative flex min-h-[calc(100dvh-76px)] items-end bg-navy-dark lg:items-center">
        <div className="absolute inset-0 overflow-hidden">
          <img
            data-hero-img
            src={HOME_DATA.hero.image}
            alt={HOME_DATA.hero.imageAlt}
            className="h-full w-full object-cover object-center will-change-transform"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-navy-dark/96 via-navy/85 to-navy-dark/55"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-navy-dark via-navy-dark/30 to-navy-dark/55"
            aria-hidden="true"
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1320px] px-5 pt-16 pb-14 sm:px-8 lg:px-12 lg:py-24">
          <p
            data-hero-stagger
            className="mb-5 inline-flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-light sm:text-xs"
          >
            <span className="h-[1px] w-7 bg-gold" aria-hidden="true" />
            <span>{HOME_DATA.hero.eyebrow}</span>
          </p>

          <div data-hero-stagger className="max-w-3xl">
            <span className="block font-condensed text-[clamp(4.75rem,15vw,9.5rem)] font-extrabold leading-[0.82] tracking-tight text-paper">
              {HOME_DATA.hero.wordmark}
            </span>
            <h1 className="mt-2 font-display text-[clamp(2.1rem,5.4vw,4.35rem)] font-bold leading-[1.03] tracking-tight text-paper">
              {HOME_DATA.hero.titleLines.map((line) => (
                <span
                  key={line}
                  className={`block ${
                    line === HOME_DATA.hero.accentWord ? 'text-gold' : ''
                  }`}
                >
                  {line}
                </span>
              ))}
            </h1>
          </div>

          <div
            data-hero-stagger
            className="mt-8 flex flex-wrap items-center justify-between gap-6 border-t border-paper/15 pt-7"
          >
            <div className="flex items-center gap-6">
              <p className="font-display text-sm font-medium tracking-[0.16em] uppercase text-paper/85 sm:text-base">
                {HOME_DATA.hero.tagline}
              </p>
            </div>

            <a
              href="#what-is-src"
              aria-label="Scroll to What is SRC"
              className="group inline-flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-paper/75 transition-colors hover:text-gold-light"
            >
              <span className="hidden sm:inline">Scroll to explore</span>
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-paper/35 transition-all duration-300 group-hover:border-gold group-hover:bg-gold group-hover:text-navy-dark">
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* ================= SECTION 2: WHAT IS SRC? ================= */}
      <section
        id="what-is-src"
        data-reveal-group
        className="border-b border-line bg-paper py-20 text-ink sm:py-24 lg:py-32"
      >
        <div className="mx-auto grid max-w-[1320px] grid-cols-1 items-center gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:px-12">
          <div className="lg:col-span-6 space-y-6">
            <p
              data-reveal
              className="text-xs font-semibold uppercase tracking-[0.22em] text-maroon"
            >
              {HOME_DATA.whatIsSrc.eyebrow}
            </p>

            <h2
              data-reveal
              className="font-display text-4xl font-bold leading-[1.04] tracking-tight text-navy sm:text-5xl lg:text-6xl"
            >
              {HOME_DATA.whatIsSrc.headingPrefix}{' '}
              <span className="block text-maroon">
                {HOME_DATA.whatIsSrc.headingAccent}
              </span>
            </h2>

            <p
              data-reveal
              className="text-lg font-medium leading-relaxed text-ink sm:text-xl"
            >
              {HOME_DATA.whatIsSrc.lead}
            </p>

            <div
              data-reveal
              className="space-y-4 text-base leading-relaxed text-ink/75"
            >
              {HOME_DATA.whatIsSrc.paragraphs.map((text, idx) => (
                <p key={idx}>{text}</p>
              ))}
            </div>

            <div
              data-reveal
              className="grid grid-cols-3 gap-4 border-t border-line pt-7"
            >
              {HOME_DATA.whatIsSrc.metrics.map((metric) => (
                <div key={metric.label}>
                  <p className="font-display text-2xl font-bold text-navy sm:text-3xl">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-ink/60">
                    {metric.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div data-reveal className="lg:col-span-6">
            <div className="relative">
              <div
                className="absolute -top-4 -left-3 z-20 h-14 w-16 bg-maroon shadow-md sm:-top-5 sm:-left-5 sm:h-16 sm:w-20"
                aria-hidden="true"
              />
              <div
                className="absolute -right-3 -bottom-3 z-0 h-28 w-28 border-2 border-gold/60 sm:-right-4 sm:-bottom-4"
                aria-hidden="true"
              />

              <div className="relative z-10 aspect-[4/3] overflow-hidden border border-line bg-navy-deep shadow-lg">
                <img
                  src={HOME_DATA.whatIsSrc.image}
                  alt={HOME_DATA.whatIsSrc.imageAlt}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            <div className="relative z-10 mt-5 flex items-center justify-between text-xs text-ink/60">
              <span>Department of CSE · RGUKT RK Valley</span>
              <span className="font-semibold uppercase tracking-[0.16em] text-gold">
                Official Student Body
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION 3: HOW IT STARTED ================= */}
      <section
        data-reveal-group
        className="border-b border-line bg-cream py-20 text-ink sm:py-24 lg:py-32"
      >
        <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-12 px-5 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:px-12">
          <div className="lg:col-span-4 lg:sticky lg:top-28 lg:self-start space-y-5">
            <p
              data-reveal
              className="text-xs font-semibold uppercase tracking-[0.22em] text-maroon"
            >
              {HOME_DATA.howItStarted.eyebrow}
            </p>
            <h2
              data-reveal
              className="font-display text-4xl font-bold leading-[1.06] tracking-tight text-navy sm:text-5xl"
            >
              {HOME_DATA.howItStarted.heading}
            </h2>
            <p
              data-reveal
              className="text-sm leading-relaxed text-ink/75 sm:text-base"
            >
              {HOME_DATA.howItStarted.intro}
            </p>
            <div data-reveal className="pt-2">
              <Link
                to="/vault"
                className="group inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-maroon transition-colors hover:text-navy"
              >
                <span>Explore The Vault Archive</span>
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-8">
            <ol className="relative space-y-0 border-l-2 border-gold/45 pl-7 sm:pl-10">
              {HOME_DATA.howItStarted.milestones.map((item, idx) => (
                <li
                  key={item.title}
                  data-reveal
                  className={`relative ${
                    idx !== HOME_DATA.howItStarted.milestones.length - 1
                      ? 'pb-12'
                      : ''
                  }`}
                >
                  <span
                    className="absolute top-1.5 -left-[35px] flex h-4 w-4 items-center justify-center rounded-full border-2 border-gold bg-paper sm:-left-[47px]"
                    aria-hidden="true"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-maroon" />
                  </span>

                  <div className="rounded-lg border border-line bg-paper p-6 transition-colors hover:border-gold/70 sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-maroon">
                        {item.year}
                      </span>
                      <span className="rounded-sm bg-cream px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-navy/80">
                        {item.tag}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-xl font-bold text-navy sm:text-2xl">
                      {item.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed text-ink/75 sm:text-base">
                      {item.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ================= SECTION 4: PURPOSE & VISION ================= */}
      <section
        data-reveal-group
        className="border-b border-line bg-paper py-20 text-ink sm:py-24 lg:py-32"
      >
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-12">
            <div className="lg:col-span-6 space-y-3">
              <p
                data-reveal
                className="text-xs font-semibold uppercase tracking-[0.22em] text-maroon"
              >
                {HOME_DATA.purposeAndVision.eyebrow}
              </p>
              <h2
                data-reveal
                className="font-display text-4xl font-bold tracking-tight text-navy sm:text-5xl"
              >
                {HOME_DATA.purposeAndVision.heading}
              </h2>
            </div>
            <p
              data-reveal
              className="text-base leading-relaxed text-ink/75 lg:col-span-6 lg:text-lg"
            >
              {HOME_DATA.purposeAndVision.statement}
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {HOME_DATA.purposeAndVision.pillars.map((pillar) => {
              const isDark = pillar.tone === 'navy' || pillar.tone === 'maroon';
              return (
                <article
                  key={pillar.index}
                  data-reveal
                  className={`flex flex-col justify-between rounded-xl border p-7 sm:p-9 ${pillar.span} ${pillarToneStyles[pillar.tone]}`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-display text-xs font-bold tracking-[0.22em] ${
                        isDark ? 'text-gold-light' : 'text-maroon'
                      }`}
                    >
                      {pillar.index}
                    </span>
                    <span
                      className={`h-[2px] w-10 ${
                        isDark ? 'bg-gold/70' : 'bg-gold'
                      }`}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="mt-10">
                    <h3
                      className={`font-display text-2xl font-bold tracking-tight sm:text-3xl ${
                        isDark ? 'text-paper' : 'text-navy'
                      }`}
                    >
                      {pillar.title}
                    </h3>
                    <p
                      className={`mt-3 max-w-xl text-sm leading-relaxed sm:text-base ${
                        isDark ? 'text-paper/80' : 'text-ink/75'
                      }`}
                    >
                      {pillar.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= SECTION 5: MEET OUR TEAM (LIVE SUPABASE) ================= */}
      <section
        data-reveal-group
        className="border-b border-line/15 bg-navy py-20 text-paper sm:py-24 lg:py-32"
      >
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end lg:mb-12">
            <div>
              <p
                data-reveal
                className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light"
              >
                04 —{' '}
                {teamBatch
                  ? `SRC ${teamBatch.academicYear}`
                  : 'CURRENT COUNCIL'}
              </p>
              <h2
                data-reveal
                className="mt-2 font-display text-4xl font-bold tracking-tight text-paper sm:text-5xl"
              >
                Meet Our <span className="text-gold">Team</span>
              </h2>
            </div>

            <Link
              data-reveal
              to="/team"
              className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-light transition-colors hover:text-paper"
            >
              <span>
                View All
                {teamMembers.length > 0 ? ` (${teamMembers.length})` : ''}
              </span>
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>

          {teamLoading ? (
            <LoadingState label="Loading current SRC panel..." dark />
          ) : teamError ? (
            <ErrorState message={teamError} onRetry={loadTeamPreview} dark />
          ) : !featuredLead ? (
            teamBatch ? (
              <div className="space-y-6">
                {teamBatch.teamPhoto && (
                  <div className="overflow-hidden rounded-xl border border-gold/30 bg-navy-deep">
                    <div className="relative aspect-[16/9] max-h-[460px] w-full overflow-hidden bg-navy-dark">
                      <img
                        src={teamBatch.teamPhoto}
                        alt={`${teamBatch.label} SRC Team`}
                        className="h-full w-full object-cover object-top"
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/15 to-transparent"
                        aria-hidden="true"
                      />
                      <div className="absolute right-5 bottom-5 left-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light">
                          Active Panel · {teamBatch.academicYear}
                        </p>
                        <h3 className="mt-1 font-display text-2xl font-bold text-paper">
                          {teamBatch.label}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}
                <EmptyState
                  title={`${teamBatch.label} Is Live — Add Published Members`}
                  description="Your active batch is published. Add members to this batch and set their Publication Status to Published in the Admin Dashboard to populate the interactive member grid."
                  dark
                />
              </div>
            ) : (
              <EmptyState
                title="Current SRC Panel Coming Soon"
                description="No published active batch exists yet. Mark a batch as Current and set its Publication Status to Published in the SRC Admin Dashboard."
                dark
              />
            )
          ) : (
            <>
              {/* Desktop Asymmetric Bento Preview */}
              <div className="hidden grid-cols-12 gap-4 lg:grid lg:auto-rows-[255px]">
                <MemberCard
                  member={featuredLead}
                  variant="featured"
                  className="col-span-5 row-span-2 h-full !min-h-0"
                />

                {secondaryMembers.length > 0 && (
                  <div
                    className={`col-span-7 row-span-1 grid gap-4 ${
                      secondaryMembers.length === 1
                        ? 'grid-cols-1'
                        : secondaryMembers.length === 2
                          ? 'grid-cols-2'
                          : 'grid-cols-3'
                    }`}
                  >
                    {secondaryMembers.map((member) => (
                      <MemberCard
                        key={member.id}
                        member={member}
                        variant="standard"
                        className="h-full !min-h-0"
                      />
                    ))}
                  </div>
                )}

                <div
                  className={`col-span-7 grid grid-cols-12 gap-4 ${
                    secondaryMembers.length > 0 ? 'row-span-1' : 'row-span-2'
                  }`}
                >
                  <div className="col-span-8 flex flex-col justify-between rounded-xl border border-line/15 bg-navy-deep p-6">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light">
                      Interactive Panel
                    </p>
                    <div>
                      <p className="font-display text-lg font-semibold leading-snug text-paper">
                        Select any council member to launch their editorial
                        introduction.
                      </p>
                      <p className="mt-1.5 text-xs text-paper/60">
                        Representing E1 through E4 across technical, cultural,
                        administrative, and student welfare portfolios.
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/team"
                    aria-label="Explore complete SRC team"
                    className="group col-span-4 flex flex-col justify-between rounded-xl bg-maroon p-6 text-paper transition-colors duration-300 hover:bg-gold hover:text-navy-dark"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.18em] opacity-85">
                      Full Panel
                    </span>
                    <div className="flex items-end justify-between">
                      <span className="font-display text-2xl font-bold">
                        {teamMembers.length}
                      </span>
                      <ArrowRight
                        className="h-7 w-7 transition-transform duration-300 group-hover:translate-x-1.5"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </div>
              </div>

              {/* Mobile Horizontal Carousel (< 1024px) */}
              <MobileCarousel members={mobilePreviewMembers} />
            </>
          )}
        </div>
      </section>

      {/* ================= SECTION 6: FEATURED EVENTS (LIVE SUPABASE) ================= */}
      <section
        data-reveal-group
        className="bg-navy-deep py-20 text-paper sm:py-24 lg:py-28"
      >
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end lg:mb-12">
            <div>
              <p
                data-reveal
                className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light"
              >
                05 — HIGHLIGHTS
              </p>
              <h2
                data-reveal
                className="mt-2 font-display text-4xl font-bold tracking-tight text-paper sm:text-5xl"
              >
                Featured <span className="text-gold">Events</span>
              </h2>
            </div>

            <Link
              data-reveal
              to="/events"
              className="group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-light transition-colors hover:text-paper"
            >
              <span>Explore Events Archive</span>
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>

          {eventsLoading ? (
            <LoadingState label="Loading featured events..." dark />
          ) : eventsError ? (
            <ErrorState message={eventsError} onRetry={loadFeaturedEvents} dark />
          ) : !primaryEvent ? (
            <EmptyState
              title="No Published Events Yet"
              description="Featured and upcoming SRC events published in Supabase will appear here automatically."
              dark
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              <div
                className={
                  secondaryEvents.length > 0 ? 'lg:col-span-6' : 'lg:col-span-12'
                }
              >
                <EventCard event={primaryEvent} featured className="h-full" />
              </div>

              {secondaryEvents.length > 0 && (
                <div className="grid grid-cols-1 gap-5 lg:col-span-6">
                  {secondaryEvents.map((ev) => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
