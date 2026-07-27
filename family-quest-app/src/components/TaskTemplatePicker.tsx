import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { TaskRecurrence, TaskTemplateRow } from '../types/database';

interface TaskTemplatePickerProps {
  familyId: string;
  currentTitle: string;
  currentDetails: string;
  currentRecurrence: TaskRecurrence;
  currentAssigneeIds: string[];
  onApply: (template: TaskTemplateRow) => void;
}

// Lets the family save a frequently-repeated request once (title/details/
// recurrence/assignees) and reload it from a dropdown next time instead of
// retyping it -- see task_templates in schema.sql. The saved assignees are
// just a default the picker pre-fills; onApply's caller still lets them be
// freely changed afterward.
export function TaskTemplatePicker({
  familyId,
  currentTitle,
  currentDetails,
  currentRecurrence,
  currentAssigneeIds,
  onApply,
}: TaskTemplatePickerProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<TaskTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void supabase
      .from('task_templates')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!cancelled) {
          setTemplates(data ?? []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [familyId]);

  const handleSelect = (templateId: string) => {
    const template = templates.find((tpl) => tpl.id === templateId);
    if (template) onApply(template);
  };

  const handleSave = async () => {
    const trimmedTitle = currentTitle.trim();
    if (!trimmedTitle || !user || saving) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('task_templates')
        .insert({
          family_id: familyId,
          title: trimmedTitle,
          details: currentDetails.trim() ? currentDetails.trim() : null,
          recurrence: currentRecurrence,
          assignee_ids: currentAssigneeIds,
          created_by: user.id,
        })
        .select()
        .single();
      if (!error && data) setTemplates((prev) => [data, ...prev]);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    setTemplates((prev) => prev.filter((tpl) => tpl.id !== templateId));
    await supabase.from('task_templates').delete().eq('id', templateId);
  };

  return (
    <div className="field">
      <div className="field-label-row">
        <span>{t('taskForm.templateLabel')}</span>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => void handleSave()}
          disabled={!currentTitle.trim() || saving}
        >
          {t('taskForm.templateSave')}
        </button>
      </div>

      <select
        className="template-select"
        value=""
        onChange={(e) => {
          if (e.target.value) handleSelect(e.target.value);
        }}
        disabled={loading || templates.length === 0}
      >
        <option value="">
          {loading || templates.length === 0 ? t('taskForm.templateEmpty') : t('taskForm.templatePlaceholder')}
        </option>
        {templates.map((tpl) => (
          <option key={tpl.id} value={tpl.id}>
            {tpl.title}
          </option>
        ))}
      </select>

      {templates.length > 0 && (
        <div className="template-chip-row">
          {templates.map((tpl) => (
            <span key={tpl.id} className="template-chip">
              {tpl.title}
              <button
                type="button"
                className="template-chip-remove"
                onClick={() => void handleDelete(tpl.id)}
                aria-label={t('taskForm.templateDelete')}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
