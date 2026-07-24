import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import type { FamilyMemberRow, FamilyRow } from '../types/database';

export class FamilyActionError extends Error {
  translationKey: string;

  constructor(translationKey: string) {
    super(translationKey);
    this.translationKey = translationKey;
  }
}

function mapFamilyErrorToKey(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('already_in_this_family')) return 'family.error.alreadyInThisFamily';
  if (m.includes('invalid_family_name')) return 'family.error.nameRequired';
  if (m.includes('invalid_invite_code')) return 'family.error.invalidCode';
  if (m.includes('family_not_found')) return 'family.error.codeNotFound';
  if (m.includes('not_authenticated')) return 'auth.error.unknown';
  return 'family.error.unknown';
}

const activeFamilyStorageKey = (userId: string) => `familyquest.active-family.${userId}`;

export interface FamilyMember extends FamilyMemberRow {
  display_name: string;
}

interface FamilyContextValue {
  family: FamilyRow | null;
  families: FamilyRow[];
  members: FamilyMember[];
  loading: boolean;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (code: string) => Promise<void>;
  renameFamily: (name: string) => Promise<void>;
  updateMyDisplayName: (name: string) => Promise<void>;
  switchFamily: (familyId: string) => void;
  refresh: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [family, setFamily] = useState<FamilyRow | null>(null);
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // preferredFamilyId lets createFamily/joinFamily/switchFamily jump
  // straight to the family that was just created/joined/picked, instead of
  // falling back to whatever was previously stored.
  const load = useCallback(async (userId: string, preferredFamilyId?: string) => {
    setLoading(true);
    try {
      const { data: membershipRows, error: membershipErr } = await supabase
        .from('family_members')
        .select('family_id, joined_at')
        .eq('user_id', userId)
        .order('joined_at', { ascending: true });

      if (membershipErr) throw membershipErr;

      if (!membershipRows || membershipRows.length === 0) {
        setFamilies([]);
        setFamily(null);
        setMembers([]);
        return;
      }

      const familyIds = membershipRows.map((m) => m.family_id);
      const { data: familyRows, error: familiesErr } = await supabase
        .from('families')
        .select('*')
        .in('id', familyIds);

      if (familiesErr) throw familiesErr;

      const familyById = new Map((familyRows ?? []).map((f) => [f.id, f]));
      // Preserve join order (oldest membership first) rather than whatever
      // order the `in (...)` query happens to return.
      const orderedFamilies = membershipRows
        .map((m) => familyById.get(m.family_id))
        .filter((f): f is FamilyRow => !!f);

      setFamilies(orderedFamilies);

      let activeId = preferredFamilyId;
      if (!activeId) {
        const stored = window.localStorage.getItem(activeFamilyStorageKey(userId));
        activeId = stored && orderedFamilies.some((f) => f.id === stored) ? stored : orderedFamilies[0]?.id;
      }
      if (activeId) {
        window.localStorage.setItem(activeFamilyStorageKey(userId), activeId);
      }

      const activeFamily = orderedFamilies.find((f) => f.id === activeId) ?? null;
      setFamily(activeFamily);

      if (!activeFamily) {
        setMembers([]);
        return;
      }

      const { data: memberRows, error: membersErr } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', activeFamily.id)
        .order('joined_at', { ascending: true });

      if (membersErr) throw membersErr;

      const memberIds = (memberRows ?? []).map((m) => m.user_id);
      const { data: profileRows, error: profilesErr } = memberIds.length
        ? await supabase.from('profiles').select('id, display_name').in('id', memberIds)
        : { data: [], error: null };

      if (profilesErr) throw profilesErr;

      const profileNameById = new Map((profileRows ?? []).map((p) => [p.id, p.display_name]));

      setMembers(
        (memberRows ?? []).map((m) => ({
          ...m,
          // A per-family override (m.display_name) wins when set; otherwise
          // fall back to the account's global profile name.
          display_name: m.display_name?.trim() || profileNameById.get(m.user_id) || '',
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setFamily(null);
      setFamilies([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    void load(user.id);
  }, [user, load]);

  const refresh = useCallback(async () => {
    if (user) {
      await load(user.id, family?.id);
    }
  }, [user, load, family]);

  const switchFamily = useCallback(
    (familyId: string) => {
      if (!user) return;
      window.localStorage.setItem(activeFamilyStorageKey(user.id), familyId);
      void load(user.id, familyId);
    },
    [user, load],
  );

  const createFamily = useCallback(async (name: string) => {
    const { data, error } = await supabase.rpc('create_family_room', { p_name: name });
    if (error) {
      throw new FamilyActionError(mapFamilyErrorToKey(error.message));
    }
    if (user && data) {
      window.localStorage.setItem(activeFamilyStorageKey(user.id), data.id);
      await load(user.id, data.id);
    } else {
      await refresh();
    }
  }, [user, load, refresh]);

  const joinFamily = useCallback(async (code: string) => {
    const { data, error } = await supabase.rpc('join_family_room', { p_code: code });
    if (error) {
      throw new FamilyActionError(mapFamilyErrorToKey(error.message));
    }
    if (user && data) {
      window.localStorage.setItem(activeFamilyStorageKey(user.id), data.id);
      await load(user.id, data.id);
    } else {
      await refresh();
    }
  }, [user, load, refresh]);

  const renameFamily = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new FamilyActionError('family.error.nameRequired');
    }
    if (!family) return;
    const { error } = await supabase.from('families').update({ name: trimmed }).eq('id', family.id);
    if (error) {
      throw new FamilyActionError('family.error.unknown');
    }
    setFamily((prev) => (prev ? { ...prev, name: trimmed } : prev));
    setFamilies((prev) => prev.map((f) => (f.id === family.id ? { ...f, name: trimmed } : f)));
  }, [family]);

  // How the current user's name shows up to fellow members of THIS
  // specific family -- e.g. different in-laws vs. their own household.
  // Never touches profiles.display_name (the account-wide default used
  // when joining a new family for the first time).
  const updateMyDisplayName = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      throw new FamilyActionError('auth.error.displayNameRequired');
    }
    if (!family || !user) return;
    const { error } = await supabase
      .from('family_members')
      .update({ display_name: trimmed })
      .eq('family_id', family.id)
      .eq('user_id', user.id);
    if (error) {
      throw new FamilyActionError('family.error.unknown');
    }
    setMembers((prev) => prev.map((m) => (m.user_id === user.id ? { ...m, display_name: trimmed } : m)));
  }, [family, user]);

  const value = useMemo<FamilyContextValue>(() => ({
    family,
    families,
    members,
    loading,
    createFamily,
    joinFamily,
    renameFamily,
    updateMyDisplayName,
    switchFamily,
    refresh,
  }), [family, families, members, loading, createFamily, joinFamily, renameFamily, updateMyDisplayName, switchFamily, refresh]);

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return ctx;
}
