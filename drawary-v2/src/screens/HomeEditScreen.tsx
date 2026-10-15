import './HomeEditScreen.css';
import { FixedCanvas } from '../components/FixedCanvas';

type DrawerId = 'cosmetics' | 'books' | 'plants' | 'travel' | 'other';

type DrawerOverlay = { id: DrawerId; left: number; top: number };

const EDIT_DRAWERS: DrawerOverlay[] = [
  { id: 'cosmetics', left: 22, top: 145 },
  { id: 'books', left: 203, top: 145 },
  { id: 'plants', left: 22, top: 317 },
  { id: 'travel', left: 203, top: 317 },
  { id: 'other', left: 22, top: 489 },
];

interface HomeEditScreenProps {
  onDone: () => void;
  onDeleteDrawer: (id: DrawerId) => void;
  onReorderDrawer: (id: DrawerId) => void;
  onCreateDrawer: () => void;
}

/**
 * #06 홈 편집 모드. Source: `HomeEditMode_CANDIDATE_V3.tsx` /
 * `home-edit-mode-v3.css` (candidate, needs-parity per its STATUS.md),
 * reusing #03's same confirmed base image as a delta overlay, same as the
 * candidate's own intent ("#3 confirmed home is the immutable visual
 * base. Edit controls are added as a delta only.").
 *
 * The "완료" button went through two revisions this session, both
 * against the V3 candidate's plain transparent text link:
 * 1) `Drawary_06_Home_Edit_V14.png` showed it as a filled lavender pill;
 *    implemented that first.
 * 2) The user then re-approved a newer image,
 *    `06_Home_Edit_USER_APPROVED_2026-10-15.png` (per that package's own
 *    README: "06번은 pill 제거 후 완료 텍스트를 내 서랍과 수평 정렬한
 *    이미지로 새롭게 확정"), which removes the pill entirely and
 *    right-aligns a smaller plain-text "완료" on the same row as the
 *    base image's "내 서랍" heading. That supersedes V14 and is what's
 *    implemented now. Per that package's own caveat, this reference
 *    image is a user-approved generated image, not a claimed browser
 *    code render -- so it's a design target, not a pixel-diff baseline.
 *
 * The reorder-icon asset the candidate TSX references
 * (`./assets/icon_reorder.svg`) was never actually present in that
 * archive, and no equivalent exists among the 294 approved WebP assets.
 * Reconstructed here as an inline SVG matching V14's pixel glyph exactly
 * (3 equal bars + a vertical double-arrow, solid #8C74E8) -- same
 * CSS-glyph-reconstruction approach already used for #11's reorder
 * handle. This is new code, not an approved binary; flagged here rather
 * than guessed at silently.
 */
export function HomeEditScreen({ onDone, onDeleteDrawer, onReorderDrawer, onCreateDrawer }: HomeEditScreenProps) {
  return (
    <FixedCanvas height={750}>
      <div className="home-edit-crop">
        <img
          src="/assets/home/home_footer_centered.webp"
          alt="Drawary 홈 편집 모드"
          width={390}
          height={844}
          draggable={false}
          className="home-edit-img"
        />

        <span className="home-edit-mask" aria-hidden="true" />
        <button type="button" className="home-edit-done" onClick={onDone}>완료</button>

        {EDIT_DRAWERS.map((drawer) => (
          <div key={drawer.id} className="home-edit-card-controls" style={{ left: drawer.left, top: drawer.top }}>
            <button
              type="button"
              className="home-edit-action home-edit-action--delete"
              onClick={() => onDeleteDrawer(drawer.id)}
              aria-label={`${drawer.id} 서랍 삭제`}
            >
              <img src="/assets/ui-icons/icon_delete.webp" alt="" />
            </button>
            <button
              type="button"
              className="home-edit-action home-edit-action--reorder"
              onClick={() => onReorderDrawer(drawer.id)}
              aria-label={`${drawer.id} 서랍 순서 변경`}
            >
              <ReorderGlyph />
            </button>
          </div>
        ))}

        <button
          type="button"
          className="home-edit-create-hotspot"
          onClick={onCreateDrawer}
          aria-label="새 서랍 만들기"
        />
      </div>
    </FixedCanvas>
  );
}

function ReorderGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true">
      <rect x="2" y="4.5" width="13" height="3" rx="1.5" fill="#8C74E8" />
      <rect x="2" y="10.5" width="13" height="3" rx="1.5" fill="#8C74E8" />
      <rect x="2" y="16.5" width="13" height="3" rx="1.5" fill="#8C74E8" />
      <path d="M19.5 3 L22 7 H17 Z" fill="#8C74E8" />
      <rect x="18.7" y="6.5" width="1.6" height="11" fill="#8C74E8" />
      <path d="M19.5 21 L17 17 H22 Z" fill="#8C74E8" />
    </svg>
  );
}
