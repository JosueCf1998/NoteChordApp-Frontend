import { Animation, createAnimation } from '@ionic/angular';

export interface PageTransitionOptions {
  enteringEl: HTMLElement;
  leavingEl?: HTMLElement;
  direction?: 'forward' | 'back' | 'root';
  duration?: number;
  easing?: string;
}

/**
 * Native-feeling iOS page slide transition.
 *
 * Animates the full page element (including custom headers and floating buttons)
 * so that controls never get detached or linger stationary over adjacent pages.
 */
export const appPageTransition = (
  _baseEl: HTMLElement,
  opts?: PageTransitionOptions
): Animation => {
  const rootAnimation = createAnimation();

  if (!opts?.enteringEl) {
    return rootAnimation;
  }

  const isRTL = document.dir === 'rtl';
  const isBack = opts.direction === 'back';
  const DURATION = 320;
  const EASING = 'cubic-bezier(0.32, 0.72, 0, 1)';

  rootAnimation
    .duration(opts.duration ?? DURATION)
    .easing(opts.easing ?? EASING)
    .fill('both');

  const enteringPage = createAnimation()
    .addElement(opts.enteringEl)
    .beforeRemoveClass('ion-page-invisible')
    .beforeRemoveClass('ion-page-hidden');

  if (isBack) {
    // Navigating back: entering page slides in subtly from the left
    enteringPage
      .beforeStyles({ 'z-index': '10', display: 'flex' })
      .fromTo('transform', `translateX(${isRTL ? '25%' : '-25%'})`, 'translateX(0%)')
      .fromTo('opacity', 0.92, 1)
      .afterClearStyles(['transform', 'opacity', 'z-index', 'display']);
  } else {
    // Navigating forward: entering page slides in from the right edge with a soft drop shadow
    enteringPage
      .beforeStyles({
        'z-index': '11',
        display: 'flex',
        'box-shadow': isRTL ? '4px 0 20px rgba(0, 0, 0, 0.12)' : '-4px 0 20px rgba(0, 0, 0, 0.12)'
      })
      .fromTo('transform', `translateX(${isRTL ? '-100%' : '100%'})`, 'translateX(0%)')
      .fromTo('opacity', 1, 1)
      .afterClearStyles(['transform', 'opacity', 'box-shadow', 'z-index', 'display']);
  }

  rootAnimation.addAnimation(enteringPage);

  if (opts.leavingEl) {
    const leavingPage = createAnimation().addElement(opts.leavingEl);

    if (isBack) {
      // Navigating back: leaving page slides completely off to the right and is hidden immediately
      // without clearing transform to prevent it from snapping back into view before destruction.
      leavingPage
        .beforeStyles({
          'z-index': '11',
          'box-shadow': isRTL ? '4px 0 20px rgba(0, 0, 0, 0.12)' : '-4px 0 20px rgba(0, 0, 0, 0.12)'
        })
        .fromTo('transform', 'translateX(0%)', `translateX(${isRTL ? '-100%' : '100%'})`)
        .fromTo('opacity', 1, 1)
        .afterStyles({ display: 'none' })
        .afterClearStyles(['box-shadow', 'z-index']);

      rootAnimation.afterAddWrite(() => {
        if (opts.leavingEl) {
          opts.leavingEl.style.setProperty('display', 'none');
        }
      });
    } else {
      // Navigating forward: leaving page slides slightly to the left and dims
      leavingPage
        .beforeStyles({ 'z-index': '10' })
        .fromTo('transform', 'translateX(0%)', `translateX(${isRTL ? '25%' : '-25%'})`)
        .fromTo('opacity', 1, 0.92)
        .afterClearStyles(['transform', 'opacity', 'z-index']);
    }

    rootAnimation.addAnimation(leavingPage);
  }

  return rootAnimation;
};

