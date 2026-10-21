import './HomeScreen.css';
import { FixedCanvas } from '../components/FixedCanvas';
import { t, tl } from '../i18n';

// Ported from the user-approved HomeEmpty_FINAL_CONFIRMED.tsx (screen #4,
// confirmed 2026-10-08), same two adaptations as HomeScreen.tsx: crop to
// the top 750px so the real ResponsiveBottomNav supplies the footer
// instead of the image's baked-in one, and the asset path moved under
// /assets/home/. Not yet wired as the live '#/home' conditional -- there is
// no real drawer count to decide empty-vs-filled against until V2-12 (data
// layer). Exposed at its own QA route (#/home-empty) for now.
export function HomeEmptyScreen({ onCreateDrawer }: { onCreateDrawer: () => void }) {
  return (
    <FixedCanvas height={750}>
      <div className="home-screen-crop">
        {/* The mascot picture on flat cream (new high-resolution art, 2026-10-21). The logo and the texts below are real,
            so they follow the theme and the app language. */}
        <img
          src="/assets/home/home_empty_art.webp"
          alt=""
          width={390}
          height={844}
          draggable={false}
          className="home-screen-img"
        />
        <img className="hs-brand" src="/assets/brand/brand_lockup_horizontal.webp" alt="Drawary" draggable={false} />
        <p className="hs-tagline">{t('나만의 소중한 것들을, 더 특별하게')}</p>
        <h2 className="he-title">{t('아직 만든 서랍이 없어요.')}</h2>
        <p className="he-sub">{tl('정리하고 싶은 것부터\n하나 만들어보세요.')}</p>
        <button type="button" className="he-cta" onClick={onCreateDrawer}>+ {t('첫 서랍 만들기')}</button>
      </div>
    </FixedCanvas>
  );
}
