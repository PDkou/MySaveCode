import { describe, expect, it } from 'vitest';

import { levelForPoints, pointsIntoLevel, pointsNeededForLevel, titleCategoryForKey } from './gamification';

// First automated tests in this codebase (2026-08, "테스트하자" -- the app
// had zero automated test coverage before this). Starts with the purest,
// lowest-risk-to-mock logic: the level-curve math and the title-tab
// classifier, neither of which touch Supabase, so no client/RPC mocking is
// needed to get real coverage. Points/level constants live in
// gamification.ts itself (LEVEL_BASE_POINTS=100, LEVEL_INCREMENT=50) --
// expected values below are hand-derived from that formula
// (levelUpCost(level) = 100 + (level-1)*50), not just copied from the
// implementation, so a regression in the formula itself would actually
// fail these.
describe('levelForPoints / pointsIntoLevel / pointsNeededForLevel', () => {
  it('starts at level 1 with 0 points', () => {
    expect(levelForPoints(0)).toBe(1);
    expect(pointsIntoLevel(0)).toBe(0);
    expect(pointsNeededForLevel(0)).toBe(100);
  });

  it('stays at level 1 just below the level-2 threshold (100)', () => {
    expect(levelForPoints(99)).toBe(1);
    expect(pointsIntoLevel(99)).toBe(99);
  });

  it('reaches level 2 exactly at 100 points, with a fresh (higher) threshold', () => {
    expect(levelForPoints(100)).toBe(2);
    expect(pointsIntoLevel(100)).toBe(0);
    expect(pointsNeededForLevel(100)).toBe(150);
  });

  it('stays at level 2 just below the level-3 threshold (100 + 150 = 250)', () => {
    expect(levelForPoints(249)).toBe(2);
    expect(pointsIntoLevel(249)).toBe(149);
  });

  it('reaches level 3 exactly at 250 points, each level costing 50 more than the last', () => {
    expect(levelForPoints(250)).toBe(3);
    expect(pointsIntoLevel(250)).toBe(0);
    expect(pointsNeededForLevel(250)).toBe(200);
  });
});

describe('titleCategoryForKey', () => {
  it('classifies a key from each of the 4 static category lists', () => {
    expect(titleCategoryForKey('specific_first')).toBe('specific');
    expect(titleCategoryForKey('everyone_first')).toBe('everyone');
    expect(titleCategoryForKey('first_come_first')).toBe('firstCome');
    expect(titleCategoryForKey('newcomer')).toBe('other');
  });

  it('falls back to "other" for null or an unrecognized key', () => {
    expect(titleCategoryForKey(null)).toBe('other');
    expect(titleCategoryForKey('some_future_title_nobody_categorized_yet')).toBe('other');
  });
});
