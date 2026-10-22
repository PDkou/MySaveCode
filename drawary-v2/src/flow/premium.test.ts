import { describe, expect, it } from 'vitest';
import { FREE_DRAWER_LIMIT, gateForRoute, isPremium, supportProductId, themeFor } from './premium';

describe('Free / Premium limits', () => {
  it('lets Free create drawers up to the limit, then asks for Premium', () => {
    expect(gateForRoute('create-drawer', { premium: false, drawerCount: FREE_DRAWER_LIMIT - 1 })).toBeNull();
    expect(gateForRoute('create-drawer', { premium: false, drawerCount: FREE_DRAWER_LIMIT })).toBe('drawers');
    expect(gateForRoute('templates', { premium: false, drawerCount: FREE_DRAWER_LIMIT })).toBe('drawers');
  });
  it('locks repeat for Free only', () => {
    expect(gateForRoute('recurrence-management', { premium: false, drawerCount: 0 })).toBe('repeat');
    expect(gateForRoute('recurrence-management', { premium: true, drawerCount: 0 })).toBeNull();
  });
  it('never locks anything for Premium, and never the screens that only read or store', () => {
    expect(gateForRoute('create-drawer', { premium: true, drawerCount: 99 })).toBeNull();
    for (const r of ['home', 'drawer-detail', 'table-view', 'data-management', 'search']) expect(gateForRoute(r, { premium: false, drawerCount: 99 })).toBeNull();
  });
  it('reads the saved purchase flag strictly', () => {
    expect(isPremium({ premium: true })).toBe(true);
    expect(isPremium({ premium: 'true' })).toBe(false);
    expect(isPremium({})).toBe(false);
  });
  it('shows Lavender to Free and the saved theme to Premium', () => {
    expect(themeFor('coral', false)).toBe('lavender');
    expect(themeFor('coral', true)).toBe('coral');
  });
  it('maps the support buttons to the Play products', () => {
    expect(supportProductId('coffee')).toBe('support_coffee');
    expect(supportProductId('latte')).toBe('support_latte');
    expect(supportProductId({ amount: 0 })).toBe('support_tip_1');
    expect(supportProductId({ amount: 5 })).toBe('support_tip_6');
  });
});
