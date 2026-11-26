import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MemberIntroProvider } from './context/MemberIntroContext';
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

export default function App() {
  return (
    <BrowserRouter>
      <MemberIntroProvider>
        <div className="flex min-h-[100dvh] flex-col bg-navy text-paper">
          <Navbar />

          <main className="flex-1">
            <PageTransition>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/team" element={<Team />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:slug" element={<EventDetails />} />
                <Route path="/vault" element={<Vault />} />
                <Route path="/vault/:batchId" element={<BatchDetails />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </PageTransition>
          </main>

          <Footer />
          <MemberIntroduction />
        </div>
      </MemberIntroProvider>
    </BrowserRouter>
  );
}
