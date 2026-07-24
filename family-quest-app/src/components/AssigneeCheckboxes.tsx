import type { FamilyMember } from '../context/FamilyContext';

interface AssigneeCheckboxesProps {
  members: FamilyMember[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function AssigneeCheckboxes({ members, selectedIds, onChange }: AssigneeCheckboxesProps) {
  const toggle = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  return (
    <div className="checkbox-group">
      {members.map((m) => (
        <label key={m.user_id} className="checkbox-row">
          <input
            type="checkbox"
            checked={selectedIds.includes(m.user_id)}
            onChange={() => toggle(m.user_id)}
          />
          <span>{m.display_name}</span>
        </label>
      ))}
    </div>
  );
}
