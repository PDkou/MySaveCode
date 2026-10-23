import { t, tl } from '../i18n';

/**
 * The home (#4) with no drawer yet, for the wide window: the same approved picture and texts as the phone's empty home, centered
 * in the content area (the drawer list on the left already carries the logo).
 */
export function WideEmptyHome({ onCreateDrawer, onTemplates }: { onCreateDrawer: () => void; onTemplates: () => void }) {
  return (
    <section className="wide-empty">
      <img src="/assets/mascot/mascot_lean_on_drawer.webp" alt="" width={260} draggable={false} />
      <h1>{t('아직 만든 서랍이 없어요.')}</h1>
      <p>{tl('정리하고 싶은 것부터\n하나 만들어보세요.')}</p>
      <button type="button" className="wide-empty-cta" onClick={onCreateDrawer}>+ {t('첫 서랍 만들기')}</button>
      <button type="button" className="wide-empty-templates" onClick={onTemplates}>{t('템플릿으로 시작')}</button>
    </section>
  );
}
