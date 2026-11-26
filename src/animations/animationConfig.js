/**
 * Centralized GSAP Animation Configuration
 * All durations, distances, easing curves, and delays are controlled from here.
 */

export const ANIMATION_CONFIG = {
  // Viewport breakpoint matching desktop/mobile choreography split
  desktopMinWidth: 1024,

  // Page & Section transitions
  pageTransition: {
    duration: 0.45,
    ease: 'power2.out',
    yOffset: 16,
  },

  hero: {
    stagger: 0.08,
    duration: 0.75,
    ease: 'power3.out',
    imageScaleStart: 1.06,
    imageDuration: 1.1,
  },

  scrollReveal: {
    duration: 0.7,
    yOffset: 28,
    stagger: 0.09,
    ease: 'power2.out',
    startTrigger: 'top 84%',
  },

  // Signature Member Introduction — Shared Circular Reveal
  memberIntro: {
    circle: {
      duration: 0.7,
      ease: 'power2.inOut',
      closeDuration: 0.55,
      closeEase: 'power2.inOut',
    },

    reducedMotion: {
      duration: 0.25,
      ease: 'power1.out',
    },

    // Mobile-specific choreography (< 1024px)
    mobile: {
      photoDelay: 0.32,
      photoDuration: 0.62,
      photoScaleStart: 0.92,
      photoEase: 'power2.out',

      // Gravity fall from above viewport down to bottom edge
      fallStartDelay: 0.36,
      fallDuration: 0.56,
      fallEase: 'power3.in',

      // Explicit keyframe bounce upward to resting slot beneath portrait
      // Overshoot by ~24px above final resting position, followed by 2 diminishing bounces
      bounceOvershootPx: 24,
      reboundUpDuration: 0.34,
      reboundUpEase: 'power2.out',
      bounce1DownOffsetPx: 11,
      bounce1DownDuration: 0.18,
      bounce2UpOffsetPx: 5,
      bounce2UpDuration: 0.14,
      settleDuration: 0.14,

      infoDelay: 0.08,
      infoDuration: 0.45,
      infoStagger: 0.06,
      infoEase: 'power2.out',
    },

    // Desktop-specific choreography (>= 1024px)
    desktop: {
      // Opposite-edge entrance toward center
      entranceDelay: 0.36,
      entranceDuration: 0.58,
      entranceEase: 'power3.out',

      // Collision & per-letter horizontal compression + subtle skew
      collisionDuration: 0.14,
      collisionScaleX: 0.78,
      collisionSkewDeg: 6,
      collisionStagger: 0.018,

      // Right half pushes left half -> progressive compression -> spring-back reaction
      pushDuration: 0.36,
      pushDistancePx: 52,
      pushEase: 'power2.inOut',
      leftCompressScaleX: 0.84,

      springBackDuration: 0.22,
      springBackOffsetPx: 18,
      springBackEase: 'power2.out',

      // Final glide into left-aligned composition
      settleDuration: 0.48,
      settleEase: 'power3.out',

      // Portrait emergence overlapping intentionally with pushing motion
      photoOverlapOffset: '-=0.72',
      photoDuration: 0.72,
      photoScaleStart: 0.92,
      photoEase: 'power2.out',

      // Member name, about, responsibilities, links
      infoOverlapOffset: '-=0.25',
      infoDuration: 0.48,
      infoStagger: 0.07,
      infoEase: 'power2.out',
    },
  },
};
