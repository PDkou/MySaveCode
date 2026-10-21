import { describe, expect, it } from 'vitest';
import { appScaleFor, isTabletWindow, isWideWindow, layoutKindFor } from './appScale';

describe('tablet magnification', () => {
  it('leaves every phone alone, in any orientation', () => {
    for (const [w, h] of [[390, 844], [393, 780], [360, 640], [844, 390], [345, 882], [412, 915]]) expect(appScaleFor(w, h)).toBe(1);
  });
  it('magnifies a portrait tablet to what fits the 430 px column and the 844 px screen height, at most 2', () => {
    expect(appScaleFor(800, 1280)).toBe(1.52);
    expect(appScaleFor(834, 1194)).toBe(1.41);
    expect(appScaleFor(1200, 2400)).toBe(2);
  });
  it('does not magnify a near-square foldable (the full screen only fits by height there)', () => {
    expect(appScaleFor(690, 829)).toBe(1);
  });
  it('draws the sidebar layouts on a landscape tablet or unfolded foldable and magnifies them as one piece', () => {
    expect(isWideWindow(1280, 800)).toBe(true);
    expect(isWideWindow(1024, 768)).toBe(true);
    expect(isWideWindow(837, 697)).toBe(true);
    expect(appScaleFor(1280, 800)).toBe(1.0);
    expect(appScaleFor(1920, 1200)).toBe(1.42);
    expect(appScaleFor(2560, 1600)).toBe(1.9);
  });
  it('keeps phones, portrait tablets and near-square windows out of the wide layout', () => {
    for (const [w, h] of [[844, 390], [915, 412], [800, 1280], [690, 829], [884, 884], [884, 800]]) expect(isWideWindow(w, h)).toBe(false);
  });
  it('gives landscape phones (not tablets) the land layout', () => {
    expect(layoutKindFor(844, 390)).toBe('land');
    expect(layoutKindFor(915, 412)).toBe('land');
    expect(layoutKindFor(360, 780)).toBe('single');
    expect(layoutKindFor(1280, 800)).toBe('wide');
    expect(layoutKindFor(800, 1280)).toBe('single');
  });
  it('uses 600 dp on the shorter side as the tablet line', () => {
    expect(isTabletWindow(599, 1200)).toBe(false);
    expect(isTabletWindow(600, 900)).toBe(true);
  });
});
