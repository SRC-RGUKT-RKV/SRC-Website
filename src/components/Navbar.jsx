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
        className={`fixed top-0 left-0 right-0 z-50 border-b border-gold/60 transition-colors duration-300 ${
          scrolled
            ? 'bg-navy-deep/95 backdrop-blur-md'
            : 'bg-navy/95 backdrop-blur-sm'
        }`}
      >
        <div className="mx-auto flex h-[76px] max-w-[1320px] items-center justify-between px-5 sm:px-8 lg:px-12">
          {/* SRC Official Brand Lockup */}
          <Link
            to="/"
            className="group inline-flex items-center gap-3"
            aria-label="SRC — Student Recreation Center Home"
          >
            <img
              src={SITE_CONFIG.logos.src}
              alt="SRC Official Emblem"
              className="h-10 w-10 rounded-full bg-paper p-0.5 object-contain ring-1 ring-gold/60 transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11"
            />
            <span className="inline-flex items-baseline gap-0.5 font-display text-2xl font-bold tracking-tight text-paper">
              <span>{SITE_CONFIG.shortName}</span>
              <span className="text-gold transition-transform duration-300 group-hover:translate-x-0.5">
                /
              </span>
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
                      ? 'text-paper font-semibold'
                      : 'text-paper/75 hover:text-gold-light'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    <span
                      className={`absolute -bottom-0.5 left-0 h-[3px] w-full origin-left bg-maroon transition-transform duration-300 ${
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
              className="src-btn-outline-gold inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-[0.16em]"
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
