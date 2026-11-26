import React, { useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ANIMATION_CONFIG } from '../animations/animationConfig';

gsap.registerPlugin(useGSAP);

/**
 * Provides subtle editorial page entrances on route changes while preserving
 * native browser history, scroll restoration, and prefers-reduced-motion.
 */
export default function PageTransition({ children }) {
  const containerRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useGSAP(
    () => {
      const reducedMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      if (reducedMotion) {
        gsap.set(containerRef.current, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        containerRef.current,
        {
          opacity: 0,
          y: ANIMATION_CONFIG.pageTransition.yOffset,
        },
        {
          opacity: 1,
          y: 0,
          duration: ANIMATION_CONFIG.pageTransition.duration,
          ease: ANIMATION_CONFIG.pageTransition.ease,
          clearProps: 'transform,opacity',
        }
      );
    },
    { scope: containerRef, dependencies: [location.pathname] }
  );

  return (
    <div ref={containerRef} className="min-h-[calc(100dvh-76px)] pt-[76px]">
      {children}
    </div>
  );
}
