import { HomeIcon, SearchIcon, SettingsIcon } from './icons';

export type BottomNavTab = 'home' | 'search' | 'settings';

interface BottomNavProps {
  active: BottomNavTab;
  onNavigate: (tab: BottomNavTab) => void;
}

const TABS: { id: BottomNavTab; label: string; Icon: typeof HomeIcon }[] = [
  { id: 'home', label: '홈', Icon: HomeIcon },
  { id: 'search', label: '검색', Icon: SearchIcon },
  { id: 'settings', label: '설정', Icon: SettingsIcon },
];

// Only present on Home's own top-level screens (Home itself, plus its
// search/settings sub-screens) -- CategoryDetail/TableScreen are
// drill-down detail views reached through a specific category, so they
// keep their plain back-arrow header instead, the same convention most
// tabbed apps follow (a tab bar for top-level sections, not every screen
// under them).
export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          className={`bottom-nav-item ${active === id ? 'active' : ''}`}
          onClick={() => onNavigate(id)}
          aria-current={active === id ? 'page' : undefined}
        >
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
