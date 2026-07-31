import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useFamily } from '../context/FamilyContext';
import { useTasks } from '../context/TasksContext';
import { EmptyState } from '../components/EmptyState';
import { Spinner } from '../components/Spinner';
import { getTaskPhotoUrls } from '../lib/taskPhotos';
import { formatDateTime } from '../lib/formatDate';
import type { TaskRow } from '../types/database';

export function PhotoGalleryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { members } = useFamily();
  const { tasks } = useTasks();

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.display_name));
    return map;
  }, [members]);

  const photoTasks = useMemo(
    () =>
      tasks
        .filter((task): task is TaskRow & { completion_photo_path: string } => !!task.completion_photo_path)
        .sort((a, b) => new Date(b.completed_at ?? 0).getTime() - new Date(a.completed_at ?? 0).getTime()),
    [tasks],
  );

  const [urlByPath, setUrlByPath] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const paths = photoTasks.map((task) => task.completion_photo_path);
    if (paths.length === 0) {
      setUrlByPath(new Map());
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void getTaskPhotoUrls(paths).then((map) => {
      if (!cancelled) {
        setUrlByPath(map);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [photoTasks]);

  return (
    <div className="screen gallery-screen">
      <div className="topbar">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
          {t('common.back')}
        </button>
        <h1 className="gallery-heading">{t('gallery.heading')}</h1>
      </div>

      {loading ? (
        <Spinner label={t('common.loading')} />
      ) : photoTasks.length === 0 ? (
        <EmptyState message={t('gallery.empty')} illustration="/illustrations/empty-photos.png" />
      ) : (
        <div className="gallery-grid">
          {photoTasks.map((task) => {
            const url = urlByPath.get(task.completion_photo_path);
            if (!url) return null;
            return (
              <button
                key={task.id}
                type="button"
                className="gallery-item"
                onClick={() => navigate(`/task/${task.id}`)}
              >
                <img src={url} alt={task.title} className="gallery-item-img" loading="lazy" />
                <div className="gallery-item-overlay">
                  <span className="gallery-item-title">{task.title}</span>
                  <span className="gallery-item-meta">
                    {nameByUserId.get(task.completed_by ?? '') ?? ''}
                    {task.completed_at ? ` · ${formatDateTime(task.completed_at, i18n.language)}` : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
