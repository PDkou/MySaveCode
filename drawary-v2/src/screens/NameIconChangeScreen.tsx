import { useMemo, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './NameIconChangeScreen.css';
import { t, K } from '../i18n';

export interface DrawerIconOption {
  id: string;
  asset: string;
  label: string;
}

export interface NameIconChangeScreenProps {
  initialName: string;
  initialIconId: string;
  icons?: DrawerIconOption[];
  maxNameLength?: number;
  onBack?: () => void;
  onSave?: (value: { name: string; iconId: string }) => void;
}

const ICON_DIR = '/assets/drawer-icons/';

export const DEFAULT_DRAWER_ICON_OPTIONS: DrawerIconOption[] = [
  ['cosmetics', 'drawer_icon_cosmetics.webp', K('화장품')],
  ['books', 'drawer_icon_books.webp', K('책')],
  ['plants', 'drawer_icon_plants.webp', K('식물')],
  ['travel', 'drawer_icon_travel.webp', K('여행')],
  ['clothes', 'drawer_icon_clothes.webp', K('옷')],
  ['cafe', 'drawer_icon_cafe.webp', K('카페')],
  ['camera', 'drawer_icon_camera.webp', K('사진')],
  ['pets', 'drawer_icon_pets.webp', K('반려동물')],
  ['home', 'drawer_icon_home.webp', K('집')],
  ['food', 'drawer_icon_food.webp', K('음식')],
  ['finance', 'drawer_icon_finance.webp', K('금융')],
  ['electronics', 'drawer_icon_electronics.webp', K('전자제품')],
  ['games', 'drawer_icon_games.webp', K('게임')],
  ['music', 'drawer_icon_music.webp', K('음악')],
  ['gifts', 'drawer_icon_gifts.webp', K('선물')],
  ['health', 'drawer_icon_health.webp', K('건강')],
  ['fitness', 'drawer_icon_fitness.webp', K('운동')],
  ['car', 'drawer_icon_car.webp', K('자동차')],
  ['documents', 'drawer_icon_documents.webp', K('문서')],
  ['shopping', 'drawer_icon_shopping.webp', K('쇼핑')],
  ['movies', 'drawer_icon_movies.webp', K('영화')],
  ['hobby', 'drawer_icon_hobby.webp', K('취미')],
  ['baby', 'drawer_icon_baby.webp', K('육아')],
  ['misc', 'drawer_icon_misc.webp', K('기타')],
].map(([id, asset, label]) => ({ id, asset, label }));

/**
 * #25 서랍 이름 / 아이콘 변경. Ported from
 * `Drawary_25_FINAL_CONFIRMED_CODE`'s `NameIconChange.tsx`/
 * `name-icon-change.css` -- only the icon asset path changed, from the
 * archive's flat `/assets/drawer_icon_*.webp` convention to this app's
 * actual nested `/assets/drawer-icons/` directory (the 24 icons
 * themselves are the same already-imported approved WebP set #09/#24
 * use). Reached from #24's "서랍 이름 / 아이콘 변경" row; per CONFIRMED.md,
 * saving returns to #24 and its header info updates immediately (App.tsx
 * holds the shared name/icon state, not local to either screen).
 */
export function NameIconChangeScreen({
  initialName,
  initialIconId,
  icons = DEFAULT_DRAWER_ICON_OPTIONS,
  maxNameLength = 20,
  onBack,
  onSave,
}: NameIconChangeScreenProps) {
  const [name, setName] = useState(initialName);
  const [iconId, setIconId] = useState(initialIconId);

  const selected = useMemo(
    () => icons.find((icon) => icon.id === iconId) ?? icons[0],
    [icons, iconId]
  );

  const trimmed = name.trim();
  const changed = trimmed !== initialName.trim() || iconId !== initialIconId;
  const canSave = trimmed.length > 0 && changed;

  return (
    <main className="nic-page">
      <ScreenHeader title={t('서랍 이름 / 아이콘 변경')} onBack={onBack} height={61} />

      <section className="nic-preview" aria-label={t('변경 미리보기')}>
        <div className="nic-preview-icon">
          <img src={`${ICON_DIR}${selected.asset}`} alt="" />
        </div>
        <div>
          <span>{t('변경 미리보기')}</span>
          <strong>{trimmed || t('서랍 이름')}</strong>
        </div>
      </section>

      <section className="nic-section">
        <div className="nic-section-title">
          <strong>{t('서랍 이름')}</strong>
          <span>{name.length} / {maxNameLength}</span>
        </div>
        <input
          className="nic-name-input"
          value={name}
          maxLength={maxNameLength}
          placeholder={t('서랍 이름을 입력해주세요.')}
          onChange={(e) => setName(e.target.value)}
        />
      </section>

      <section className="nic-section nic-icon-section">
        <div className="nic-section-title">
          <strong>{t('아이콘')}</strong>
          <span>{t('하나를 골라주세요.')}</span>
        </div>
        <div className="nic-icon-grid">
          {icons.map((icon) => (
            <button
              type="button"
              key={icon.id}
              className={`nic-icon-option${icon.id === selected.id ? ' is-selected' : ''}`}
              onClick={() => setIconId(icon.id)}
              aria-label={t(icon.label)}
              aria-pressed={icon.id === selected.id}
            >
              <img src={`${ICON_DIR}${icon.asset}`} alt="" />
              {icon.id === selected.id && <i aria-hidden="true">✓</i>}
            </button>
          ))}
        </div>
      </section>

      <div className="nic-actions">
        <button type="button" className="nic-cancel" onClick={onBack}>{t('취소')}</button>
        <button
          type="button"
          className="nic-save"
          disabled={!canSave}
          onClick={() => canSave && onSave?.({ name: trimmed, iconId })}
        >
          
          {t('저장')}
        </button>
      </div>
    </main>
  );
}
