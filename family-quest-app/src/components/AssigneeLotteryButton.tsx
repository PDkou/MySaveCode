import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { FamilyMember } from '../context/FamilyContext';

const CYCLE_INTERVAL_MS = 90;
const CYCLE_DURATION_MS = 1100;

interface AssigneeLotteryButtonProps {
  members: FamilyMember[];
  onPick: (userId: string) => void;
  onHighlightChange: (userId: string | null) => void;
}

// A fun way to settle "who does this chore" -- cycles the highlight
// through every member for a bit (see AssigneeCheckboxes' highlightedId
// prop for the visual side) before landing on a random winner.
export function AssigneeLotteryButton({ members, onPick, onHighlightChange }: AssigneeLotteryButtonProps) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // If the modal that owns this button (and thus onHighlightChange/onPick's
  // state) closes mid-animation, stop the interval instead of letting it
  // keep firing into unmounted state.
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, []);

  const handleClick = () => {
    if (picking || members.length < 2) return;
    setPicking(true);
    const ids = members.map((m) => m.user_id);
    const start = Date.now();

    intervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      if (elapsed >= CYCLE_DURATION_MS) {
        if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
        const winner = ids[Math.floor(Math.random() * ids.length)];
        onHighlightChange(winner);
        onPick(winner);
        setPicking(false);
        return;
      }
      onHighlightChange(ids[Math.floor(Math.random() * ids.length)]);
    }, CYCLE_INTERVAL_MS);
  };

  if (members.length < 2) return null;

  return (
    <button type="button" className="btn btn-ghost btn-sm lottery-btn" onClick={handleClick} disabled={picking}>
      {picking ? t('taskForm.lotteryPicking') : t('taskForm.lotteryButton')}
    </button>
  );
}
