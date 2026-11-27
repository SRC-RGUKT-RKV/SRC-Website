import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Award, Calendar, Layers } from 'lucide-react';
import { fetchVaultBatchDetail } from '../lib/publicApi';
import { LoadingState, EmptyState, ErrorState } from '../components/QueryState';

export default function BatchDetails() {
  const { batchId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadBatch = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    setError('');
    try {
      const result = await fetchVaultBatchDetail(batchId);
      setData(result);
    } catch (err) {
      setError(err.message || 'Unable to load historical batch details.');
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    loadBatch();
  }, [loadBatch]);

  if (loading) {
    return (
      <div className="bg-navy py-20 text-paper">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <LoadingState label="Loading batch archive..." dark />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-navy py-20 text-paper">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <ErrorState message={error} onRetry={loadBatch} dark />
        </div>
      </div>
    );
  }

  const batch = data?.batch || null;

  if (!batch) {
    return (
      <div className="flex min-h-[65dvh] flex-col items-center justify-center bg-navy px-5 text-center text-paper">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
          The Vault
        </p>
        <h1 className="mt-3 font-display text-3xl font-bold">
          Batch Archive Not Found
        </h1>
        <Link
          to="/vault"
          className="src-btn-maroon mt-6 inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Return to The Vault</span>
        </Link>
      </div>
    );
  }

  const { members = [], achievements = [], events = [], prevBatch, nextBatch } =
    data;

  return (
    <div className="bg-navy text-paper">
      {/* Batch Header */}
      <section className="border-b border-line/15 bg-navy-deep pt-12 pb-12 sm:pt-16">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <Link
            to="/vault"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gold-light transition-colors hover:text-paper"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Back to The Vault</span>
          </Link>

          <div className="mt-7 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-light">
                Historical Archive · Academic Year {batch.academicYear}
              </p>
              <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-paper sm:text-6xl">
                {batch.label} <span className="text-gold">SRC Panel</span>
              </h1>
              {batch.summary && (
                <p className="mt-3 max-w-2xl text-base leading-relaxed text-paper/75 sm:text-lg">
                  {batch.summary}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Team Photograph & Legacy Contributions */}
      <section className="border-b border-line/15 py-12 sm:py-16">
        <div className="mx-auto max-w-[1320px] space-y-12 px-5 sm:px-8 lg:px-12">
          {batch.teamPhoto && (
            <div className="overflow-hidden rounded-xl border border-gold/30 bg-navy-dark">
              <img
                src={batch.teamPhoto}
                alt={`${batch.label} SRC Team Photograph`}
                className="aspect-[16/9] max-h-[520px] w-full object-cover object-top"
              />
            </div>
          )}

          {/* Achievements, Major Events, Contributions */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-xl border border-line/15 bg-navy-deep p-6">
              <div className="flex items-center gap-2 text-gold-light">
                <Award className="h-4 w-4" aria-hidden="true" />
                <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em]">
                  Achievements
                </h2>
              </div>
              {achievements.length === 0 ? (
                <p className="mt-4 text-xs text-paper/55">
                  No published achievements recorded for this batch.
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-paper/80">
                  {achievements.map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      <span>{item.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-line/15 bg-navy-deep p-6">
              <div className="flex items-center gap-2 text-gold-light">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em]">
                  Major Events
                </h2>
              </div>
              {events.length === 0 ? (
                <p className="mt-4 text-xs text-paper/55">
                  No published events linked to this batch.
                </p>
              ) : (
                <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-paper/80">
                  {events.map((ev) => (
                    <li key={ev.id} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      <Link
                        to={`/events/${ev.slug}`}
                        className="hover:text-gold-light hover:underline"
                      >
                        {ev.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-gold/30 bg-maroon/90 p-6">
              <div className="flex items-center gap-2 text-gold-light">
                <Layers className="h-4 w-4" aria-hidden="true" />
                <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em]">
                  Lasting Contribution
                </h2>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-paper/90">
                {batch.contributions ||
                  'Served the Computer Science and Engineering student body with dedication.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Historical Individual Members Grid (Strict Hierarchy: Batch -> Team -> Members) */}
      <section className="bg-paper py-16 text-ink sm:py-20">
        <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
          <div className="mb-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-maroon">
              {batch.label} · Historical Roster
            </p>
            <h2 className="mt-1 font-display text-3xl font-bold text-navy sm:text-4xl">
              Council Members
            </h2>
          </div>

          {members.length === 0 ? (
            <EmptyState
              title="No Archived Members Published"
              description="Individual council members for this batch have not been published yet."
              dark={false}
            />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {members.map((member) => (
                <article
                  key={member.id}
                  className="overflow-hidden rounded-xl border border-line bg-cream"
                >
                  <div className="aspect-[3/4] overflow-hidden bg-navy-deep">
                    {member.image ? (
                      <img
                        src={member.image}
                        alt={member.name}
                        loading="lazy"
                        className="h-full w-full object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center font-display text-4xl font-bold text-gold-light">
                        {member.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maroon">
                      {member.role}
                    </p>
                    <h3 className="mt-1 font-display text-lg font-bold text-navy">
                      {member.name}
                    </h3>
                    {member.about && (
                      <p className="mt-2 text-xs leading-relaxed text-ink/75">
                        {member.about}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Browse Previous / Next Batches */}
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
            {prevBatch ? (
              <Link
                to={`/vault/${prevBatch.slug}`}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-navy hover:text-maroon"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                <span>Newer: {prevBatch.label}</span>
              </Link>
            ) : (
              <span />
            )}

            {nextBatch && (
              <Link
                to={`/vault/${nextBatch.slug}`}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-navy hover:text-maroon"
              >
                <span>Older: {nextBatch.label}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
