import { useEffect, useMemo, useState } from 'react';
import './FaqScreen.css';

export type FaqCategory = 'all' | 'basic' | 'data' | 'repeat' | 'settings';

interface FaqItem {
  key: string;
  category: Exclude<FaqCategory, 'all'>;
  question: string;
  answer: string;
}

const CATEGORY_TABS: { id: FaqCategory; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'basic', label: '기본 사용' },
  { id: 'data', label: '데이터 · 백업' },
  { id: 'repeat', label: '알림 · 반복' },
  { id: 'settings', label: '앱 설정' },
];

const CATEGORY_LABELS: Record<Exclude<FaqCategory, 'all'>, string> = {
  basic: '기본 사용',
  data: '데이터 · 백업',
  repeat: '알림 · 반복',
  settings: '앱 설정',
};

const FAQ_ITEMS: FaqItem[] = [
  { key: 'make-drawer', category: 'basic', question: '새 서랍은 어떻게 만들어요?', answer: '홈 화면에서 새 서랍 만들기를 선택하고 서랍 이름과 필요한 항목을 설정해 주세요.' },
  { key: 'edit-columns', category: 'basic', question: '서랍 칸은 나중에 수정할 수 있나요?', answer: '서랍 설정에서 항목 구성을 확인할 수 있어요. 변경 가능한 항목은 편집 화면의 안내를 따라 주세요.' },
  { key: 'add-collection', category: 'basic', question: '보관품은 어떻게 추가하나요?', answer: '원하는 서랍을 열고 기록 추가를 선택하면 보관품 정보를 입력할 수 있어요.' },
  { key: 'add-photo', category: 'basic', question: '사진도 등록할 수 있나요?', answer: '서랍에 사진 항목이 있다면 기기의 사진을 선택해 기록에 연결할 수 있어요.' },
  { key: 'data-storage', category: 'data', question: '내 데이터는 어디에 저장되나요?', answer: 'Drawary의 데이터는 기본적으로 이 기기 안에 저장돼요. 백업은 설정의 데이터 관리에서 할 수 있어요.' },
  { key: 'export', category: 'data', question: 'CSV나 PDF는 어디에서 내보내나요?', answer: '내보내기를 지원하는 화면의 메뉴에서 파일 형식을 선택할 수 있어요. 자세한 항목은 해당 화면의 안내를 확인해 주세요.' },
  { key: 'backup-restore', category: 'data', question: '백업은 어디에서 하나요?', answer: '설정 → 데이터 관리에서 백업을 시작할 수 있어요. 기기에 저장하거나 Google Drive를 선택할 수 있어요.' },
  { key: 'restore', category: 'data', question: '백업한 데이터는 어떻게 복원하나요?', answer: '설정 → 데이터 관리의 복원 메뉴에서 백업 파일을 선택하고 내용을 확인해 주세요. 복원 전에는 중요한 데이터를 백업하는 것을 권장해요.' },
  { key: 'notification', category: 'repeat', question: '알림은 어디에서 설정하나요?', answer: '설정에서 알림 메뉴를 열어 알림 사용 여부와 관련 옵션을 확인할 수 있어요.' },
  { key: 'repeat', category: 'repeat', question: '반복 설정은 어디에서 하나요?', answer: '반복 관리 화면에서 등록된 반복 항목과 설정을 확인할 수 있어요.' },
  { key: 'language', category: 'settings', question: '언어는 어디에서 변경하나요?', answer: '설정 → 언어 설정에서 한국어, 日本語, English 중 원하는 언어를 선택한 뒤 적용해 주세요.' },
  { key: 'theme', category: 'settings', question: '테마는 어디에서 바꾸나요?', answer: '설정 → 테마에서 원하는 색상을 선택할 수 있어요.' },
  { key: 'lock', category: 'settings', question: '앱 잠금은 어떻게 설정하나요?', answer: '설정 → 보안에서 앱 잠금을 설정할 수 있어요. 잠금 방식은 기기와 앱 설정에 따라 달라질 수 있어요.' },
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

  const q = query.trim().toLocaleLowerCase('ko-KR');
  const visibleByCategory = useMemo(() => {
    const groups = new Map<Exclude<FaqCategory, 'all'>, FaqItem[]>();
    for (const item of FAQ_ITEMS) {
      const matchCat = category === 'all' || item.category === category;
      const match = matchCat && (!q || `${item.question}${item.answer}`.toLocaleLowerCase('ko-KR').includes(q));
      if (!match) continue;
      if (!groups.has(item.category)) groups.set(item.category, []);
      groups.get(item.category)!.push(item);
    }
    return groups;
  }, [category, q]);

  const visibleCount = [...visibleByCategory.values()].reduce((sum, items) => sum + items.length, 0);
  const showIntro = category === 'all' && !q;

  return (
    <main className="faq56-screen" aria-label="자주 묻는 질문">
      <div className="faq56-scroller">
        <header className="faq56-appbar">
          {onBack && <button type="button" className="faq56-back" onClick={onBack} aria-label="도움말로 돌아가기" />}
          <h1>자주 묻는 질문</h1>
        </header>
        <section className="faq56-sticky" aria-label="질문 검색 및 분류">
          <div className="faq56-searchbox">
            <span className="faq56-magnify" aria-hidden="true" />
            <input
              type="search"
              placeholder="궁금한 내용을 검색해보세요"
              aria-label="질문 검색"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button className="faq56-clear" type="button" aria-label="검색어 지우기" onClick={() => setQuery('')}>×</button>
            )}
          </div>
          <div className="faq56-tabs" role="tablist" aria-label="자주 묻는 질문 분류">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className="faq56-tab"
                role="tab"
                aria-selected={category === tab.id}
                onClick={() => setCategory(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>
        {showIntro && (
          <div className="faq56-intro">
            <div className="faq56-intro-icon"><img src="/assets/ui-icons/ui_help.webp" alt="" /></div>
            <div><strong>궁금한 내용을 확인해보세요</strong><span>검색하거나 카테고리를 선택해 빠르게 찾을 수 있어요.</span></div>
          </div>
        )}
        <div className="faq56-content">
          {(['basic', 'data', 'repeat', 'settings'] as const).map((cat) => {
            const items = visibleByCategory.get(cat);
            if (!items || items.length === 0) return null;
            return (
              <section className="faq56-category" key={cat}>
                <h2>{CATEGORY_LABELS[cat]}</h2>
                <div className="faq56-list">
                  {items.map((item) => {
                    const open = openKeys.has(item.key);
                    return (
                      <div className={`faq56-item${open ? ' open' : ''}`} key={item.key}>
                        <button className="faq56-question" type="button" aria-expanded={open} onClick={() => toggleItem(item.key)}>
                          <span>{item.question}</span>
                          <span className="faq56-arrow" aria-hidden="true" />
                        </button>
                        {open && <div className="faq56-answer">{item.answer}</div>}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          {visibleCount === 0 && (
            <div className="faq56-empty">검색 결과가 없어요.<br />다른 검색어를 입력해 보세요.</div>
          )}
          {visibleCount > 0 && <p className="faq56-footnote">검색어와 필터는 함께 사용할 수 있어요.</p>}
        </div>
      </div>
    </main>
  );
}
