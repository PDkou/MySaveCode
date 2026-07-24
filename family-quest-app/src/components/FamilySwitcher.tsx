import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useFamily } from '../context/FamilyContext';
import { AddFamilyModal } from './AddFamilyModal';

export function FamilySwitcher() {
  const { t } = useTranslation();
  const { family, families, switchFamily } = useFamily();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        // Same viewport-clamped positioning as NotificationBell -- CSS
        // absolute-relative-to-wrapper positioning can land off-screen once
        // the header wraps differently than expected.
        const rect = triggerRef.current?.getBoundingClientRect();
        if (rect) {
          const margin = 8;
          const menuWidth = Math.min(240, window.innerWidth * 0.86);
          const idealLeft = rect.left;
          const maxLeft = window.innerWidth - margin - menuWidth;
          const left = Math.max(margin, Math.min(idealLeft, maxLeft));
          setMenuPos({ top: rect.bottom + 8, left });
        }
      }
      return next;
    });
  };

  return (
    <div className="family-switcher-wrap">
      <button ref={triggerRef} type="button" className="app-title app-title-button" onClick={toggle}>
        {family?.name ?? t('app.name')}
        <span className="family-switcher-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <>
          <div className="notification-backdrop" onClick={() => setOpen(false)} />
          <div
            className="notification-panel family-switcher-menu"
            style={menuPos ? { top: menuPos.top, left: menuPos.left } : undefined}
          >
            <div className="notification-panel-header">{t('family.switcherTitle')}</div>
            <ul className="family-switcher-list">
              {families.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    className={`family-switcher-item ${f.id === family?.id ? 'family-switcher-item-active' : ''}`}
                    onClick={() => {
                      switchFamily(f.id);
                      setOpen(false);
                    }}
                  >
                    {f.name}
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="family-switcher-add"
              onClick={() => {
                setOpen(false);
                setShowAdd(true);
              }}
            >
              + {t('family.addAnother')}
            </button>
          </div>
        </>
      )}

      {showAdd && <AddFamilyModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
