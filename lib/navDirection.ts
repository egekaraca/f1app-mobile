// lib/navDirection.ts
// Set the desired Stack animation BEFORE calling router.push() so the
// target screen reads the correct value when it first renders.

export type NavAnimation = 'slide_from_right' | 'slide_from_left';

let _animation: NavAnimation = 'slide_from_right';

export const setNavAnimation = (a: NavAnimation) => { _animation = a; };
export const getNavAnimation = (): NavAnimation => _animation;
