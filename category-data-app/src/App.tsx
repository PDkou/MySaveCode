import { useState } from 'react';
import { useAppData } from './hooks/useAppData';
import { Home } from './components/Home';
import { CategoryDetail } from './components/CategoryDetail';

type View = { screen: 'home' } | { screen: 'category'; categoryId: string };

function App() {
  const app = useAppData();
  const [view, setView] = useState<View>({ screen: 'home' });

  return (
    <div className="app-shell">
      {app.saveError && <div className="save-error-banner">{app.saveError}</div>}

      {view.screen === 'home' ? (
        <Home
          data={app.data}
          onOpenCategory={(id) => setView({ screen: 'category', categoryId: id })}
          onAddCategory={app.addCategory}
          onImport={app.replaceAll}
        />
      ) : (
        <CategoryDetail
          data={app.data}
          categoryId={view.categoryId}
          onBack={() => setView({ screen: 'home' })}
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
    </div>
  );
}

export default App;
