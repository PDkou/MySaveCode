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
  { id: 'data', label: K('데이터와 백업') },
  { id: 'repeat', label: K('알림과 반복') },
  { id: 'settings', label: K('앱 설정') },
];

const CATEGORY_LABELS: Record<Exclude<FaqCategory, 'all'>, string> = {
  basic: K('기본 사용'),
  data: K('데이터와 백업'),
  repeat: K('알림과 반복'),
  settings: K('앱 설정'),
};

const FAQ_ITEMS: FaqItem[] = [
  { key: 'make-drawer', category: 'basic', question: K('새 서랍은 어떻게 만들어요?'), answer: K('아래 가운데 + 버튼을 누르면 새 서랍을 만들 수 있어요. 이름, 아이콘, 색을 고르고 서랍 칸을 정하면 끝이에요. 템플릿으로 시작해도 돼요.') },
  { key: 'edit-columns', category: 'basic', question: K('서랍 칸은 나중에 수정할 수 있나요?'), answer: K('서랍을 열고 오른쪽 위 •••에서 서랍 관리 → 서랍 칸 편집으로 가면 칸을 더하거나 이름을 바꾸고 순서를 옮길 수 있어요.') },
  { key: 'add-collection', category: 'basic', question: K('보관품은 어떻게 추가하나요?'), answer: K('서랍을 열고 아래의 서랍 채우기 버튼을 누르면 보관품을 하나씩 추가할 수 있어요.') },
  { key: 'add-photo', category: 'basic', question: K('사진도 등록할 수 있나요?'), answer: K('보관품마다 사진을 최대 3장까지 담을 수 있어요. 서랍 채우기에서 사진 추가를 눌러 폰의 사진을 골라 주세요.') },
  { key: 'data-storage', category: 'data', question: K('내 데이터는 어디에 저장되나요?'), answer: K('Drawary의 기록은 모두 이 기기에만 저장돼요. 서버로 보내지 않아요. 백업은 설정 → 데이터 관리에서 직접 만들 수 있어요.') },
  { key: 'export', category: 'data', question: K('CSV나 PDF는 어디에서 내보내나요?'), answer: K('서랍의 표 보기 화면에서 오른쪽 위 •••를 누르거나, 서랍 관리의 "내보내기"에서 CSV나 PDF로 내보낼 수 있어요. 저장할 곳은 직접 고를 수 있어요.') },
  { key: 'backup-restore', category: 'data', question: K('백업은 어디에서 하나요?'), answer: K('설정 → 데이터 관리 → 백업하기에서 만들 수 있어요. 폰에 저장하거나 Google Drive로 보낼 수 있어요.') },
  { key: 'restore', category: 'data', question: K('백업한 데이터는 어떻게 복원하나요?'), answer: K('설정 → 데이터 관리 → 복원하기에서 백업 파일을 고르고 내용을 확인한 뒤 복원해요. 지금 있는 기록이 중요하다면 먼저 백업해 두세요.') },
  { key: 'notification', category: 'repeat', question: K('알림은 어디에서 설정하나요?'), answer: K('서랍을 열고 ••• → 서랍 관리 → 알림 설정에서 날짜 칸을 기준으로 알림을 만들 수 있어요.') },
  { key: 'repeat', category: 'repeat', question: K('반복 설정은 어디에서 하나요?'), answer: K('서랍을 열고 ••• → 서랍 관리 → 반복 관리에서 날짜 칸을 기준으로 새 보관품을 자동으로 만들 수 있어요.') },
  { key: 'language', category: 'settings', question: K('언어는 어디에서 변경하나요?'), answer: K('설정 → 언어 설정에서 한국어, 日本語, English 중 하나를 고르고 적용을 누르세요.') },
  { key: 'theme', category: 'settings', question: K('테마는 어디에서 바꾸나요?'), answer: K('설정 → 테마에서 원하는 색상을 선택할 수 있어요.') },
  { key: 'lock', category: 'settings', question: K('앱 잠금은 어떻게 설정하나요?'), answer: K('설정 → 보안 설정에서 PIN을 만들고 앱 잠금을 켤 수 있어요. 지문이나 얼굴로 여는 것도 함께 켤 수 있어요.') },
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
            <div><strong>{t('궁금한 내용을 확인해보세요')}</strong><span>{t('검색하거나 분류를 골라 빠르게 찾을 수 있어요.')}</span></div>
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
            <div className="faq56-empty">{tl('검색 결과가 없어요.\n다른 검색어를 입력해보세요.')}</div>
          )}
          {visibleCount > 0 && <p className="faq56-footnote">{t('검색어와 필터는 함께 사용할 수 있어요.')}</p>}
        </div>
      </div>
    </section>
  );
}
