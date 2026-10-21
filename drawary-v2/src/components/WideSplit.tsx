import type { ReactNode } from 'react';
import './WideSplit.css';
import { t } from '../i18n';

/**
 * Landscape tablets and unfolded foldables: two phone-width columns side by side. Each column is an ordinary approved screen
 * drawn exactly as on a phone (same FixedCanvas, same bottom nav); nothing inside them is redrawn or restyled. The left column
 * is the tab the person is on (drawer list, search, ...); the right column is whatever they opened from it. With nothing
 * opened the right column shows a quiet hint instead of an empty hole.
 */
export function WideSplit({ left, right }: { left: ReactNode; right: ReactNode | null }) {
  return (
    <div className="wide-split">
      <div className="wide-pane wide-pane--list">{left}</div>
      <div className="wide-pane wide-pane--detail">
        {right ?? <p className="wide-hint">{t('왼쪽에서 고르면 여기에 열려요.')}</p>}
      </div>
    </div>
  );
}
