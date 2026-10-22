import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './PremiumScreen.css';
import { t, tl, K } from '../i18n';

export interface PremiumPrices {
  /** Price texts as Google Play formats them for the person's country. */
  premium: string;
  coffee: string;
  latte: string;
  /** "다른 금액": Google Play has no typed amount, so these are separate support products at fixed amounts. */
  amounts: readonly string[];
}

export type SupportKind = 'coffee' | 'latte' | { amount: number };

interface Props {
  prices: PremiumPrices;
  onBack: () => void;
  onBuyPremium: () => void;
  onRestore: () => void;
  onSupport: (kind: SupportKind) => void;
}

const BENEFITS = [
  { icon: '/assets/ui-icons/icon_grid.webp', title: K('서랍 제한 없이'), body: K('무료는 5개까지, 프리미엄은 개수에 제한이 없어요.') },
  { icon: '/assets/ui-icons/icon_theme.webp', title: K('테마 5가지'), body: K('라벤더 말고도 코랄, 세이지, 머스터드, 스카이를 쓸 수 있어요.') },
  { icon: '/assets/ui-icons/icon_refresh.webp', title: K('반복 기능'), body: K('날짜 칸을 기준으로 새 보관품을 자동으로 만들어요.') },
  { icon: '/assets/ui-icons/icon_share.webp', title: K('표 내보내기'), body: K('표를 CSV나 PDF 파일로 내보내요.') },
] as const;

const SUPPORT = [
  { kind: 'coffee', label: K('커피 한 잔') },
  { kind: 'latte', label: K('라떼 한 잔') },
] as const;

/** "프리미엄": the one purchase that unlocks everything, plus the optional "coffee for the developer" support. */
export function PremiumScreen({ prices, onBack, onBuyPremium, onRestore, onSupport }: Props) {
  const [otherOpen, setOtherOpen] = useState(false);
  return (
    <section className="pm-screen">
      <ScreenHeader title={t('프리미엄')} onBack={onBack} backLabel={t('뒤로 가기')} height={72} />
      <div className="pm-body">
        <div className="pm-hero">
          <div className="pm-hero-copy">
            <h2>{t('Drawary 프리미엄')}</h2>
            <p>{tl('한 번만 결제하면 계속 쓸 수 있어요.\n구독이 아니에요.')}</p>
          </div>
          <img src="/assets/mascot/mascot_celebrate.webp" alt="" draggable={false} />
        </div>

        <h3 className="pm-label">{t('프리미엄에 들어 있는 것')}</h3>
        <ul className="pm-benefits">
          {BENEFITS.map((b) => (
            <li key={b.title}>
              <span className="pm-icon"><img src={b.icon} alt="" /></span>
              <span><strong>{t(b.title)}</strong><small>{t(b.body)}</small></span>
            </li>
          ))}
        </ul>

        <button type="button" className="pm-buy" onClick={onBuyPremium}>{t('프리미엄 시작 ({price})', { price: prices.premium })}</button>
        <p className="pm-note">{t('결제는 Google Play에서 처리돼요. 이 앱은 카드 정보를 받지 않아요.')}</p>
        <p className="pm-restore">{t('이미 구매하셨나요?')} <button type="button" onClick={onRestore}>{t('구매 복원')}</button></p>

        <section className="pm-coffee">
          <div className="pm-coffee-head">
            <img src="/assets/drawer-icons/drawer_icon_cafe.webp" alt="" />
            <div><h3>{t('개발자에게 커피 한 잔')}</h3><p>{t('기능은 그대로예요. 마음에 드셨다면 힘이 나는 응원이 돼요.')}</p></div>
          </div>
          <div className="pm-coffee-row">
            {SUPPORT.map(({ kind, label }) => (
              <button key={kind} type="button" onClick={() => onSupport(kind)}>
                <span>{t(label)}</span>
                <b>{prices[kind]}</b>
              </button>
            ))}
            <button type="button" className="pm-other-toggle" aria-haspopup="dialog" onClick={() => setOtherOpen(true)}>
              <span>{t('커피 말고 맛있는 거 사주기')}</span>
            </button>
          </div>
          <small>{t('후원은 몇 번이든 할 수 있어요.')}</small>
        </section>
      </div>

      {otherOpen && (
        <div className="pm-overlay">
          <button type="button" className="pm-backdrop" aria-label={t('닫기')} onClick={() => setOtherOpen(false)} />
          <div className="pm-modal" role="dialog" aria-modal="true" aria-label={t('맛있는 거 사주기')}>
            <h2>{t('맛있는 거 사주기')}</h2>
            <p>{t('마음 가는 만큼 골라 주세요.')}</p>
            <div className="pm-amounts">
              {prices.amounts.map((price, i) => (
                <button key={price} type="button" onClick={() => { setOtherOpen(false); onSupport({ amount: i }); }}>{price}</button>
              ))}
            </div>
            <button type="button" className="pm-modal-close" onClick={() => setOtherOpen(false)}>{t('닫기')}</button>
          </div>
        </div>
      )}
    </section>
  );
}
