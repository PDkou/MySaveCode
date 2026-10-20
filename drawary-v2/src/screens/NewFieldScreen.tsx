import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './NewFieldScreen.css';
import type { FieldKind } from '../data/types';
import { t, tl, K } from '../i18n';

// Ported verbatim from Drawary_10_FINAL_CONFIRMED_CODE's NewFieldFlow.tsx
// (source_code_verification: RECOVERED_ORIGINAL_WITH_CODE). Nothing
// changed -- the archive's own icon paths already use this app's
// `/assets/field-types/...` convention, so no translation was needed.
// No footer: sub-flow screen, same as #09.
export type { FieldKind } from '../data/types';

export interface FieldTypeItem {
  kind: FieldKind;
  label: string;
  description: string;
  icon: string;
}

export const FIELD_TYPES: FieldTypeItem[] = [
  { kind: 'text', label: K('글자'), description: K('이름, 제목처럼 짧은 글'), icon: '/assets/field-types/field_text.webp' },
  { kind: 'long_text', label: K('긴 글'), description: K('메모나 감상처럼 긴 내용'), icon: '/assets/field-types/field_edit_note.webp' },
  { kind: 'number', label: K('숫자'), description: K('개수, 용량처럼 숫자 입력'), icon: '/assets/field-types/field_number.webp' },
  { kind: 'currency', label: K('금액'), description: K('가격이나 비용 입력'), icon: '/assets/field-types/field_currency.webp' },
  { kind: 'date', label: K('날짜'), description: K('구매일, 방문일처럼 날짜 선택'), icon: '/assets/field-types/field_date.webp' },
  { kind: 'photo', label: K('사진'), description: K('사진을 등록할 때'), icon: '/assets/field-types/field_photo.webp' },
  { kind: 'select', label: K('선택'), description: K('여러 옵션 중 하나를 선택'), icon: '/assets/field-types/field_select.webp' },
  { kind: 'check', label: K('체크'), description: K('완료 여부처럼 켜고 끄기'), icon: '/assets/field-types/field_checkbox.webp' },
  { kind: 'rating', label: K('별점'), description: K('별점으로 평가'), icon: '/assets/field-types/field_rating.webp' },
  { kind: 'link', label: K('링크'), description: K('웹사이트나 참고 링크'), icon: '/assets/field-types/field_link.webp' },
];

interface Props {
  onBack?: () => void;
  onAdd?: (data: { name: string; kind: FieldKind; required: boolean; options: string[] }) => void;
}

export function NewFieldScreen({ onBack, onAdd }: Props) {
  const [step, setStep] = useState<'type' | 'detail'>('type');
  const [kind, setKind] = useState<FieldKind>('select');
  const [name, setName] = useState('');
  const [required, setRequired] = useState(false);
  const [options, setOptions] = useState([t('옵션 1'), t('옵션 2'), t('옵션 3')]);

  const selected = FIELD_TYPES.find((item) => item.kind === kind)!;

  if (step === 'type') {
    return (
      <main className="nf-screen">
        <ScreenHeader variant="stacked" title={t('서랍칸 종류 선택')} onBack={onBack} height={93} />

        <section className="nf-content nf-type-content">
          <p className="nf-intro">
            
            {tl('서랍에 담아둘 내용에 맞는\n서랍칸 종류를 골라주세요.')}
          </p>

          <div className="nf-type-list">
            {FIELD_TYPES.map((item) => (
              <button
                type="button"
                key={item.kind}
                className="nf-type-row"
                onClick={() => { setKind(item.kind); setStep('detail'); }}
              >
                <span className="nf-type-icon" aria-hidden="true"><img src={item.icon} alt="" /></span>
                <span className="nf-type-copy">
                  <strong>{t(item.label)}</strong>
                  <small>{t(item.description)}</small>
                </span>
                <span className="nf-chevron" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="nf-screen">
      <ScreenHeader variant="stacked" title={t('서랍칸 추가')} onBack={() => setStep('type')} backLabel={t('이전 단계')} height={93} />

      <section className="nf-content nf-detail-content">
        <label className="nf-label" htmlFor="field-name">{t('서랍칸 이름')}</label>
        <div className="nf-input-wrap">
          <input
            id="field-name"
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 20))}
            placeholder={t('예) 브랜드, 색상, 카테고리')}
          />
          <span>{name.length}/20</span>
        </div>

        <span className="nf-label">{t('서랍칸 종류')}</span>
        <button className="nf-selected-type" type="button" onClick={() => setStep('type')}>
          <span className="nf-type-icon" aria-hidden="true"><img src={selected.icon} alt="" /></span>
          <span className="nf-type-copy">
            <strong>{t(selected.label)}</strong>
            <small>{t(selected.description)}</small>
          </span>
          <span className="nf-chevron" aria-hidden="true">›</span>
        </button>

        {kind === 'select' && (
          <section className="nf-options">
            <h2>{t('선택 옵션')}</h2>
            <div className="nf-option-list">
              {options.map((option, index) => (
                <div className="nf-option-row" key={index}>
                  <input
                    value={option}
                    onChange={(e) => setOptions(options.map((v, i) => i === index ? e.target.value : v))}
                    aria-label={t('옵션 {n}', { n: index + 1 })}
                  />
                  <button
                    type="button"
                    aria-label={t('옵션 {n} 삭제', { n: index + 1 })}
                    onClick={() => setOptions(options.filter((_, i) => i !== index))}
                  >−</button>
                </div>
              ))}
            </div>
            <button className="nf-add-option" type="button" onClick={() => setOptions([...options, t('옵션 {n}', { n: options.length + 1 })])}>
              
              {t('＋ 옵션 추가')}
            </button>
          </section>
        )}

        <div className="nf-required">
          <div>
            <strong>{t('필수로 채우기')}</strong>
            <small>{t('보관품을 담을 때 꼭 채워야 하는 서랍칸이에요.')}</small>
          </div>
          <button
            type="button"
            className={`nf-switch${required ? ' is-on' : ''}`}
            onClick={() => setRequired(!required)}
            aria-pressed={required}
            aria-label={t('필수 입력')}
          ><span /></button>
        </div>

        <button
          className="nf-primary"
          type="button"
          onClick={() => onAdd?.({ name, kind, required, options })}
        >
          
          {t('추가하기')}
        </button>
      </section>
    </main>
  );
}
