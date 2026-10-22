import { useEffect, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './PremiumScreen.css';
import { t, tl, K } from '../i18n';
import type { PremiumReason, SupportKind } from '../flow/premium';

export interface PremiumPrices {
  /** Price texts as Google Play formats them for the person's country. */
  premium: string;
  coffee: string;
  latte: string;
  /** "다른 금액": Google Play has no typed amount, so these are separate support products at fixed amounts. */
  amounts: readonly string[];
}

export type { SupportKind };

/** A short answer shown at the bottom after a purchase attempt. */
export type PremiumNotice = 'bought' | 'thanks' | 'restored' | 'nothing-to-restore' | 'pending' | 'error' | 'browser';

const REASONS: Record<PremiumReason, string> = {
  drawers: K('무료로는 서랍을 5개까지 만들 수 있어요.'),
  theme: K('라벤더 말고 다른 테마는 프리미엄에서 쓸 수 있어요.'),
  repeat: K('반복 기능은 프리미엄에서 쓸 수 있어요.'),
  export: K('표 내보내기는 프리미엄에서 쓸 수 있어요.'),
};

const NOTICES: Record<PremiumNotice, string> = {
  bought: K('프리미엄이 열렸어요. 고마워요!'),
  thanks: K('고마워요! 큰 힘이 돼요.'),
  restored: K('구매를 복원했어요.'),
  'nothing-to-restore': K('복원할 구매 내역이 없어요.'),
  pending: K('결제가 아직 처리 중이에요. 끝나면 자동으로 열려요.'),
  error: K('결제하지 못했어요. 잠시 뒤에 다시 해 주세요.'),
  browser: K('구매는 안드로이드 앱에서만 할 수 있어요.'),
};

interface Props {
  prices: PremiumPrices;
  /** Premium is already unlocked. */
  owned?: boolean;
  /** What the person ran into on the way here (Free limit). */
  reason?: PremiumReason | null;
  notice?: PremiumNotice | null;
  onNoticeDone?: () => void;
  /** A purchase is open in Google Play: the buttons wait. */
  busy?: boolean;
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
export function PremiumScreen({ prices, owned = false, reason = null, notice = null, onNoticeDone, busy = false, onBack, onBuyPremium, onRestore, onSupport }: Props) {
  const [otherOpen, setOtherOpen] = useState(false);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => onNoticeDone?.(), 4500);
    return () => window.clearTimeout(timer);
  }, [notice, onNoticeDone]);
  return (
    <section className="pm-screen">
      <ScreenHeader title={t('서랍장 키우기')} onBack={onBack} backLabel={t('뒤로 가기')} height={72} />
      <div className="pm-body">
        {!owned && reason && <p className="pm-reason" role="status">{t(REASONS[reason])}</p>}
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

        {owned ? (
          <p className="pm-owned">{t('프리미엄을 쓰고 있어요. 고마워요!')}</p>
        ) : (
          <>
            <button type="button" className="pm-buy" disabled={busy} onClick={onBuyPremium}>{t('프리미엄 시작 ({price})', { price: prices.premium })}</button>
            <p className="pm-note">{t('결제는 Google Play에서 처리돼요. 이 앱은 카드 정보를 받지 않아요.')}</p>
            <p className="pm-restore">{t('이미 구매하셨나요?')} <button type="button" disabled={busy} onClick={onRestore}>{t('구매 복원')}</button></p>
          </>
        )}

        <section className="pm-coffee">
          <div className="pm-coffee-head">
            <img src="/assets/drawer-icons/drawer_icon_cafe.webp" alt="" />
            <div><h3>{t('개발자에게 커피 한 잔')}</h3><p>{t('기능은 그대로예요. 마음에 드셨다면 힘이 나는 응원이 돼요.')}</p></div>
          </div>
          <div className="pm-coffee-row">
            {SUPPORT.map(({ kind, label }) => (
              <button key={kind} type="button" disabled={busy} onClick={() => onSupport(kind)}>
                <span>{t(label)}</span>
                <b>{prices[kind]}</b>
              </button>
            ))}
            <button type="button" className="pm-other-toggle" aria-haspopup="dialog" disabled={busy} onClick={() => setOtherOpen(true)}>
              <span>{t('개발자 기분 좋게 하기')}</span>
            </button>
          </div>
          <small>{t('후원은 몇 번이든 할 수 있어요.')}</small>
        </section>
      </div>

      {notice && <div className="pm-toast" role="status">{t(NOTICES[notice])}</div>}

      {otherOpen && (
        <div className="pm-overlay">
          <button type="button" className="pm-backdrop" aria-label={t('닫기')} onClick={() => setOtherOpen(false)} />
          <div className="pm-modal" role="dialog" aria-modal="true" aria-label={t('얼만큼 기분 좋게 하려구요?')}>
            <h2>{t('얼만큼 기분 좋게 하려구요?')}</h2>
            <p>{t('기부니가 좋은 개발자는 더 좋은 앱을 만들걸요?')}</p>
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
