import type { CSSProperties, ReactNode } from 'react';
import './ScreenHeader.css';
import { K, t } from '../i18n';

export interface ScreenHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  rightSlot?: ReactNode;
  /**
   * Preserves each screen's own existing header height (most content
   * below the header is absolutely positioned against it, so changing
   * this per screen would require re-tuning every screen's content
   * offset too). Defaults to the variant's own canonical height for
   * screens with no such downstream dependency.
   */
  height?: number;
  /** Escape hatch for a screen whose header sits outside normal flow (e.g. absolutely positioned over a hero image). */
  style?: CSSProperties;
  /**
   * 'center' (default): single-line centered title, back button left,
   * optional rightSlot right -- used by the vast majority of screens
   * (settings/backup/restore/help/notification/recurrence families).
   * 'stacked': left-aligned, flex-end anchored title (+ optional
   * subtitle below it), taller -- used where the title needs two lines
   * or sits above drawer-specific context (drawer detail/record
   * detail/edit, table view, field setup/fill-drawer).
   */
  variant?: 'center' | 'stacked';
}

/**
 * Unified header: one back-button visual, one title typography, one
 * height per layout family, used by every non-root-tab, non-modal-sheet
 * screen. Replaces 46 screens' worth of independently-ported header
 * markup (5 different back-button implementations, header heights
 * ranging 61-109px, ~8 distinct title colors -- cataloged in full
 * across this session). Root-tab screens (Home/HomeEmpty/Search/Stats/
 * SettingsHome/HomeEdit) keep their own header-less or brand-logo
 * treatment and the shared `ResponsiveBottomNav` untouched, per
 * CLAUDE.md's lock on that component. Bottom-sheet modals
 * (NewDrawerScreen, delete-confirm sheets, table sort/filter sheets)
 * keep their own in-sheet heading, a different UI metaphor from a
 * stack-navigation app-bar.
 */
export function ScreenHeader({ title, subtitle, onBack, backLabel = K('이전 화면'), rightSlot, variant = 'center', height, style: styleOverride }: ScreenHeaderProps) {
  const style = height || styleOverride ? { ...(height ? { height } : null), ...styleOverride } : undefined;

  if (variant === 'stacked') {
    return (
      <header className="uf-header uf-header--stacked" style={style}>
        {onBack && (
          <button type="button" className="uf-back" aria-label={t(backLabel)} onClick={onBack} />
        )}
        <div className="uf-stacked-text">
          <h1>{title}</h1>
          {subtitle && <span className="uf-subtitle">{subtitle}</span>}
        </div>
        {rightSlot && <div className="uf-right-slot">{rightSlot}</div>}
      </header>
    );
  }

  return (
    <header className="uf-header uf-header--center" style={style}>
      {onBack ? (
        <button type="button" className="uf-back" aria-label={t(backLabel)} onClick={onBack} />
      ) : (
        <span className="uf-header-spacer" aria-hidden="true" />
      )}
      <h1 className="uf-title">{title}</h1>
      {rightSlot ? <div className="uf-right-slot">{rightSlot}</div> : <span className="uf-header-spacer" aria-hidden="true" />}
    </header>
  );
}
