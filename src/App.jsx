import React, { Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';
import { MemberIntroProvider } from './context/MemberIntroContext';
import { AdminAuthProvider } from './context/AdminAuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PageTransition from './components/PageTransition';
import MemberIntroduction from './components/MemberIntroduction';

import Home from './pages/Home';
import Team from './pages/Team';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import Vault from './pages/Vault';
import BatchDetails from './pages/BatchDetails';

// Code-split admin portal so public site bundle stays lean
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminBatches = lazy(() => import('./pages/admin/AdminBatches'));
const AdminMembers = lazy(() => import('./pages/admin/AdminMembers'));
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'));
const AdminVault = lazy(() => import('./pages/admin/AdminVault'));
const AdminMediaLibrary = lazy(() => import('./pages/admin/AdminMediaLibrary'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));

function PublicLayout() {
  return (
    <MemberIntroProvider>
      <div className="flex min-h-[100dvh] flex-col bg-navy text-paper">
        <Navbar />
        <main className="flex-1">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
        <Footer />
        <MemberIntroduction />
      </div>
    </MemberIntroProvider>
  );
}

function AdminRouteWrapper() {
  return (
    <AdminAuthProvider>
      <Suspense
        fallback={
          <div className="flex min-h-[100dvh] items-center justify-center bg-navy-dark text-xs uppercase tracking-[0.2em] text-gold-light">
            Loading SRC Admin...
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </AdminAuthProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Protected & Login Admin Routes */}
        <Route path="/admin" element={<AdminRouteWrapper />}>
          <Route path="login" element={<AdminLogin />} />
          <Route element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="batches" element={<AdminBatches />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="events" element={<AdminEvents />} />
            <Route path="vault" element={<AdminVault />} />
            <Route path="media" element={<AdminMediaLibrary />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>

        {/* Public Website Routes (Untouched) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/team" element={<Team />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:slug" element={<EventDetails />} />
          <Route path="/vault" element={<Vault />} />
          <Route path="/vault/:batchId" element={<BatchDetails />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
