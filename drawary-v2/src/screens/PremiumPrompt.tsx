import './PremiumPrompt.css';
import { t, tl, K } from '../i18n';
import type { PremiumReason } from '../flow/premium';

const TITLES: Record<PremiumReason, string> = {
  drawers: K('서랍이 가득 찼어요'),
  theme: K('다른 색이 궁금하세요?'),
  repeat: K('자동으로 채워 볼까요?'),
  export: K('파일로 내보낼까요?'),
};
const BODIES: Record<PremiumReason, string> = {
  drawers: K('무료로는 서랍을 5개까지 만들 수 있어요.'),
  theme: K('라벤더 말고 다른 테마는 프리미엄에서 쓸 수 있어요.'),
  repeat: K('반복 기능은 프리미엄에서 쓸 수 있어요.'),
  export: K('표 내보내기는 프리미엄에서 쓸 수 있어요.'),
};

interface Props {
  reason: PremiumReason;
  onMore: () => void;
  onLater: () => void;
}

/** The small "this needs Premium, want to look?" dialog shown when a Free limit is reached (e.g. the 6th drawer). */
export function PremiumPrompt({ reason, onMore, onLater }: Props) {
  return (
    <div className="pp-overlay">
      <button type="button" className="pp-backdrop" aria-label={t('닫기')} onClick={onLater} />
      <div className="pp-card" role="dialog" aria-modal="true" aria-label={t(TITLES[reason])}>
        <h2>{t(TITLES[reason])}</h2>
        <p>{tl('{body}\n한 번만 결제하면 계속 쓸 수 있어요.', { body: t(BODIES[reason]) })}</p>
        <button type="button" className="pp-more" onClick={onMore}>{t('프리미엄 알아보기')}</button>
        <button type="button" className="pp-later" onClick={onLater}>{t('나중에')}</button>
      </div>
    </div>
  );
}
