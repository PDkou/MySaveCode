import { useLayoutEffect, useRef, useState } from 'react';
import { HomeScreen, type HomeDrawerCard } from './HomeScreen';
import { ResponsiveBottomNav } from '../components/ResponsiveBottomNav';
import { getAppScale } from '../components/appScale';
import type { ThemeId } from '../flow/theme';
import { t } from '../i18n';

const noop = () => undefined;
const PHONE_WIDTH = 390;
const TOP_CROP = 300; // the top of the real home screen: brand, counts, "내 서랍" and the first row of cards
const NAV_HEIGHT = 94;

/**
 * A real piece of the app drawn in the theme being looked at: the approved home screen (its top part) and the approved bottom nav,
 * marked `data-preview-theme` so their accent colours and pictures follow that theme instead of the page's own. It is a picture of
 * the app, not a control: nothing in it can be pressed.
 */
export function ThemeLivePreview({ theme, drawers }: { theme: ThemeId; drawers: HomeDrawerCard[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.7);
  useLayoutEffect(() => {
    const measure = () => {
      // the page's height in layout pixels, minus what the rest of the page needs, shared out to the preview
      const h = window.innerHeight / getAppScale();
      setK(Math.max(0.5, Math.min(0.9, (h - 520) / (TOP_CROP + NAV_HEIGHT))));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  const cards = drawers.length > 0 ? drawers.slice(0, 4) : SAMPLE_CARDS();
  return (
    <div
      ref={hostRef}
      className="ts39-live"
      data-preview-theme={theme}
      aria-hidden="true"
      style={{ width: PHONE_WIDTH * k, height: (TOP_CROP + NAV_HEIGHT) * k }}
    >
      <div className="ts39-live-phone" style={{ transform: `scale(${k})` }}>
        <div className="ts39-live-top"><HomeScreen drawers={cards} totalRecords={cards.reduce((n, c) => n + c.recordCount, 0)} /></div>
        <div className="ts39-live-nav"><ResponsiveBottomNav active="home" onNavigate={noop} onCreateDrawer={noop} /></div>
      </div>
    </div>
  );
}

function SAMPLE_CARDS(): HomeDrawerCard[] {
  return [
    { id: 'p1', name: t('화장품'), iconKey: 'cosmetics', colorKey: 'pink', recordCount: 3 },
    { id: 'p2', name: t('책'), iconKey: 'books', colorKey: 'blue', recordCount: 5 },
    { id: 'p3', name: t('식물'), iconKey: 'plants', colorKey: 'green', recordCount: 2 },
    { id: 'p4', name: t('여행'), iconKey: 'travel', colorKey: 'peach', recordCount: 4 },
  ];
}
