import './CreationCompleteScreen.css';

// Ported verbatim from Drawary_12_FINAL_CONFIRMED_CODE's
// CreationComplete.tsx. Only asset paths changed: the archive's flat
// `/assets/mascot_celebrate.webp` / `/assets/drawer_icon_cosmetics.webp`
// -> this app's actual `/assets/mascot/...` / `/assets/drawer-icons/...`
// layout. No footer: sub-flow screen, same as #09/#10/#11.
interface CreationCompleteScreenProps {
  drawerName?: string;
  iconKey?: string;
  fieldCount?: number;
  onFillDrawer?: () => void;
  onLater?: () => void;
}

export function CreationCompleteScreen({
  drawerName = '화장품',
  iconKey = 'cosmetics',
  fieldCount = 7,
  onFillDrawer,
  onLater,
}: CreationCompleteScreenProps) {
  return (
    <main className="cc-screen">
      <section className="cc-content">
        <div className="cc-celebrate" aria-hidden="true">
          <span className="cc-spark cc-spark-a">✦</span>
          <span className="cc-spark cc-spark-b">•</span>
          <span className="cc-spark cc-spark-c">✦</span>
          <img src="/assets/mascot/mascot_celebrate.webp" alt="" />
        </div>

        <h1><span>{drawerName}</span> 서랍을 만들었어요.</h1>
        <p className="cc-lead">이제 서랍을 채워볼까요?</p>

        <article className="cc-drawer-card">
          <div className="cc-icon-wrap">
            <img src={`/assets/drawer-icons/drawer_icon_${iconKey}.webp`} alt="" />
          </div>
          <div className="cc-card-copy">
            <strong>{drawerName}</strong>
            <small>서랍칸 {fieldCount}개 준비 완료</small>
          </div>
          <span className="cc-check" aria-hidden="true">✓</span>
        </article>

        <p className="cc-note">
          방금 정한 서랍칸에 맞춰<br />
          첫 보관품부터 하나씩 담아보세요.
        </p>

        <button className="cc-primary" type="button" onClick={onFillDrawer}>
          서랍 채우기
        </button>
        <button className="cc-secondary" type="button" onClick={onLater}>
          나중에
        </button>
      </section>
    </main>
  );
}
