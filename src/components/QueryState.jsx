import React from 'react';
import { Loader2, AlertCircle, RefreshCw, Inbox } from 'lucide-react';

export function LoadingState({ label = 'Loading...', dark = true }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center ${
        dark
          ? 'border-line/15 bg-navy-deep text-paper/75'
          : 'border-line bg-cream text-ink/75'
      }`}
    >
      <Loader2 className="h-6 w-6 animate-spin text-gold" aria-hidden="true" />
      <p className="text-xs font-semibold uppercase tracking-[0.2em]">
        {label}
      </p>
    </div>
  );
}

export function EmptyState({
  title = 'Nothing published yet',
  description = 'Published entries from the SRC database will appear here automatically.',
  dark = true,
  action = null,
}) {
  return (
    <div
      className={`flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center ${
        dark
          ? 'border-line/15 bg-navy-deep text-paper'
          : 'border-line bg-cream text-ink'
      }`}
    >
      <Inbox
        className={`h-7 w-7 ${dark ? 'text-gold/70' : 'text-maroon/70'}`}
        aria-hidden="true"
      />
      <h3 className="font-display text-xl font-bold">{title}</h3>
      <p
        className={`max-w-md text-sm leading-relaxed ${
          dark ? 'text-paper/65' : 'text-ink/70'
        }`}
      >
        {description}
      </p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message = 'Unable to load data from Supabase.',
  onRetry,
  dark = true,
}) {
  return (
    <div
      role="alert"
      className={`flex min-h-[220px] flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center ${
        dark
          ? 'border-maroon/70 bg-navy-deep text-paper'
          : 'border-maroon/50 bg-cream text-ink'
      }`}
    >
      <AlertCircle className="h-7 w-7 text-gold" aria-hidden="true" />
      <h3 className="font-display text-lg font-bold">Connection Error</h3>
      <p
        className={`max-w-md text-sm ${
          dark ? 'text-paper/75' : 'text-ink/75'
        }`}
      >
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="src-btn-maroon mt-2 inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-bold uppercase tracking-[0.16em]"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}
