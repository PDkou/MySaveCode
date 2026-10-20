import { useEffect, useMemo, useState } from 'react';
import './FaqScreen.css';
import { t, tl, K } from '../i18n';

export type FaqCategory = 'all' | 'basic' | 'data' | 'repeat' | 'settings';

interface FaqItem {
  key: string;
  category: Exclude<FaqCategory, 'all'>;
  question: string;
  answer: string;
}

const CATEGORY_TABS: { id: FaqCategory; label: string }[] = [
  { id: 'all', label: K('전체') },
  { id: 'basic', label: K('기본 사용') },
  { id: 'data', label: K('데이터 · 백업') },
  { id: 'repeat', label: K('알림 · 반복') },
  { id: 'settings', label: K('앱 설정') },
];

const CATEGORY_LABELS: Record<Exclude<FaqCategory, 'all'>, string> = {
  basic: K('기본 사용'),
  data: K('데이터 · 백업'),
  repeat: K('알림 · 반복'),
  settings: K('앱 설정'),
};

const FAQ_ITEMS: FaqItem[] = [
  { key: 'make-drawer', category: 'basic', question: K('새 서랍은 어떻게 만들어요?'), answer: K('홈 화면에서 새 서랍 만들기를 선택하고 서랍 이름과 필요한 항목을 설정해 주세요.') },
  { key: 'edit-columns', category: 'basic', question: K('서랍 칸은 나중에 수정할 수 있나요?'), answer: K('서랍 설정에서 항목 구성을 확인할 수 있어요. 변경 가능한 항목은 편집 화면의 안내를 따라 주세요.') },
  { key: 'add-collection', category: 'basic', question: K('보관품은 어떻게 추가하나요?'), answer: K('원하는 서랍을 열고 기록 추가를 선택하면 보관품 정보를 입력할 수 있어요.') },
  { key: 'add-photo', category: 'basic', question: K('사진도 등록할 수 있나요?'), answer: K('서랍에 사진 항목이 있다면 기기의 사진을 선택해 기록에 연결할 수 있어요.') },
  { key: 'data-storage', category: 'data', question: K('내 데이터는 어디에 저장되나요?'), answer: K('Drawary의 데이터는 기본적으로 이 기기 안에 저장돼요. 백업은 설정의 데이터 관리에서 할 수 있어요.') },
  { key: 'export', category: 'data', question: K('CSV나 PDF는 어디에서 내보내나요?'), answer: K('내보내기를 지원하는 화면의 메뉴에서 파일 형식을 선택할 수 있어요. 자세한 항목은 해당 화면의 안내를 확인해 주세요.') },
  { key: 'backup-restore', category: 'data', question: K('백업은 어디에서 하나요?'), answer: K('설정 → 데이터 관리에서 백업을 시작할 수 있어요. 기기에 저장하거나 Google Drive를 선택할 수 있어요.') },
  { key: 'restore', category: 'data', question: K('백업한 데이터는 어떻게 복원하나요?'), answer: K('설정 → 데이터 관리의 복원 메뉴에서 백업 파일을 선택하고 내용을 확인해 주세요. 복원 전에는 중요한 데이터를 백업하는 것을 권장해요.') },
  { key: 'notification', category: 'repeat', question: K('알림은 어디에서 설정하나요?'), answer: K('설정에서 알림 메뉴를 열어 알림 사용 여부와 관련 옵션을 확인할 수 있어요.') },
  { key: 'repeat', category: 'repeat', question: K('반복 설정은 어디에서 하나요?'), answer: K('반복 관리 화면에서 등록된 반복 항목과 설정을 확인할 수 있어요.') },
  { key: 'language', category: 'settings', question: K('언어는 어디에서 변경하나요?'), answer: K('설정 → 언어 설정에서 한국어, 日本語, English 중 원하는 언어를 선택한 뒤 적용해 주세요.') },
  { key: 'theme', category: 'settings', question: K('테마는 어디에서 바꾸나요?'), answer: K('설정 → 테마에서 원하는 색상을 선택할 수 있어요.') },
  { key: 'lock', category: 'settings', question: K('앱 잠금은 어떻게 설정하나요?'), answer: K('설정 → 보안에서 앱 잠금을 설정할 수 있어요. 잠금 방식은 기기와 앱 설정에 따라 달라질 수 있어요.') },
];

export interface FaqScreenProps {
  initialTopic?: string;
  onBack?: () => void;
}

/**
 * #56 자주 묻는 질문. Ported from `Drawary_56_FAQ_CANDIDATE_2026-10-14`'s
 * `index.html` -- the real search + category-filter + accordion logic
 * ported 1:1, including a detail the archive's own code has: a regular
 * question click just toggles THAT item's own open state (multiple
 * items can be open at once), while a deep-link via `openTopic` (the
 * `?topic=` query param the archive reads on load, matching #55's own
 * quick-help rows) force-closes every other item first so exactly one
 * opens. `initialTopic` reproduces that deep-link behavior as a prop
 * instead of a URL query param. Data-storage item starts pre-opened in
 * the archive's own markup (`class="item open"`); same here when no
 * `initialTopic` overrides it. Reached from #55; back -> #55.
 */
export function FaqScreen({ initialTopic, onBack }: FaqScreenProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FaqCategory>('all');
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set([initialTopic ?? 'data-storage']));

  useEffect(() => {
    if (!initialTopic) return;
    setCategory('all');
    setQuery('');
    setOpenKeys(new Set([initialTopic]));
  }, [initialTopic]);

  const toggleItem = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const q = query.trim().toLocaleLowerCase();
  const visibleByCategory = useMemo(() => {
    const groups = new Map<Exclude<FaqCategory, 'all'>, FaqItem[]>();
    for (const item of FAQ_ITEMS) {
      const matchCat = category === 'all' || item.category === category;
      const match = matchCat && (!q || `${t(item.question)}${t(item.answer)}`.toLocaleLowerCase().includes(q));
      if (!match) continue;
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category)!.push(item);
    }
    return groups;
  }, [category, q]);

  const visibleCount = [...visibleByCategory.values()].reduce((sum, items) => sum + items.length, 0);
  const showIntro = category === 'all' && !q;

  return (
    <section className="faq56-screen" aria-label={t('자주 묻는 질문')}>
      <div className="faq56-scroller">
        <header className="faq56-appbar">
          {onBack && <button type="button" className="faq56-back" onClick={onBack} aria-label={t('도움말로 돌아가기')} />}
          <h1>{t('자주 묻는 질문')}</h1>
        </header>
        <section className="faq56-sticky" aria-label={t('질문 검색 및 분류')}>
          <div className="faq56-searchbox">
            <span className="faq56-magnify" aria-hidden="true" />
            <input
              type="search"
              placeholder={t('궁금한 내용을 검색해보세요')}
              aria-label={t('질문 검색')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="faq56-clear" type="button" aria-label={t('검색어 지우기')} onClick={() => setQuery('')}>×</button>
            )}
          </div>
          <div className="faq56-tabs" role="tablist" aria-label={t('자주 묻는 질문 분류')}>
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="faq56-tab"
                role="tab"
                aria-selected={category === tab.id}
                onClick={() => setCategory(tab.id)}
              >
                {t(tab.label)}
              </button>
            ))}
          </div>
        </section>
        {showIntro && (
          <div className="faq56-intro">
            <div className="faq56-intro-icon"><img src="/assets/ui-icons/icon_help.webp" alt="" /></div>
            <div><strong>{t('궁금한 내용을 확인해보세요')}</strong><span>{t('검색하거나 카테고리를 선택해 빠르게 찾을 수 있어요.')}</span></div>
          </div>
        )}
        <div className="faq56-content">
          {(['basic', 'data', 'repeat', 'settings'] as const).map((cat) => {
            const items = visibleByCategory.get(cat);
            if (!items || items.length === 0) return null;
            return (
              <section className="faq56-category" key={cat}>
                <h2>{t(CATEGORY_LABELS[cat])}</h2>
                <div className="faq56-list">
                  {items.map((item) => {
                    const open = openKeys.has(item.key);
                    return (
                      <div className={`faq56-item${open ? ' open' : ''}`} key={item.key}>
                        <button className="faq56-question" type="button" aria-expanded={open} onClick={() => toggleItem(item.key)}>
                          <span>{t(item.question)}</span>
                          <span className="faq56-arrow" aria-hidden="true" />
                        </button>
                        {open && <div className="faq56-answer">{t(item.answer)}</div>}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {visibleCount === 0 && (
            <div className="faq56-empty">{tl('검색 결과가 없어요.\n다른 검색어를 입력해 보세요.')}</div>
          )}
          {visibleCount > 0 && <p className="faq56-footnote">{t('검색어와 필터는 함께 사용할 수 있어요.')}</p>}
        </div>
      </div>
    </section>
  );
}
