import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, ArrowUpRight } from 'lucide-react';
import { SITE_CONFIG } from '../data/site';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gold/25 bg-navy-deep text-paper">
      <div className="mx-auto max-w-[1320px] px-5 py-16 sm:px-8 lg:px-12 lg:py-20">
        {/* Top Editorial Row */}
        <div className="grid grid-cols-1 gap-12 border-b border-line/15 pb-12 md:grid-cols-12">
          {/* Identity Column */}
          <div className="md:col-span-5 space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-3"
              aria-label="SRC — Student Recreation Center Home"
            >
              <img
                src={SITE_CONFIG.logos.src}
                alt="SRC Official Emblem"
                className="h-12 w-12 rounded-full bg-paper p-0.5 object-contain ring-1 ring-gold/60"
              />
              <span className="inline-flex items-baseline gap-0.5 font-display text-3xl font-bold tracking-tight text-paper">
                <span>{SITE_CONFIG.shortName}</span>
                <span className="text-gold">/</span>
              </span>
            </Link>
            <div className="space-y-1 text-sm text-paper/75">
              <p className="font-medium text-paper">{SITE_CONFIG.department}</p>
              <p>{SITE_CONFIG.institution}</p>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-paper/60">
              Elected by students, accountable to students — carrying campus
              priorities to administration and transparent decisions back to
              every batch.
            </p>
          </div>

          {/* Navigation Column */}
          <div className="md:col-span-3 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
              Navigation
            </p>
            <ul className="space-y-2.5">
              {SITE_CONFIG.navigation.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className="inline-flex items-center gap-1.5 text-sm text-paper/75 transition-colors hover:text-gold-light"
                  >
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Official Contact Column */}
          <div className="md:col-span-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-light">
              Official Contact
            </p>
            <div className="space-y-3 text-sm">
              <a
                href={`mailto:${SITE_CONFIG.contact.email}`}
                className="group flex items-center gap-3 text-paper/85 transition-colors hover:text-gold-light"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gold/30 bg-navy text-gold">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>{SITE_CONFIG.contact.email}</span>
                <ArrowUpRight
                  className="h-3.5 w-3.5 opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </a>

              <div className="flex items-start gap-3 text-paper/70">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line/15 bg-navy text-gold-light">
                  <MapPin className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="pt-1.5 leading-snug">
                  {SITE_CONFIG.contact.office}
                </span>
              </div>
            </div>

            {SITE_CONFIG.socials.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {SITE_CONFIG.socials.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-line/20 px-3 py-1.5 text-xs font-medium text-paper/80 transition-colors hover:border-gold hover:text-gold-light"
                  >
                    {social.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Copyright & Signoff */}
        <div className="flex flex-col items-start justify-between gap-4 pt-8 text-xs text-paper/55 sm:flex-row sm:items-center">
          <p>
            &copy; {year} {SITE_CONFIG.fullName}, {SITE_CONFIG.institution}. All
            rights reserved.
          </p>
          <p className="font-display text-sm font-medium tracking-wide text-gold-light">
            — {SITE_CONFIG.footerSignoff}
          </p>
        </div>
      </div>
    </footer>
  );
}
