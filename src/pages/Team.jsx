import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { fetchCurrentTeamData } from '../lib/publicApi';
import BentoGrid from '../components/BentoGrid';
import MobileCarousel from '../components/MobileCarousel';
import { LoadingState, EmptyState, ErrorState } from '../components/QueryState';

export default function Team() {
  const [batch, setBatch] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await fetchCurrentTeamData();
      setBatch(result.batch);
      setMembers(result.members);
    } catch (err) {
      setError(err.message || 'Unable to load the current council team.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  return (
    <div className="bg-navy text-paper">
      {/* Editorial Page Header */}
      <section className="border-b border-line/15 bg-navy-deep pt-14 pb-12 sm:pt-18 sm:pb-16 lg:pt-22">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
                {batch
                  ? `SRC ${batch.academicYear} · Department of CSE`
                  : 'Current Panel · Department of CSE'}
              </p>
              <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-paper sm:text-6xl">
                The <span className="text-gold">Council</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-paper/75 sm:text-lg">
                {batch?.summary ||
                  'Meet the elected representatives leading student affairs, technical programs, and batch communication. Click any member to experience their introduction.'}
              </p>
            </div>

            {!loading && !error && (
              <div className="flex items-center gap-4 border-t border-line/15 pt-4 lg:border-t-0 lg:pt-0">
                <div className="text-left lg:text-right">
                  <p className="font-display text-3xl font-bold text-gold-light">
                    {String(members.length).padStart(2, '0')}
                  </p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-paper/55">
                    Active Members
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Interactive Panel Showcase */}
      <section className="py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          {loading ? (
            <LoadingState label="Loading current SRC team..." dark />
          ) : error ? (
            <ErrorState message={error} onRetry={loadTeam} dark />
          ) : !batch ? (
            <EmptyState
              title="No Published Council Panel Yet"
              description="Mark an academic batch as Current and set its Publication Status to Published in the SRC Admin Dashboard to display it here."
              dark
            />
          ) : (
            <div className="space-y-12">
              {batch.teamPhoto && (
                <div className="overflow-hidden rounded-xl border border-gold/30 bg-navy-deep">
                  <div className="relative aspect-[16/9] max-h-[500px] w-full overflow-hidden bg-navy-dark">
                    <img
                      src={batch.teamPhoto}
                      alt={`${batch.label} SRC Team`}
                      className="h-full w-full object-cover object-top"
                    />
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/15 to-transparent"
                      aria-hidden="true"
                    />
                    <div className="absolute right-5 bottom-5 left-5 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-light">
                          Active Panel · {batch.academicYear}
                        </p>
                        <h2 className="mt-1 font-display text-2xl font-bold text-paper sm:text-3xl">
                          {batch.label}
                        </h2>
                        {batch.tagline && (
                          <p className="mt-1 text-sm text-paper/80">
                            {batch.tagline}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {members.length === 0 ? (
                <EmptyState
                  title={`${batch.label} Panel Published — Members Coming Soon`}
                  description="Add members to this batch and set their Publication Status to Published in the SRC Admin Dashboard to display them in the interactive bento grid."
                  dark
                />
              ) : (
                <>
                  {/* Desktop Asymmetric Bento Grid (>= 1024px) */}
                  <BentoGrid members={members} />

                  {/* Mobile & Tablet Horizontal Scroll-Snap Carousel (< 1024px) */}
                  <MobileCarousel members={members} />
                </>
              )}
            </div>
          )}

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
              className="src-btn-maroon group inline-flex shrink-0 items-center gap-2 rounded-md px-5 py-3 text-xs font-bold uppercase tracking-[0.16em]"
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
