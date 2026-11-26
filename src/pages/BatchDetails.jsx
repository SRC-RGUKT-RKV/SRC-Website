import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Award, Calendar, Layers } from 'lucide-react';
import { historicalBatches } from '../data/batches';

export default function BatchDetails() {
  const { batchId } = useParams();
  const batchIdx = historicalBatches.findIndex((b) => b.id === batchId);
  const batch = batchIdx >= 0 ? historicalBatches[batchIdx] : null;

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
          className="mt-6 inline-flex items-center gap-2 rounded-md bg-maroon px-5 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-paper hover:bg-gold hover:text-navy-dark"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Return to The Vault</span>
        </Link>
      </div>
    );
  }

  const prevBatch = batchIdx > 0 ? historicalBatches[batchIdx - 1] : null;
  const nextBatch =
    batchIdx < historicalBatches.length - 1
      ? historicalBatches[batchIdx + 1]
      : null;

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
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-paper/75 sm:text-lg">
                {batch.summary}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team Photograph & Legacy Contributions */}
      <section className="border-b border-line/15 py-12 sm:py-16">
        <div className="mx-auto max-w-[1320px] space-y-12 px-5 sm:px-8 lg:px-12">
          {/* Batch Group Photo */}
          <div className="overflow-hidden rounded-xl border border-gold/30 bg-navy-dark">
            <img
              src={batch.teamPhoto}
              alt={`${batch.label} SRC Team Photograph`}
              className="aspect-[16/9] max-h-[520px] w-full object-cover object-top"
            />
          </div>

          {/* Achievements, Major Events, Contributions */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="rounded-xl border border-line/15 bg-navy-deep p-6">
              <div className="flex items-center gap-2 text-gold-light">
                <Award className="h-4 w-4" aria-hidden="true" />
                <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em]">
                  Achievements
                </h2>
              </div>
              <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-paper/80">
                {batch.achievements.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-line/15 bg-navy-deep p-6">
              <div className="flex items-center gap-2 text-gold-light">
                <Calendar className="h-4 w-4" aria-hidden="true" />
                <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em]">
                  Major Events
                </h2>
              </div>
              <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-paper/80">
                {batch.majorEvents.map((ev, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    <span>{ev}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-gold/30 bg-maroon/90 p-6">
              <div className="flex items-center gap-2 text-gold-light">
                <Layers className="h-4 w-4" aria-hidden="true" />
                <h2 className="font-display text-sm font-bold uppercase tracking-[0.18em]">
                  Lasting Contribution
                </h2>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-paper/90">
                {batch.contributions}
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

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {batch.members.map((member, idx) => (
              <article
                key={`${member.name}-${idx}`}
                className="overflow-hidden rounded-xl border border-line bg-cream"
              >
                <div className="aspect-[3/4] overflow-hidden bg-navy-deep">
                  <img
                    src={member.image}
                    alt={member.name}
                    loading="lazy"
                    className="h-full w-full object-cover object-top"
                  />
                </div>
                <div className="p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-maroon">
                    {member.role}
                  </p>
                  <h3 className="mt-1 font-display text-lg font-bold text-navy">
                    {member.name}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-ink/75">
                    {member.about}
                  </p>
                </div>
              </article>
            ))}
          </div>

          {/* Browse Previous / Next Batches */}
          <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-8">
            {prevBatch ? (
              <Link
                to={`/vault/${prevBatch.id}`}
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
                to={`/vault/${nextBatch.id}`}
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
