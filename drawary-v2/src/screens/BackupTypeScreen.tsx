import { useState } from 'react';
import './BackupTypeScreen.css';
import { t, tl } from '../i18n';

export type BackupMode = 'include' | 'exclude';

export interface BackupTypeScreenProps {
  initialMode?: BackupMode;
  onBack?: () => void;
  onNext?: (mode: BackupMode) => void;
}

/**
 * #45 백업 시작 / 종류 선택. Ported from
 * `Drawary_45_BACKUP_TYPE_CONFIRMED_2026-10-14`'s `index.html` -- the
 * vanilla JS's own radio-group logic (click + arrow-key navigation)
 * ported to `useState`. README.md: 두 선택 카드 높이 111→101px, 아이콘
 * 61→55px로 미세 축소 -- matched exactly from the given CSS. Reached
 * from #44's "백업하기" row; "다음" -> #46.
 */
export function BackupTypeScreen({ initialMode = 'include', onBack, onNext }: BackupTypeScreenProps) {
  const [mode, setMode] = useState<BackupMode>(initialMode);

  const options: { id: BackupMode; icon: string; title: string; desc: string }[] = [
    { id: 'include', icon: '/assets/field-types/field_photo.webp', title: t('사진 포함'), desc: t('서랍과 기록, 사진을 함께 저장해요.') },
    { id: 'exclude', icon: '/assets/ui-icons/icon_save.webp', title: t('사진 제외'), desc: t('사진을 제외하고 기록만 저장해요.') },
  ];

  return (
    <div className="bkt45-screen">
      <header className="bkt45-header">
        {onBack && <button type="button" className="bkt45-back" onClick={onBack} aria-label={t('데이터 관리로 돌아가기')} />}
        <h1>{t('백업하기')}</h1>
      </header>
      <section className="bkt45-panel">
        <h2 className="bkt45-section-title">{t('백업할 내용 선택')}</h2>
        <section className="bkt45-hero" aria-label={t('백업 안내')}>
          <div className="bkt45-hero-art"><img src="/assets/states/backup/state_backup_local_save.webp" alt="" /></div>
          <div className="bkt45-hero-copy"><strong>{t('내 기록을 안전하게 보관해요')}</strong><span>{tl('사진도 함께 담을지\n선택해 주세요.')}</span></div>
        </section>
        <h3 className="bkt45-options-heading" id="bkt45-option-title">{t('백업 종류')}</h3>
        <div className="bkt45-option-list" role="radiogroup" aria-labelledby="bkt45-option-title">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="bkt45-option"
              role="radio"
              aria-checked={mode === opt.id}
              aria-label={t('{title} 백업 선택', { title: opt.title })}
              onClick={() => setMode(opt.id)}
            >
              <span className="bkt45-option-icon"><img src={opt.icon} alt="" /></span>
              <span className="bkt45-option-text"><strong>{opt.title}</strong><small>{opt.desc}</small></span>
              <span className="bkt45-radio" aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="bkt45-select-hint">
          <img src="/assets/ui-icons/icon_info.webp" alt="" />
          <span>{t('다음 단계에서 저장 위치를 선택할 수 있습니다.')}</span>
        </div>
        <button type="button" className="bkt45-bottom-action" onClick={() => onNext?.(mode)}>{t('다음')}</button>
      </section>
    </div>
  );
}
