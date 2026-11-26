import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Award } from 'lucide-react';
import { historicalBatches } from '../data/batches';

export default function Vault() {
  const [selectedBatchId, setSelectedBatchId] = useState(
    historicalBatches[0]?.id || ''
  );

  const selectedBatch =
    historicalBatches.find((b) => b.id === selectedBatchId) ||
    historicalBatches[0];

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
          <div
            className="mt-8 flex flex-wrap gap-2.5"
            role="tablist"
            aria-label="Select historical SRC batch"
          >
            {historicalBatches.map((batch) => {
              const active = batch.id === selectedBatch?.id;
              return (
                <button
                  key={batch.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`rounded-md px-5 py-2.5 font-display text-sm font-semibold tracking-wide transition-all ${
                    active
                      ? 'border border-gold bg-maroon text-paper shadow-md'
                      : 'border border-line/20 bg-navy text-paper/75 hover:border-gold/55 hover:text-gold-light'
                  }`}
                >
                  {batch.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Selected Batch Spotlight (echoing visual reference) */}
      {selectedBatch && (
        <section className="border-b border-line/15 py-12 sm:py-16 lg:py-20">
          <div className="mx-auto max-w-[1320px] px-5 sm:px-8 lg:px-12">
            <div className="overflow-hidden rounded-xl border border-gold/30 bg-navy-deep">
              {/* Large Batch Team Photograph */}
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

              {/* Spotlight Editorial Details */}
              <div className="grid grid-cols-1 items-end gap-8 p-6 sm:p-8 lg:grid-cols-12 lg:p-10">
                <div className="lg:col-span-8 space-y-3">
                  <h2 className="font-display text-3xl font-bold tracking-tight text-paper sm:text-4xl">
                    {selectedBatch.label}
                  </h2>
                  <p className="text-base font-medium text-gold-light">
                    {selectedBatch.tagline}
                  </p>
                  <p className="max-w-2xl text-sm leading-relaxed text-paper/75 sm:text-base">
                    {selectedBatch.summary}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-4 lg:col-span-4 lg:items-end">
                  <div className="flex items-center gap-5 text-xs text-paper/70">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-gold" aria-hidden="true" />
                      <span>{selectedBatch.members.length} Archived Leads</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-gold" aria-hidden="true" />
                      <span>{selectedBatch.achievements.length} Milestones</span>
                    </span>
                  </div>

                  <Link
                    to={`/vault/${selectedBatch.id}`}
                    className="group inline-flex items-center gap-2 rounded-md bg-maroon px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-paper transition-colors hover:bg-gold hover:text-navy-dark"
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
              {historicalBatches.length} Recorded Terms
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {historicalBatches.map((batch) => (
              <Link
                key={batch.id}
                to={`/vault/${batch.id}`}
                className="group flex flex-col justify-between rounded-xl border border-line bg-cream p-6 transition-all duration-300 hover:border-gold sm:p-7"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.18em] text-maroon">
                      {batch.academicYear}
                    </span>
                    <span className="text-xs text-ink/60">
                      {batch.members.length} Members
                    </span>
                  </div>
                  <h3 className="mt-3 font-display text-2xl font-bold text-navy">
                    {batch.label}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink/75">
                    {batch.tagline}
                  </p>
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
    </div>
  );
}
