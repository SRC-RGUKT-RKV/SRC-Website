import gsap from 'gsap';
import { ANIMATION_CONFIG } from './animationConfig';

/**
 * Preloads and decodes an image URL before starting the reveal choreography
 * to prevent image-loading flashes or layout shifts.
 */
export function preloadMemberImage(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(false);
      return;
    }
    const img = new Image();
    img.src = src;

    const done = () => resolve(true);

    if (img.complete) {
      if (typeof img.decode === 'function') {
        img.decode().then(done).catch(done);
      } else {
        done();
      }
      return;
    }

    img.onload = () => {
      if (typeof img.decode === 'function') {
        img.decode().then(done).catch(done);
      } else {
        done();
      }
    };
    img.onerror = () => resolve(false);
  });
}

/**
 * Computes the exact transform scale required for a fixed 100x100 circle
 * centered at (origin.x, origin.y) to cover the farthest viewport corner.
 */
export function computeCircleCoverScale(origin) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxX = Math.max(origin.x, vw - origin.x);
  const maxY = Math.max(origin.y, vh - origin.y);
  const maxRadius = Math.hypot(maxX, maxY);
  // Base circle is 100px diameter (50px radius); add 8% safety margin
  return (maxRadius / 50) * 1.08;
}

/**
 * Builds the Reduced-Motion crossfade timeline.
 */
export function buildReducedMotionTimeline(refs) {
  const cfg = ANIMATION_CONFIG.memberIntro.reducedMotion;
  const tl = gsap.timeline({ paused: true });

  tl.set(refs.circleEl, { opacity: 0 })
    .set(refs.backdropEl, { opacity: 0 })
    .set(refs.contentEl, { opacity: 0 })
    .set(refs.closeBtnEl, { opacity: 1, scale: 1 })
    .set([refs.desktopPhotoEl, refs.mobilePhotoEl], { opacity: 1, scale: 1 })
    .set(refs.infoItems, { opacity: 1, y: 0 })
    .to(refs.backdropEl, {
      opacity: 1,
      duration: cfg.duration,
      ease: cfg.ease,
    })
    .to(
      refs.contentEl,
      {
        opacity: 1,
        duration: cfg.duration,
        ease: cfg.ease,
      },
      '<'
    );

  return tl;
}

/**
 * Builds the Desktop Cinematic Choreography (>= 1024px).
 * Sequence:
 *  1. Circular reveal expands from clicked card center -> transitions to Council Navy.
 *  2. Split designation halves enter from opposite viewport edges toward screen center.
 *  3. Per-letter physical collision at center (horizontal compression + subtle skew + ripple stagger).
 *  4. Right half pushes left half -> progressive left compression -> elastic spring-back reaction.
 *  5. Entire designation settles into left-aligned editorial position while portrait emerges on right.
 *  6. Member name, bio, responsibilities, and links reveal cleanly underneath.
 */
export function buildDesktopMemberTimeline(refs, origin) {
  const circleCfg = ANIMATION_CONFIG.memberIntro.circle;
  const dCfg = ANIMATION_CONFIG.memberIntro.desktop;
  const targetScale = computeCircleCoverScale(origin);

  const vw = window.innerWidth;
  const designationRect = refs.desktopDesignationEl
    ? refs.desktopDesignationEl.getBoundingClientRect()
    : { left: 80, width: 520 };

  // Offset required to shift the left-aligned designation visually to the horizontal center of viewport
  const currentCenterX = designationRect.left + designationRect.width / 2;
  const centerDeltaX = vw / 2 - currentCenterX;

  // Off-screen starting positions relative to resting coordinates
  const leftStartX = -(designationRect.left + designationRect.width + 120);
  const rightStartX = vw - designationRect.left + 120;

  const tl = gsap.timeline({ paused: true });

  // Initial hidden states
  tl.set(refs.circleEl, {
    x: origin.x - 50,
    y: origin.y - 50,
    scale: 0,
    backgroundColor: '#0b121e',
    opacity: 1,
  })
    .set(refs.backdropEl, { opacity: 0 })
    .set(refs.contentEl, { opacity: 1 })
    .set(refs.closeBtnEl, { opacity: 0, scale: 0.85 })
    .set(refs.desktopPhotoEl, {
      opacity: 0,
      scale: dCfg.photoScaleStart,
    })
    .set(refs.infoItems, { opacity: 0, y: 18 })
    .set(refs.leftHalfEl, {
      x: leftStartX,
      opacity: 1,
    })
    .set(refs.rightHalfEl, {
      x: rightStartX,
      opacity: 1,
    });

  // 1. Circular reveal outward from clicked card center
  tl.addLabel('circleExpand')
    .to(refs.circleEl, {
      scale: targetScale,
      backgroundColor: '#1c2e4a',
      duration: circleCfg.duration,
      ease: circleCfg.ease,
    })
    .to(
      refs.backdropEl,
      {
        opacity: 1,
        duration: 0.2,
        ease: 'none',
      },
      `-=${0.2}`
    );

  // 2. Opposite-edge entrance toward screen center
  tl.addLabel('entrance', dCfg.entranceDelay)
    .to(
      refs.leftHalfEl,
      {
        x: centerDeltaX,
        duration: dCfg.entranceDuration,
        ease: dCfg.entranceEase,
      },
      'entrance'
    )
    .to(
      refs.rightHalfEl,
      {
        x: centerDeltaX,
        duration: dCfg.entranceDuration,
        ease: dCfg.entranceEase,
      },
      'entrance'
    );

  // 3. Per-letter physical collision at the seam
  tl.addLabel('collision')
    .to(
      refs.leftLetters,
      {
        scaleX: dCfg.collisionScaleX,
        skewX: dCfg.collisionSkewDeg,
        transformOrigin: 'right center',
        duration: dCfg.collisionDuration,
        stagger: { each: dCfg.collisionStagger, from: 'end' },
        ease: 'power2.out',
      },
      'collision'
    )
    .to(
      refs.rightLetters,
      {
        scaleX: dCfg.collisionScaleX,
        skewX: -dCfg.collisionSkewDeg,
        transformOrigin: 'left center',
        duration: dCfg.collisionDuration,
        stagger: { each: dCfg.collisionStagger, from: 'start' },
        ease: 'power2.out',
      },
      'collision'
    );

  // 4. Pushing motion: right half pushes left half leftward + progressive compression
  const pushedX = centerDeltaX - dCfg.pushDistancePx;
  tl.addLabel('push')
    .to(
      [refs.leftHalfEl, refs.rightHalfEl],
      {
        x: pushedX,
        duration: dCfg.pushDuration,
        ease: dCfg.pushEase,
      },
      'push'
    )
    .to(
      refs.leftLetters,
      {
        scaleX: dCfg.leftCompressScaleX,
        skewX: dCfg.collisionSkewDeg * 0.75,
        duration: dCfg.pushDuration * 0.65,
        stagger: { each: dCfg.collisionStagger, from: 'end' },
        ease: 'power1.inOut',
      },
      'push'
    )
    .to(
      refs.rightLetters,
      {
        scaleX: 0.96,
        skewX: -2,
        duration: dCfg.pushDuration * 0.65,
        ease: 'power1.out',
      },
      'push'
    );

  // 5. Elastic spring-back: left briefly pushes right back slightly
  tl.addLabel('springBack')
    .to(
      [refs.leftHalfEl, refs.rightHalfEl],
      {
        x: pushedX + dCfg.springBackOffsetPx,
        duration: dCfg.springBackDuration,
        ease: dCfg.springBackEase,
      },
      'springBack'
    )
    .to(
      [...refs.leftLetters, ...refs.rightLetters],
      {
        scaleX: 1.03,
        skewX: -2,
        duration: dCfg.springBackDuration,
        ease: 'power2.out',
      },
      'springBack'
    );

  // 6. Final glide into left-aligned resting position (x: 0)
  tl.addLabel('settle')
    .to(
      [refs.leftHalfEl, refs.rightHalfEl],
      {
        x: 0,
        duration: dCfg.settleDuration,
        ease: dCfg.settleEase,
      },
      'settle'
    )
    .to(
      [...refs.leftLetters, ...refs.rightLetters],
      {
        scaleX: 1,
        skewX: 0,
        duration: dCfg.settleDuration * 0.85,
        ease: 'power3.out',
      },
      'settle'
    );

  // 7. Portrait emerges intentionally overlapping with the pushing motion
  tl.addLabel('photoReveal', `push+=0.06`).to(
    refs.desktopPhotoEl,
    {
      opacity: 1,
      scale: 1,
      duration: dCfg.photoDuration,
      ease: dCfg.photoEase,
    },
    'photoReveal'
  );

  // 8. Member details & close button settle in
  tl.addLabel('infoReveal', `settle-=0.18`)
    .to(
      refs.infoItems,
      {
        opacity: 1,
        y: 0,
        duration: dCfg.infoDuration,
        stagger: dCfg.infoStagger,
        ease: dCfg.infoEase,
      },
      'infoReveal'
    )
    .to(
      refs.closeBtnEl,
      {
        opacity: 1,
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      },
      'infoReveal'
    );

  return tl;
}

/**
 * Builds the Mobile Cinematic Choreography (< 1024px).
 * Sequence:
 *  1. Circular reveal expands from clicked card center -> transitions to Council Navy.
 *  2. In parallel:
 *     - Member portrait emerges around center (opacity 0->1, scale 0.92->1).
 *     - Designation starts above viewport, falls vertically through foreground over the portrait
 *       down to the bottom edge of the screen with gravity easing.
 *  3. Explicit keyframe bounce: rebounds upward from bottom edge to resting slot UNDERNEATH portrait,
 *     overshooting by ~24px, followed by two diminishing bounces before settling cleanly.
 *  4. Member name, about, responsibilities, and links appear below.
 */
export function buildMobileMemberTimeline(refs, origin) {
  const circleCfg = ANIMATION_CONFIG.memberIntro.circle;
  const mCfg = ANIMATION_CONFIG.memberIntro.mobile;
  const targetScale = computeCircleCoverScale(origin);

  const vh = window.innerHeight;
  const desRect = refs.mobileDesignationEl
    ? refs.mobileDesignationEl.getBoundingClientRect()
    : { top: vh * 0.56, bottom: vh * 0.64, height: 64 };

  // Resting slot is y: 0 (directly beneath the photograph).
  // Above viewport start:
  const startAboveY = -(desRect.bottom + 48);
  // Bottom edge touch position (foreground sweep over portrait down to bottom edge):
  const bottomEdgeY = Math.max(48, vh - desRect.bottom - 14);

  const tl = gsap.timeline({ paused: true });

  tl.set(refs.circleEl, {
    x: origin.x - 50,
    y: origin.y - 50,
    scale: 0,
    backgroundColor: '#0b121e',
    opacity: 1,
  })
    .set(refs.backdropEl, { opacity: 0 })
    .set(refs.contentEl, { opacity: 1 })
    .set(refs.closeBtnEl, { opacity: 0, scale: 0.85 })
    .set(refs.mobilePhotoEl, {
      opacity: 0,
      scale: mCfg.photoScaleStart,
    })
    .set(refs.mobileDesignationEl, {
      y: startAboveY,
      opacity: 1,
      scaleY: 1,
    })
    .set(refs.infoItems, { opacity: 0, y: 16 });

  // 1. Circular expansion
  tl.addLabel('circleExpand')
    .to(refs.circleEl, {
      scale: targetScale,
      backgroundColor: '#1c2e4a',
      duration: circleCfg.duration,
      ease: circleCfg.ease,
    })
    .to(
      refs.backdropEl,
      {
        opacity: 1,
        duration: 0.2,
        ease: 'none',
      },
      `-=${0.2}`
    );

  // 2a. Portrait reveal (parallel)
  tl.addLabel('photoReveal', mCfg.photoDelay).to(
    refs.mobilePhotoEl,
    {
      opacity: 1,
      scale: 1,
      duration: mCfg.photoDuration,
      ease: mCfg.photoEase,
    },
    'photoReveal'
  );

  // 2b. Designation gravity fall from above viewport down to bottom edge (overlapping photo in foreground)
  tl.addLabel('designationFall', mCfg.fallStartDelay)
    .to(
      refs.mobileDesignationEl,
      {
        y: bottomEdgeY,
        duration: mCfg.fallDuration,
        ease: mCfg.fallEase,
      },
      'designationFall'
    )
    // Subtle squash on bottom edge impact
    .to(refs.mobileDesignationEl, {
      scaleY: 0.88,
      scaleX: 1.05,
      transformOrigin: 'center bottom',
      duration: 0.08,
      ease: 'power2.out',
    });

  // 3. Explicit authored keyframe bounce upward to resting slot beneath portrait (y = 0)
  // Overshoot resting slot by ~24px -> bounce down -> smaller bounce up -> settle at 0
  tl.addLabel('rebound')
    .to(refs.mobileDesignationEl, {
      y: -mCfg.bounceOvershootPx,
      scaleY: 1.04,
      scaleX: 0.98,
      duration: mCfg.reboundUpDuration,
      ease: mCfg.reboundUpEase,
    })
    .to(refs.mobileDesignationEl, {
      y: mCfg.bounce1DownOffsetPx,
      scaleY: 0.97,
      scaleX: 1.01,
      duration: mCfg.bounce1DownDuration,
      ease: 'power2.inOut',
    })
    .to(refs.mobileDesignationEl, {
      y: -mCfg.bounce2UpOffsetPx,
      scaleY: 1.01,
      scaleX: 1,
      duration: mCfg.bounce2UpDuration,
      ease: 'power2.out',
    })
    .to(refs.mobileDesignationEl, {
      y: 0,
      scaleY: 1,
      scaleX: 1,
      duration: mCfg.settleDuration,
      ease: 'power2.out',
    });

  // 4. Member info & close button appear below settled designation
  tl.addLabel('infoReveal', `+=${mCfg.infoDelay}`)
    .to(
      refs.infoItems,
      {
        opacity: 1,
        y: 0,
        duration: mCfg.infoDuration,
        stagger: mCfg.infoStagger,
        ease: mCfg.infoEase,
      },
      'infoReveal'
    )
    .to(
      refs.closeBtnEl,
      {
        opacity: 1,
        scale: 1,
        duration: 0.28,
        ease: 'power2.out',
      },
      'infoReveal'
    );

  return tl;
}
