import { useState } from 'react';
import { useAppData } from './hooks/useAppData';
import { Home } from './components/Home';
import { CategoryDetail } from './components/CategoryDetail';
import { TableScreen } from './components/TableScreen';

type View = { screen: 'home' } | { screen: 'category'; categoryId: string } | { screen: 'table'; categoryId: string };

function App() {
  const app = useAppData();
  const [view, setView] = useState<View>({ screen: 'home' });

  const category = view.screen !== 'home' ? app.data.categories.find((c) => c.id === view.categoryId) : undefined;

  return (
    <div className="app-shell">
      {app.saveError && <div className="save-error-banner">{app.saveError}</div>}

      {view.screen === 'home' && (
        <Home
          data={app.data}
          onOpenCategory={(id) => setView({ screen: 'category', categoryId: id })}
          onAddCategory={app.addCategory}
          onImport={app.replaceAll}
        />
      )}

      {view.screen === 'category' && (
        <CategoryDetail
          data={app.data}
          categoryId={view.categoryId}
          onBack={() => setView({ screen: 'home' })}
          onOpenTable={() => setView({ screen: 'table', categoryId: view.categoryId })}
          onUpdateCategory={(patch) => app.updateCategory(view.categoryId, patch)}
          onDeleteCategory={() => {
            app.deleteCategory(view.categoryId);
            setView({ screen: 'home' });
          }}
          onAddField={(field) => app.addField(view.categoryId, field)}
          onUpdateField={(fieldId, patch) => app.updateField(view.categoryId, fieldId, patch)}
          onRemoveField={(fieldId) => app.removeField(view.categoryId, fieldId)}
          onMoveField={(fieldId, direction) => app.moveField(view.categoryId, fieldId, direction)}
          onAddEntry={(values) => app.addEntry(view.categoryId, values)}
          onUpdateEntry={app.updateEntry}
          onDeleteEntry={app.deleteEntry}
        />
      )}

      {view.screen === 'table' &&
        (category ? (
          <TableScreen
            category={category}
            entries={app.data.entries.filter((e) => e.categoryId === view.categoryId)}
            onBack={() => setView({ screen: 'category', categoryId: view.categoryId })}
            onAddEntry={(values) => app.addEntry(view.categoryId, values)}
            onUpdateEntry={app.updateEntry}
            onDeleteEntry={app.deleteEntry}
          />
        ) : (
          // Category no longer exists (e.g. deleted in another tab) --
          // shouldn't normally happen since deleting a category always
          // navigates home first, but guard against it rather than
          // setState-during-render.
          <div className="screen">
            <p className="empty-hint">카테고리를 찾을 수 없어요.</p>
            <button type="button" className="btn btn-secondary" onClick={() => setView({ screen: 'home' })}>
              홈으로
            </button>
          </div>
        ))}
    </div>
  );
}

export default App;
