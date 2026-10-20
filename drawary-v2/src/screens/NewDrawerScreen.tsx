import { useState } from 'react';
import './NewDrawerScreen.css';
import { MAX_DRAWER_NAME_LENGTH } from '../data/types';
import { t } from '../i18n';

interface DrawerIconOption {
  key: string;
  src: string;
}

const ICON_OPTIONS: DrawerIconOption[] = [
  { key: 'cosmetics', src: '/assets/drawer-icons/drawer_icon_cosmetics.webp' },
  { key: 'books', src: '/assets/drawer-icons/drawer_icon_books.webp' },
  { key: 'plants', src: '/assets/drawer-icons/drawer_icon_plants.webp' },
  { key: 'travel', src: '/assets/drawer-icons/drawer_icon_travel.webp' },
  { key: 'finance', src: '/assets/drawer-icons/drawer_icon_finance.webp' },
  { key: 'cafe', src: '/assets/drawer-icons/drawer_icon_cafe.webp' },
  { key: 'camera', src: '/assets/drawer-icons/drawer_icon_camera.webp' },
  { key: 'pets', src: '/assets/drawer-icons/drawer_icon_pets.webp' },
  { key: 'shopping', src: '/assets/drawer-icons/drawer_icon_shopping.webp' },
  { key: 'misc', src: '/assets/drawer-icons/drawer_icon_misc.webp' },
];

const COLOR_OPTIONS = [
  { key: 'pink', hex: '#fadddd' },
  { key: 'lavender', hex: '#e7e0f7' },
  { key: 'green', hex: '#dfeeda' },
  { key: 'peach', hex: '#f8e8d4' },
  { key: 'yellow', hex: '#f7e8b9' },
  { key: 'blue', hex: '#ddebfb' },
] as const;

interface NewDrawerScreenProps {
  /** Values to start from, so coming back from #09 keeps what was typed. */
  initial?: { name: string; icon: string; color: string };
  onNext: (draft: { name: string; icon: string; color: string }) => void;
  onDismiss: () => void;
}

/**
 * #08 새 서랍 만들기 (name/icon/color), the real first step of the
 * create-drawer flow -- it precedes #09's field setup, which this app
 * previously jumped straight into. No approved source exists; its own
 * STATUS.md classifies it `NO_FINAL_CODE_IMAGE_ONLY` ("Locate final
 * approved source; do not invent UI"). Reconstructed as real React/CSS
 * from `Drawary_08_PreInheritance_Confirmed.png` as a bottom sheet over
 * a dimmed Home, reusing #11's established modal-sheet convention
 * (backdrop + rounded-top sheet + drag handle, same handle size/color).
 *
 * All 10 icons in the reference map to real approved
 * `drawer-icons/*.webp` assets (checked each one visually, including
 * the "•••" tile which is genuinely `drawer_icon_misc.webp`, not a
 * placeholder) -- no reconstruction needed here, unlike #06's reorder
 * icon. The 6 swatch colors were sampled directly from the reference.
 *
 * A 2026-10-15 source audit recovered the real pre-inheritance
 * `AddDrawerModal.tsx` (2026-10-04), confirming this reconstruction's
 * copy/icons/colors independently, and also surfacing one real gap: its
 * "다음" button is `disabled={!name.trim()}`. Applied the same guard
 * below -- it was missing here.
 */
export function NewDrawerScreen({ initial, onNext, onDismiss }: NewDrawerScreenProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? ICON_OPTIONS[9].key);
  const [color, setColor] = useState<string>(initial?.color ?? 'pink');

  return (
    <div className="new-drawer-overlay">
      <button type="button" className="new-drawer-backdrop" aria-label={t('닫기')} onClick={onDismiss} />
      <div className="new-drawer-sheet" role="dialog" aria-label={t('새 서랍 만들기')}>
        <div className="new-drawer-handle" />
        <h1>{t('새 서랍 만들기')}</h1>
        <p className="new-drawer-subtitle">{t('먼저 서랍의 이름과 분위기를 정해보세요.')}</p>

        <label className="new-drawer-label" htmlFor="new-drawer-name">{t('서랍 이름')}</label>
        <div className="new-drawer-input-wrap">
          <input
            id="new-drawer-name"
            className="new-drawer-input"
            type="text"
            placeholder={t('예: 화장품')}
            value={name}
            maxLength={MAX_DRAWER_NAME_LENGTH}
            onChange={(e) => setName(e.target.value)}
          />
          {/* 2026-10-20: user-approved addition, styled like #10's name counter. */}
          <span className="new-drawer-count" aria-hidden="true">{name.length}/{MAX_DRAWER_NAME_LENGTH}</span>
        </div>

        <span className="new-drawer-label">{t('아이콘')}</span>
        <div className="new-drawer-icon-grid">
          {ICON_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`new-drawer-icon${icon === opt.key ? ' is-selected' : ''}`}
              aria-pressed={icon === opt.key}
              aria-label={opt.key}
              onClick={() => setIcon(opt.key)}
            >
              <img src={opt.src} alt="" />
            </button>
          ))}
        </div>

        <span className="new-drawer-label">{t('서랍 색상')}</span>
        <div className="new-drawer-color-row">
          {COLOR_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={`new-drawer-swatch${color === opt.key ? ' is-selected' : ''}`}
              style={{ background: opt.hex }}
              aria-pressed={color === opt.key}
              aria-label={opt.key}
              onClick={() => setColor(opt.key)}
            />
          ))}
        </div>

        <button
          type="button"
          className="new-drawer-next"
          disabled={!name.trim()}
          onClick={() => onNext({ name: name.trim(), icon, color })}
        >
          
          {t('다음')}
        </button>
      </div>
    </div>
  );
}
