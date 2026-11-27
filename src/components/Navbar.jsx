import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import { SITE_CONFIG } from '../data/site';

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && menuOpen) setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
          scrolled
            ? 'bg-navy-deep/95 backdrop-blur-md border-b border-gold/25'
            : 'bg-navy/90 backdrop-blur-sm border-b border-line/10'
        }`}
      >
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-12">
          {/* SRC & CSE Official Brand Lockup */}
          <Link
            to="/"
            className="group inline-flex items-center gap-2.5 sm:gap-3"
            aria-label="SRC — Department of CSE Home"
          >
            <img
              src={SITE_CONFIG.logos.src}
              alt="SRC Official Emblem"
              className="h-9 w-9 rounded-full bg-paper p-0.5 object-contain ring-1 ring-gold/60 transition-transform duration-300 group-hover:scale-105 sm:h-10 sm:w-10"
            />
            <span className="inline-flex items-baseline gap-0.5 font-display text-xl font-bold tracking-tight text-paper sm:text-2xl">
              <span>{SITE_CONFIG.shortName}</span>
              <span className="text-gold transition-transform duration-300 group-hover:translate-x-0.5">
                /
              </span>
            </span>
            <span
              className="h-6 w-[1px] bg-line/25"
              aria-hidden="true"
            />
            <span className="inline-flex h-8 items-center rounded-md bg-white px-1.5 py-0.5 ring-1 ring-gold/30 sm:h-9 sm:px-2">
              <img
                src={SITE_CONFIG.logos.cse}
                alt="Department of CSE, RGUKT RK Valley Logo"
                className="h-full w-auto object-contain"
              />
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav
            className="hidden items-center gap-9 md:flex"
            aria-label="Primary navigation"
          >
            {SITE_CONFIG.navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `relative py-2 text-sm font-medium tracking-wide transition-colors duration-200 ${
                    isActive
                      ? 'text-paper'
                      : 'text-paper/70 hover:text-gold-light'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    <span
                      className={`absolute bottom-0 left-0 h-[2px] w-full origin-left bg-gold transition-transform duration-300 ${
                        isActive ? 'scale-x-100' : 'scale-x-0'
                      }`}
                      aria-hidden="true"
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Right Accent Action (Desktop) */}
          <div className="hidden items-center md:flex">
            <a
              href={`mailto:${SITE_CONFIG.contact.email}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-gold/45 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-gold-light transition-colors duration-200 hover:border-gold hover:bg-gold hover:text-navy-dark"
            >
              <span>Reach SRC</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-md text-paper transition-colors hover:bg-navy-light/50 hover:text-gold-light md:hidden"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Full-Height Drawer */}
      <div
        id="mobile-navigation-drawer"
        className={`fixed inset-0 z-40 flex flex-col justify-between bg-navy-deep px-6 pt-28 pb-10 transition-all duration-300 md:hidden ${
          menuOpen
            ? 'pointer-events-auto opacity-100 translate-y-0'
            : 'pointer-events-none opacity-0 -translate-y-3'
        }`}
        aria-hidden={!menuOpen}
      >
        <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
          {SITE_CONFIG.navigation.map((item, idx) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              tabIndex={menuOpen ? 0 : -1}
              className={({ isActive }) =>
                `flex items-baseline justify-between border-b border-line/15 py-5 font-display text-3xl font-bold tracking-tight transition-colors ${
                  isActive ? 'text-gold-light' : 'text-paper hover:text-gold'
                }`
              }
            >
              <span>{item.label}</span>
              <span className="font-sans text-xs font-medium tracking-[0.2em] text-paper/40">
                0{idx + 1}
              </span>
            </NavLink>
          ))}
        </nav>

        <div className="space-y-4 border-t border-gold/25 pt-6">
          <p className="text-xs uppercase tracking-[0.18em] text-gold-light">
            {SITE_CONFIG.department}
          </p>
          <a
            href={`mailto:${SITE_CONFIG.contact.email}`}
            tabIndex={menuOpen ? 0 : -1}
            className="inline-flex items-center gap-2 text-sm font-medium text-paper/90 hover:text-gold-light"
          >
            <span>{SITE_CONFIG.contact.email}</span>
            <ArrowUpRight className="h-4 w-4 text-gold" aria-hidden="true" />
          </a>
        </div>
      </div>
    </>
  );
}
