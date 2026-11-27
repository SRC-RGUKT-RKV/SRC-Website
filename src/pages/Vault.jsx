import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Award } from 'lucide-react';
import {
  fetchPublishedVaultBatches,
  fetchPublishedMembersForBatch,
} from '../lib/publicApi';
import { LoadingState, EmptyState, ErrorState } from '../components/QueryState';

export default function Vault() {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBatches = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchPublishedVaultBatches();
      setBatches(list);
      if (list.length > 0) {
        setSelectedBatchId((prev) =>
          list.some((b) => b.id === prev) ? prev : list[0].id
        );
      } else {
        setSelectedBatchId('');
      }
    } catch (err) {
      setError(err.message || 'Unable to load historical Vault batches.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  const selectedBatch =
    batches.find((b) => b.id === selectedBatchId) || batches[0] || null;

  useEffect(() => {
    if (!selectedBatch?.id) {
      setSelectedMembers([]);
      return;
    }

    let cancelled = false;
    setMembersLoading(true);
    fetchPublishedMembersForBatch(selectedBatch.id, {
      academic_year: selectedBatch.academicYear,
    })
      .then((list) => {
        if (!cancelled) setSelectedMembers(list);
      })
      .catch(() => {
        if (!cancelled) setSelectedMembers([]);
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedBatch?.id, selectedBatch?.academicYear]);

  return (
    <div className="bg-navy text-paper">
      {/* Editorial Archive Header */}
      <section className="border-b border-line/15 bg-navy-deep pt-14 pb-12 sm:pt-18 sm:pb-16">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
            SRC Legacy Archive · Batch → Team → Members
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-paper sm:text-6xl">
            The <span className="text-gold">Vault</span>
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-paper/75 sm:text-lg">
            Our legacy, through the years. Preserving every previous Student
            Representative Council panel separately from the active council.
          </p>

          {/* Interactive Batch Selector Tabs */}
          {batches.length > 0 && (
            <div
              className="mt-8 flex flex-wrap gap-2.5"
              role="tablist"
              aria-label="Select historical SRC batch"
            >
              {batches.map((batch) => {
                const active = batch.id === selectedBatch?.id;
                return (
                  <button
                    key={batch.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setSelectedBatchId(batch.id)}
                    className={`rounded-md px-5 py-2.5 font-display text-sm font-semibold tracking-wide ${
                      active
                        ? 'src-btn-maroon border border-gold shadow-md'
                        : 'src-btn-navy border border-line/20 text-paper/75 hover:text-gold-light'
                    }`}
                  >
                    {batch.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {loading ? (
        <section className="py-16">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
            <LoadingState label="Opening The Vault..." dark />
          </div>
        </section>
      ) : error ? (
        <section className="py-16">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
            <ErrorState message={error} onRetry={loadBatches} dark />
          </div>
        </section>
      ) : batches.length === 0 ? (
        <section className="py-16">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
            <EmptyState
              title="The Vault Archive Is Empty"
              description="Published historical batches (is_current = false) added in the SRC Admin Dashboard will be preserved here by academic year."
              dark
            />
          </div>
        </section>
      ) : (
        <>
          {/* Featured Selected Batch Spotlight */}
          {selectedBatch && (
            <section className="border-b border-line/15 py-12 sm:py-16 lg:py-20">
              <div className="mx-auto max-w-[1320px] space-y-8 px-5 sm:px-8 lg:px-12">
                <div className="overflow-hidden rounded-xl border border-gold/30 bg-navy-deep">
                  {selectedBatch.teamPhoto && (
                    <div className="relative aspect-[16/9] max-h-[520px] w-full overflow-hidden bg-navy-dark">
                      <img
                        src={selectedBatch.teamPhoto}
                        alt={`${selectedBatch.label} SRC Team`}
                        className="h-full w-full object-cover object-top"
                      />
                      <div
                        className="absolute inset-0 bg-gradient-to-t from-navy-deep via-navy-deep/20 to-transparent"
                        aria-hidden="true"
                      />
                      <span className="absolute top-4 left-4 rounded-sm border border-gold/40 bg-navy-dark/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-gold-light backdrop-blur-xs">
                        Academic Year {selectedBatch.academicYear}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 items-end gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:p-10">
                    <div className="lg:col-span-8 space-y-3">
                      {!selectedBatch.teamPhoto && (
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-light">
                          Academic Year {selectedBatch.academicYear}
                        </p>
                      )}
                      <h2 className="font-display text-3xl font-bold tracking-tight text-paper sm:text-4xl">
                        {selectedBatch.label}
                      </h2>
                      {selectedBatch.tagline && (
                        <p className="text-base font-medium text-gold-light">
                          {selectedBatch.tagline}
                        </p>
                      )}
                      {selectedBatch.summary && (
                        <p className="max-w-2xl text-sm leading-relaxed text-paper/75 sm:text-base">
                          {selectedBatch.summary}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-start gap-4 lg:col-span-4 lg:items-end">
                      <div className="flex items-center gap-5 text-xs text-paper/70">
                        <span className="inline-flex items-center gap-1.5">
                          <Users
                            className="h-4 w-4 text-gold"
                            aria-hidden="true"
                          />
                          <span>{selectedBatch.memberCount} Archived Leads</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Award
                            className="h-4 w-4 text-gold"
                            aria-hidden="true"
                          />
                          <span>
                            {selectedBatch.achievementCount} Milestones
                          </span>
                        </span>
                      </div>

                      <Link
                        to={`/vault/${selectedBatch.slug}`}
                        className="src-btn-maroon group inline-flex items-center gap-2 rounded-md px-6 py-3 text-xs font-bold uppercase tracking-[0.16em]"
                      >
                        <span>Explore Team</span>
                        <ArrowRight
                          className="h-4 w-4 transition-transform group-hover:translate-x-1"
                          aria-hidden="true"
                        />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Live Roster Preview for Selected Batch */}
                {membersLoading ? (
                  <LoadingState
                    label={`Loading ${selectedBatch.label} members...`}
                    dark
                  />
                ) : selectedMembers.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {selectedMembers.slice(0, 4).map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3.5 rounded-xl border border-line/15 bg-navy-deep p-4"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gold/25 bg-navy-dark">
                          {m.image ? (
                            <img
                              src={m.image}
                              alt={m.name}
                              loading="lazy"
                              className="h-full w-full object-cover object-top"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center font-display text-sm font-bold text-gold-light">
                              {m.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-bold text-paper">
                            {m.name}
                          </p>
                          <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-light">
                            {m.role}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {/* Complete Historical Batches Directory */}
          <section className="bg-paper py-16 text-ink sm:py-20">
            <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
              <div className="mb-10 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-maroon">
                    Archive Index
                  </p>
                  <h2 className="mt-1 font-display text-3xl font-bold text-navy sm:text-4xl">
                    All Archived Batches
                  </h2>
                </div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink/55">
                  {batches.length} Recorded Term{batches.length === 1 ? '' : 's'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {batches.map((batch) => (
                  <Link
                    key={batch.id}
                    to={`/vault/${batch.slug}`}
                    className="src-interactive-card-light group flex flex-col justify-between rounded-xl border border-line bg-cream p-6 hover:-translate-y-0.5 hover:border-gold sm:p-7"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-[0.18em] text-maroon">
                          {batch.academicYear}
                        </span>
                        <span className="text-xs text-ink/60">
                          {batch.memberCount} Members
                        </span>
                      </div>
                      <h3 className="mt-3 font-display text-2xl font-bold text-navy">
                        {batch.label}
                      </h3>
                      {batch.tagline && (
                        <p className="mt-2 text-sm leading-relaxed text-ink/75">
                          {batch.tagline}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-maroon transition-colors group-hover:text-navy">
                      <span>Open Batch Archive</span>
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
