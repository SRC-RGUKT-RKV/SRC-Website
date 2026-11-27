import React, { useState } from 'react';
import { Navigate, NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Layers,
  Archive,
  FolderOpen,
  Shield,
  LogOut,
  ExternalLink,
  Menu,
  X,
  Loader2,
  Eye,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { SITE_CONFIG } from '../../data/site';

export default function AdminLayout() {
  const {
    isAuthenticatedAdmin,
    loading,
    profile,
    roleLabel,
    isSuperAdmin,
    isViewer,
    signOut,
  } = useAdminAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-3 bg-navy-dark text-paper">
        <Loader2 className="h-6 w-6 animate-spin text-gold" aria-hidden="true" />
        <p className="text-xs uppercase tracking-[0.2em] text-paper/65">
          Verifying Admin Session...
        </p>
      </div>
    );
  }

  if (!isAuthenticatedAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  const navItems = [
    { label: 'Overview', to: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Academic Batches', to: '/admin/batches', icon: Layers },
    { label: 'Members', to: '/admin/members', icon: Users },
    { label: 'Events', to: '/admin/events', icon: Calendar },
    { label: 'Vault Archive', to: '/admin/vault', icon: Archive },
    { label: 'Media Library', to: '/admin/media', icon: FolderOpen },
    ...(isSuperAdmin
      ? [{ label: 'Admin Users', to: '/admin/users', icon: Shield }]
      : []),
  ];

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="flex min-h-[100dvh] bg-navy-dark text-paper">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-dark/80 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-68 flex-col justify-between border-r border-gold/20 bg-navy-deep transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Brand Header */}
          <div className="flex h-[72px] items-center justify-between border-b border-line/15 px-6">
            <Link
              to="/admin"
              className="inline-flex items-baseline gap-1 font-display text-2xl font-bold tracking-tight text-paper"
            >
              <span>{SITE_CONFIG.shortName}</span>
              <span className="text-gold">/</span>
              <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-light">
                Admin
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1.5 text-paper/70 hover:text-paper lg:hidden"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Role Identity Card */}
          <div className="border-b border-line/15 px-5 py-4">
            <p className="truncate font-display text-sm font-bold text-paper">
              {profile?.full_name}
            </p>
            <p className="truncate text-xs text-paper/55">{profile?.email}</p>
            <span
              className={`mt-2.5 inline-flex items-center gap-1.5 rounded-sm px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${
                isSuperAdmin
                  ? 'bg-gold text-navy-dark'
                  : isViewer
                    ? 'border border-line/30 bg-navy text-paper/80'
                    : 'bg-maroon text-paper'
              }`}
            >
              {roleLabel}
            </span>
          </div>

          {/* Navigation Links */}
          <nav
            className="flex-1 space-y-1 px-3 py-4"
            aria-label="Admin navigation"
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-maroon text-paper border-l-2 border-gold'
                        : 'text-paper/70 hover:bg-navy hover:text-gold-light'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-2 border-t border-line/15 p-4">
          <Link
            to="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-md border border-line/20 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-paper/80 transition-colors hover:border-gold hover:text-gold-light"
          >
            <span>View Public Site</span>
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-between rounded-md border border-maroon/60 bg-maroon/20 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-paper transition-colors hover:bg-maroon"
          >
            <span>Sign Out</span>
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Mobile Header */}
        <header className="flex h-[64px] items-center justify-between border-b border-line/15 bg-navy-deep px-4 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-paper hover:bg-navy"
            aria-label="Open admin menu"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="font-display text-base font-bold text-paper">
            SRC<span className="text-gold">/</span> Admin
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-light">
            {roleLabel}
          </span>
        </header>

        {/* Read-Only Banner for Viewer Role */}
        {isViewer && (
          <div className="flex items-center gap-2 border-b border-gold/25 bg-navy px-5 py-2.5 text-xs text-gold-light sm:px-8">
            <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              <strong>Viewer Mode (Read-Only):</strong> You can inspect all
              records, drafts, and media, but create/edit/delete actions are
              disabled and enforced by PostgreSQL RLS.
            </span>
          </div>
        )}

        {/* Active Admin Page */}
        <main className="flex-1 overflow-y-auto p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
