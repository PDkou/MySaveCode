import { describe, expect, it } from 'vitest';
import { appScaleFor, isTabletWindow } from './appScale';

describe('tablet magnification', () => {
  it('leaves every phone alone, in any orientation', () => {
    for (const [w, h] of [[390, 844], [393, 780], [360, 640], [844, 390], [345, 882], [412, 915]]) expect(appScaleFor(w, h)).toBe(1);
  });
  it('magnifies a portrait tablet to what fits the 430 px column and the 844 px screen height, at most 2', () => {
    expect(appScaleFor(800, 1280)).toBe(1.52);
    expect(appScaleFor(834, 1194)).toBe(1.41);
    expect(appScaleFor(1200, 2400)).toBe(2);
  });
  it('does not magnify a landscape tablet or a near-square foldable (the full screen only fits by height there)', () => {
    expect(appScaleFor(1280, 800)).toBe(1);
    expect(appScaleFor(690, 829)).toBe(1);
  });
  it('uses 600 dp on the shorter side as the tablet line', () => {
    expect(isTabletWindow(599, 1200)).toBe(false);
    expect(isTabletWindow(600, 900)).toBe(true);
  });
});
