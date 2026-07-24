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
  if (m.includes('already_in_family')) return 'family.error.alreadyInFamily';
  if (m.includes('invalid_family_name')) return 'family.error.nameRequired';
  if (m.includes('invalid_invite_code')) return 'family.error.invalidCode';
  if (m.includes('family_not_found')) return 'family.error.codeNotFound';
  if (m.includes('family_full')) return 'family.error.familyFull';
  if (m.includes('not_authenticated')) return 'auth.error.unknown';
  return 'family.error.unknown';
}

export interface FamilyMember extends FamilyMemberRow {
  display_name: string;
}

interface FamilyContextValue {
  family: FamilyRow | null;
  members: FamilyMember[];
  loading: boolean;
  createFamily: (name: string) => Promise<void>;
  joinFamily: (code: string) => Promise<void>;
  renameFamily: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [family, setFamily] = useState<FamilyRow | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (userId: string) => {
    setLoading(true);
    try {
      const { data: memberRow, error: memberErr } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (memberErr) throw memberErr;

      if (!memberRow) {
        setFamily(null);
        setMembers([]);
        return;
      }

      const [{ data: familyRow, error: familyErr }, { data: memberRows, error: membersErr }] = await Promise.all([
        supabase.from('families').select('*').eq('id', memberRow.family_id).maybeSingle(),
        supabase.from('family_members').select('*').eq('family_id', memberRow.family_id).order('joined_at', { ascending: true }),
      ]);

      if (familyErr) throw familyErr;
      if (membersErr) throw membersErr;

      const memberIds = (memberRows ?? []).map((m) => m.user_id);
      const { data: profileRows, error: profilesErr } = memberIds.length
        ? await supabase.from('profiles').select('id, display_name').in('id', memberIds)
        : { data: [], error: null };

      if (profilesErr) throw profilesErr;

      const nameById = new Map((profileRows ?? []).map((p) => [p.id, p.display_name]));

      setFamily(familyRow ?? null);
      setMembers(
        (memberRows ?? []).map((m) => ({
          ...m,
          display_name: nameById.get(m.user_id) ?? '',
        })),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setFamily(null);
      setMembers([]);
      setLoading(false);
      return;
    }
    void load(user.id);
  }, [user, load]);

  const refresh = useCallback(async () => {
    if (user) {
      await load(user.id);
    }
  }, [user, load]);

  const createFamily = useCallback(async (name: string) => {
    const { error } = await supabase.rpc('create_family_room', { p_name: name });
    if (error) {
      throw new FamilyActionError(mapFamilyErrorToKey(error.message));
    }
    await refresh();
  }, [refresh]);

  const joinFamily = useCallback(async (code: string) => {
    const { error } = await supabase.rpc('join_family_room', { p_code: code });
    if (error) {
      throw new FamilyActionError(mapFamilyErrorToKey(error.message));
    }
    await refresh();
  }, [refresh]);

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
  }, [family]);

  const value = useMemo<FamilyContextValue>(() => ({
    family,
    members,
    loading,
    createFamily,
    joinFamily,
    renameFamily,
    refresh,
  }), [family, members, loading, createFamily, joinFamily, renameFamily, refresh]);

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return ctx;
}
