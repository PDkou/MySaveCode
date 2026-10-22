import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './TemplatePickerScreen.css';
import { DRAWER_COLORS, drawerIconUrl } from '../data/drawerStyle';
import { DRAWER_TEMPLATES, type DrawerTemplate } from '../flow/drawerTemplates';
import { t } from '../i18n';

interface Props {
  onBack: () => void;
  /** The person chose a template: the create-drawer flow starts with its name, look and fields filled in. */
  onPick: (template: DrawerTemplate) => void;
  /** "직접 만들기": the empty name / icon / colour sheet. */
  onOwn: () => void;
}

const cardColor = (key: string) => (DRAWER_COLORS.find((c) => c.key === key) ?? DRAWER_COLORS[0]).card;

/** "템플릿으로 시작": ready-made drawers (name, look, fields) to start from instead of an empty drawer. */
export function TemplatePickerScreen({ onBack, onPick, onOwn }: Props) {
  const [open, setOpen] = useState<DrawerTemplate | null>(null);

  return (
    <section className="tp-screen">
      <ScreenHeader title={t('템플릿으로 시작')} onBack={onBack} backLabel={t('뒤로 가기')} height={72} />
      <p className="tp-intro">{t('만들고 싶은 서랍을 고르면 이름과 서랍 칸이 한 번에 채워져요.')}</p>
      <div className="tp-grid">
        {DRAWER_TEMPLATES.map((tpl) => (
          <button key={tpl.id} type="button" className="tp-card" style={{ background: cardColor(tpl.colorKey) }} onClick={() => setOpen(tpl)}>
            <img src={drawerIconUrl(tpl.iconKey)} alt="" draggable={false} />
            <strong>{t(tpl.name)}</strong>
            <span>{t(tpl.description)}</span>
          </button>
        ))}
      </div>
      <button type="button" className="tp-own" onClick={onOwn}>{t('직접 만들기')}</button>

      {open && (
        <div className="tp-overlay">
          <button type="button" className="tp-backdrop" aria-label={t('닫기')} onClick={() => setOpen(null)} />
          <div className="tp-sheet" role="dialog" aria-label={t(open.name)}>
            <div className="tp-handle" />
            <div className="tp-sheet-head">
              <span className="tp-sheet-icon" style={{ background: cardColor(open.colorKey) }}><img src={drawerIconUrl(open.iconKey)} alt="" /></span>
              <div><h2>{t(open.name)}</h2><p>{t(open.description)}</p></div>
            </div>
            <h3>{t('이 템플릿에 들어 있는 서랍 칸')}</h3>
            <ul className="tp-fields">
              {open.fields.map((f) => <li key={f.name}>{t(f.name)}</li>)}
            </ul>
            <p className="tp-note">{t('다음 화면에서 이름과 서랍 칸을 마음대로 바꿀 수 있어요.')}</p>
            <button type="button" className="tp-use" onClick={() => onPick(open)}>{t('이 템플릿으로 시작')}</button>
          </div>
        </div>
      )}
    </section>
  );
}
