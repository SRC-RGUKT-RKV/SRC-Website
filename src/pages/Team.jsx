import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { currentTeam, CURRENT_TERM } from '../data/team';
import BentoGrid from '../components/BentoGrid';
import MobileCarousel from '../components/MobileCarousel';

export default function Team() {
  return (
    <div className="bg-navy text-paper">
      {/* Editorial Page Header */}
      <section className="border-b border-line/15 bg-navy-deep pt-14 pb-12 sm:pt-18 sm:pb-16 lg:pt-22">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
                {CURRENT_TERM} · Department of CSE
              </p>
              <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-paper sm:text-6xl">
                The <span className="text-gold">Council</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-paper/75 sm:text-lg">
                Meet the elected representatives leading student affairs,
                technical programs, and batch communication. Click any member to
                experience their introduction.
              </p>
            </div>

            <div className="flex items-center gap-4 border-t border-line/15 pt-4 lg:border-t-0 lg:pt-0">
              <div className="text-left lg:text-right">
                <p className="font-display text-3xl font-bold text-gold-light">
                  {String(currentTeam.length).padStart(2, '0')}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
                  Active Members
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Panel Showcase */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          {/* Desktop Asymmetric Bento Grid (>= 1024px) */}
          <BentoGrid members={currentTeam} />

          {/* Mobile & Tablet Horizontal Scroll-Snap Carousel (< 1024px) */}
          <MobileCarousel members={currentTeam} />

          {/* Link to Historical Archive */}
          <div className="mt-16 flex flex-col items-start justify-between gap-5 rounded-xl border border-gold/25 bg-navy-deep p-6 sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
                Looking for past panels?
              </p>
              <p className="mt-1 font-display text-xl font-bold text-paper">
                Historical SRC teams are preserved separately in The Vault.
              </p>
            </div>
            <Link
              to="/vault"
              className="group inline-flex shrink-0 items-center gap-2 rounded-md bg-maroon px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-gold hover:text-navy-dark"
            >
              <span>Open The Vault</span>
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
