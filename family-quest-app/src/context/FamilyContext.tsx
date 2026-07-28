import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { getAvatarPhotoUrls } from '../lib/avatarPhotos';
import type { FamilyMemberRow, FamilyRoomType, FamilyRow } from '../types/database';

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
  if (m.includes('not_authorized')) return 'family.error.notAuthorized';
  if (m.includes('cannot_remove_self')) return 'family.error.cannotRemoveSelf';
  if (m.includes('member_not_found') || m.includes('not_a_member')) return 'family.error.memberNotFound';
  return 'family.error.unknown';
}

const activeFamilyStorageKey = (userId: string) => `familyquest.active-family.${userId}`;

export interface FamilyMember extends FamilyMemberRow {
  display_name: string;
  avatar_path: string | null;
}

interface FamilyContextValue {
  family: FamilyRow | null;
  families: FamilyRow[];
  members: FamilyMember[];
  avatarUrlByUserId: Map<string, string>;
  loading: boolean;
  createFamily: (name: string, roomType?: FamilyRoomType) => Promise<void>;
  joinFamily: (code: string) => Promise<void>;
  renameFamily: (name: string) => Promise<void>;
  updateMyDisplayName: (name: string) => Promise<void>;
  leaveFamily: (familyId: string) => Promise<void>;
  removeMember: (familyId: string, userId: string) => Promise<void>;
  regenerateInviteCode: (familyId: string) => Promise<void>;
  switchFamily: (familyId: string) => void;
  refresh: () => Promise<void>;
}

const FamilyContext = createContext<FamilyContextValue | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [family, setFamily] = useState<FamilyRow | null>(null);
  const [families, setFamilies] = useState<FamilyRow[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [avatarUrlByUserId, setAvatarUrlByUserId] = useState<Map<string, string>>(new Map());
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
        ? await supabase.from('profiles').select('id, display_name, avatar_path').in('id', memberIds)
        : { data: [], error: null };

      if (profilesErr) throw profilesErr;

      const profileNameById = new Map((profileRows ?? []).map((p) => [p.id, p.display_name]));
      const avatarPathById = new Map((profileRows ?? []).map((p) => [p.id, p.avatar_path as string | null]));

      setMembers(
        (memberRows ?? []).map((m) => ({
          ...m,
          // A per-family override (m.display_name) wins when set; otherwise
          // fall back to the account's global profile name.
          display_name: m.display_name?.trim() || profileNameById.get(m.user_id) || '',
          avatar_path: avatarPathById.get(m.user_id) ?? null,
        })),
      );

      const avatarPaths = Array.from(avatarPathById.values()).filter((p): p is string => !!p);
      const urlByPath = await getAvatarPhotoUrls(avatarPaths);
      const urlByUserId = new Map<string, string>();
      avatarPathById.forEach((path, userId) => {
        if (path) {
          const url = urlByPath.get(path);
          if (url) urlByUserId.set(userId, url);
        }
      });
      setAvatarUrlByUserId(urlByUserId);
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

  const createFamily = useCallback(async (name: string, roomType: FamilyRoomType = 'family') => {
    const { data, error } = await supabase.rpc('create_family_room', { p_name: name, p_room_type: roomType });
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

  // Leaving clears the locally-stored "active family" pointer for this room
  // if it was the active one, then reloads -- load() will fall back to
  // whichever family (if any) is still left for this user.
  const leaveFamily = useCallback(async (familyId: string) => {
    if (!user) return;
    const { error } = await supabase.rpc('leave_family', { p_family_id: familyId });
    if (error) {
      throw new FamilyActionError(mapFamilyErrorToKey(error.message));
    }
    const stored = window.localStorage.getItem(activeFamilyStorageKey(user.id));
    if (stored === familyId) {
      window.localStorage.removeItem(activeFamilyStorageKey(user.id));
    }
    await load(user.id);
  }, [user, load]);

  const removeMember = useCallback(async (familyId: string, userId: string) => {
    const { error } = await supabase.rpc('remove_family_member', { p_family_id: familyId, p_user_id: userId });
    if (error) {
      throw new FamilyActionError(mapFamilyErrorToKey(error.message));
    }
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
  }, []);

  const regenerateInviteCode = useCallback(async (familyId: string) => {
    const { data, error } = await supabase.rpc('regenerate_invite_code', { p_family_id: familyId });
    if (error) {
      throw new FamilyActionError(mapFamilyErrorToKey(error.message));
    }
    if (data) {
      setFamily((prev) => (prev && prev.id === familyId ? { ...prev, invite_code: data.invite_code } : prev));
      setFamilies((prev) => prev.map((f) => (f.id === familyId ? { ...f, invite_code: data.invite_code } : f)));
    }
  }, []);

  const value = useMemo<FamilyContextValue>(() => ({
    family,
    families,
    members,
    avatarUrlByUserId,
    loading,
    createFamily,
    joinFamily,
    renameFamily,
    updateMyDisplayName,
    leaveFamily,
    removeMember,
    regenerateInviteCode,
    switchFamily,
    refresh,
  }), [
    family, families, members, avatarUrlByUserId, loading, createFamily, joinFamily, renameFamily,
    updateMyDisplayName, leaveFamily, removeMember, regenerateInviteCode, switchFamily, refresh,
  ]);

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>;
}

export function useFamily(): FamilyContextValue {
  const ctx = useContext(FamilyContext);
  if (!ctx) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return ctx;
}
