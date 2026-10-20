import './HomeScreen.css';
import { FixedCanvas } from '../components/FixedCanvas';
import { t } from '../i18n';

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
        <img
          src="/assets/home/home_empty_candidate.webp"
          alt={t('Drawary 홈 빈 상태')}
          width={390}
          height={844}
          draggable={false}
          className="home-screen-img"
        />
        <button
          type="button"
          aria-label={t('첫 서랍 만들기')}
          onClick={onCreateDrawer}
          className="home-screen-hotspot"
          style={{ left: 32, top: 452, width: 326, height: 57 }}
        />
      </div>
    </FixedCanvas>
  );
}
