import React, { useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { Lock, Mail, Loader2, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { SITE_CONFIG } from '../../data/site';

export default function AdminLogin() {
  const { isAuthenticatedAdmin, loading, signIn, authError } = useAdminAuth();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-navy-dark text-paper">
        <Loader2 className="h-6 w-6 animate-spin text-gold" aria-label="Checking session" />
      </div>
    );
  }

  if (isAuthenticatedAdmin) {
    const dest = location.state?.from?.pathname || '/admin';
    return <Navigate to={dest} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setFormError('Please enter a valid administrator email address.');
      return;
    }
    if (!password || password.length < 6) {
      setFormError('Please enter your password (minimum 6 characters).');
      return;
    }

    setSubmitting(true);
    try {
      await signIn(trimmedEmail, password);
    } catch (err) {
      setFormError(err.message || 'Authentication failed. Check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = formError || authError;

  return (
    <div className="flex min-h-[100dvh] flex-col justify-between bg-navy-dark px-5 py-8 text-paper">
      {/* Top Bar */}
      <div className="mx-auto flex w-full max-w-md items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-paper/70 transition-colors hover:text-gold-light"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Public Website</span>
        </Link>

        <div className="inline-flex items-center gap-2">
          <img
            src={SITE_CONFIG.logos.src}
            alt="SRC Logo"
            className="h-8 w-8 rounded-full bg-paper p-0.5 object-contain ring-1 ring-gold/50"
          />
          <span className="font-display text-lg font-bold tracking-tight text-paper">
            {SITE_CONFIG.shortName}
            <span className="text-gold">/</span>
          </span>
        </div>
      </div>

      {/* Centered Login Card */}
      <main className="mx-auto my-10 w-full max-w-md rounded-xl border border-gold/30 bg-navy p-7 shadow-2xl sm:p-9">
        <div className="mb-7 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-sm border border-gold/35 bg-navy-deep px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-light">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
            <span>Restricted Access</span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-paper">
            SRC Admin Portal
          </h1>
          <p className="text-sm text-paper/70">
            Sign in with your authorized council account. Public registration is
            disabled.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-light">
              Administrator Email
            </span>
            <div className="relative">
              <Mail
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-paper/45"
                aria-hidden="true"
              />
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rguktrkv.ac.in"
                className="w-full rounded-md border border-line/20 bg-navy-deep py-2.5 pr-3.5 pl-10 text-sm text-paper placeholder:text-paper/35 focus:border-gold focus:outline-none"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-light">
              Password
            </span>
            <div className="relative">
              <Lock
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-paper/45"
                aria-hidden="true"
              />
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-md border border-line/20 bg-navy-deep py-2.5 pr-3.5 pl-10 text-sm text-paper placeholder:text-paper/35 focus:border-gold focus:outline-none"
              />
            </div>
          </label>

          {displayError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-maroon bg-maroon/25 p-3 text-xs leading-relaxed text-paper"
            >
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-gold-light"
                aria-hidden="true"
              />
              <span>{displayError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-maroon px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-paper transition-colors hover:bg-gold hover:text-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            <span>{submitting ? 'Verifying...' : 'Sign In'}</span>
          </button>
        </form>
      </main>

      <footer className="text-center text-xs text-paper/45">
        {SITE_CONFIG.fullName} · {SITE_CONFIG.department}
      </footer>
    </div>
  );
}
