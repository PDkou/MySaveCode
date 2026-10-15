import './HomeScreen.css';
import { FixedCanvas } from '../components/FixedCanvas';

// Ported from the user-approved Home_FINAL_CONFIRMED.tsx (screen #3,
// confirmed 2026-10-08; CONFIRMED_STATUS.txt: 화면/코드 상태 모두 확정).
// Two deliberate integration adaptations, neither altering the confirmed
// pixels:
// 1) The confirmed component renders the full 390x844 image including its
//    own baked-in bottom nav, with hotspots for home/search/+/stats/settings
//    laid over it. CLAUDE.md rule 6 says the real V4 ResponsiveBottomNav is
//    already built and "visible on tab screens only" -- App.tsx already
//    wraps every tab route (including 'home') in it. Rendering both would
//    double the nav. The README's own "+10px" footer recalibration note
//    exists specifically so the baked image's footer lines up with the real
//    nav component's position -- i.e. this swap was the intended endpoint.
//    So: crop to the top 750px (844 - the nav's documented 94px height) via
//    a clipped container, and drop only the bottom-nav hotspots (home/
//    search/center-add/stats/settings); every content hotspot above that
//    line is kept exactly as confirmed.
// 2) Asset path changed from the archive's relative `./home_footer_centered.webp`
//    to this app's `/assets/home/` convention.
export type HomeAction = 'edit' | 'open-cosmetics' | 'open-books' | 'open-plants' | 'open-travel' | 'open-other' | 'create-drawer';

export function HomeScreen({ onAction }: { onAction: (action: HomeAction) => void }) {
  return (
    <FixedCanvas height={750}>
      <div className="home-screen-crop">
        <img
          src="/assets/home/home_footer_centered.webp"
          alt="Drawary 홈"
          width={390}
          height={844}
          draggable={false}
          className="home-screen-img"
        />

        <Hotspot label="편집" left={313} top={105} width={60} height={38} onClick={() => onAction('edit')} />
        <Hotspot label="화장품 서랍" left={22} top={145} width={165} height={158} onClick={() => onAction('open-cosmetics')} />
        <Hotspot label="책 서랍" left={203} top={145} width={165} height={158} onClick={() => onAction('open-books')} />
        <Hotspot label="식물 서랍" left={22} top={317} width={165} height={158} onClick={() => onAction('open-plants')} />
        <Hotspot label="여행 서랍" left={203} top={317} width={165} height={158} onClick={() => onAction('open-travel')} />
        <Hotspot label="소중한 것들 서랍" left={22} top={489} width={165} height={158} onClick={() => onAction('open-other')} />
        <Hotspot label="새 서랍 만들기" left={203} top={489} width={165} height={158} onClick={() => onAction('create-drawer')} />
      </div>
    </FixedCanvas>
  );
}

function Hotspot(props: { label: string; left: number; top: number; width: number; height: number; onClick: () => void }) {
  const { label, left, top, width, height, onClick } = props;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="home-screen-hotspot"
      style={{ left, top, width, height }}
    />
  );
}
