import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const MemberIntroContext = createContext(null);

/**
 * Coordinates the signature cinematic Member Introduction overlay across Home and Team pages.
 * Captures the clicked card's DOMRect and prevents overlapping open/close timelines.
 */
export function MemberIntroProvider({ children }) {
  const [activeSession, setActiveSession] = useState(null);
  const isAnimatingRef = useRef(false);
  const triggerElementRef = useRef(null);

  const openMemberIntro = useCallback((member, cardElement) => {
    if (!member || isAnimatingRef.current) return;

    let origin = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      width: 180,
      height: 220,
    };

    if (cardElement && typeof cardElement.getBoundingClientRect === 'function') {
      const rect = cardElement.getBoundingClientRect();
      origin = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      };
      triggerElementRef.current = cardElement;
    } else {
      triggerElementRef.current = document.activeElement;
    }

    const scrollY = window.scrollY;

    // Push a lightweight history state so browser Back closes the intro cleanly
    try {
      window.history.pushState(
        { srcMemberIntro: true, memberId: member.id },
        '',
        window.location.href
      );
    } catch {
      // Ignore if history API is restricted
    }

    setActiveSession({
      member,
      origin,
      scrollY,
      sessionId: Date.now(),
    });
  }, []);

  const clearSession = useCallback(() => {
    const savedScrollY = activeSession?.scrollY;
    setActiveSession(null);
    isAnimatingRef.current = false;

    if (typeof savedScrollY === 'number') {
      requestAnimationFrame(() => {
        window.scrollTo({ top: savedScrollY, behavior: 'instant' });
      });
    }

    if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
      requestAnimationFrame(() => {
        try {
          triggerElementRef.current.focus({ preventScroll: true });
        } catch {
          // Ignore focus failures on detached nodes
        }
      });
    }
  }, [activeSession]);

  return (
    <MemberIntroContext.Provider
      value={{
        activeSession,
        openMemberIntro,
        clearSession,
        isAnimatingRef,
      }}
    >
      {children}
    </MemberIntroContext.Provider>
  );
}

export function useMemberIntro() {
  const ctx = useContext(MemberIntroContext);
  if (!ctx) {
    throw new Error('useMemberIntro must be used within a MemberIntroProvider');
  }
  return ctx;
}
