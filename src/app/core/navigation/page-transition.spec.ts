import { describe, expect, it } from 'vitest';
import { appPageTransition } from './page-transition';

describe('appPageTransition', () => {
  it('should return an empty animation when enteringEl is not provided', () => {
    const baseEl = document.createElement('div');
    const animation = appPageTransition(baseEl, undefined);

    expect(animation).toBeDefined();
    expect(animation.childAnimations).toHaveLength(0);
  });

  it('should build a forward animation with entering and leaving elements', () => {
    const baseEl = document.createElement('div');
    const enteringEl = document.createElement('div');
    const leavingEl = document.createElement('div');

    const animation = appPageTransition(baseEl, {
      enteringEl,
      leavingEl,
      direction: 'forward'
    });

    expect(animation).toBeDefined();
    expect(animation.childAnimations).toHaveLength(2);
    expect(animation.getDuration()).toBe(320);
  });

  it('should build a back animation with entering and leaving elements', () => {
    const baseEl = document.createElement('div');
    const enteringEl = document.createElement('div');
    const leavingEl = document.createElement('div');

    const animation = appPageTransition(baseEl, {
      enteringEl,
      leavingEl,
      direction: 'back'
    });

    expect(animation).toBeDefined();
    expect(animation.childAnimations).toHaveLength(2);
  });

  it('should respect custom duration and easing if provided', () => {
    const baseEl = document.createElement('div');
    const enteringEl = document.createElement('div');

    const animation = appPageTransition(baseEl, {
      enteringEl,
      duration: 250,
      easing: 'linear'
    });

    expect(animation.getDuration()).toBe(250);
    expect(animation.getEasing()).toBe('linear');
  });
});

