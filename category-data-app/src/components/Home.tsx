import { useState, type CSSProperties } from 'react';
import type { AppData, Category, FieldDef } from '../types';
import { AddCategoryModal } from './AddCategoryModal';
import { BackupSheet } from './BackupSheet';

interface HomeProps {
  data: AppData;
  onOpenCategory: (id: string) => void;
  onAddCategory: (input: { name: string; emoji: string; color: string; fields: FieldDef[] }) => Category;
  onImport: (data: AppData) => void;
}

export function Home({ data, onOpenCategory, onAddCategory, onImport }: HomeProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [showBackup, setShowBackup] = useState(false);

  const entryCount = (categoryId: string) => data.entries.filter((e) => e.categoryId === categoryId).length;

  return (
    <div className="screen home-screen">
      <header className="app-header home-header">
        <span className="home-logo" aria-hidden="true">
          <span className="home-logo-drawer" />
          <span className="home-logo-drawer" />
        </span>
        <div className="home-header-text">
          <h1>나만의 서랍장</h1>
          <p className="home-header-tagline">카테고리를 만들고, 표로 정리해요</p>
        </div>
        <button type="button" className="icon-btn" onClick={() => setShowBackup(true)} aria-label="백업/복원">
          ⚙️
        </button>
      </header>

      <div className="screen-content">
        {data.categories.length === 0 ? (
          <div className="empty-state">
            <p>아직 카테고리가 없어요.</p>
            <p className="empty-hint">가계부, 옷장, 화장품처럼 원하는 카테고리를 만들어 기록을 시작해 보세요.</p>
          </div>
        ) : (
          <div className="category-grid">
            {data.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className="category-card"
                style={{ '--card-accent': c.color } as CSSProperties}
                onClick={() => onOpenCategory(c.id)}
              >
                <span className="category-card-badge">{c.emoji}</span>
                <span className="category-card-name">{c.name}</span>
                <span className="category-card-count">{entryCount(c.id)}건</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" className="fab" onClick={() => setShowAdd(true)} aria-label="카테고리 추가">
        +
      </button>

      {showAdd && (
        <AddCategoryModal
          onCreate={(input) => {
            const created = onAddCategory(input);
            setShowAdd(false);
            onOpenCategory(created.id);
          }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showBackup && <BackupSheet data={data} onImport={onImport} onClose={() => setShowBackup(false)} />}
    </div>
  );
}
