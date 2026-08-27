import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { getAvatarPhotoUrls } from '../lib/avatarPhotos';
import { APP_MODE } from '../lib/appMode';
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
  if (m.includes('room_creation_limit_reached')) return 'family.error.roomLimitReached';
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
  status_message: string | null;
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

  // Guards against overlapping load() calls landing out of order -- e.g. the
  // initial mount's load(userId) racing a refresh() fired right after (shop
  // purchase, avatar upload, a second effect run), each hitting Supabase
  // independently. Without this, whichever response happened to arrive
  // *last* won regardless of which call was actually the newer one, so a
  // slower earlier response could overwrite a faster later one and briefly
  // show a stale/different family before the real one reasserted itself on
  // the next render. Far more visible on a flaky mobile connection, where
  // response ordering across two in-flight requests is much less reliable
  // than on a fast, stable connection (2026-08-01 bug report: "a different
  // room flashes on refresh, only noticeable on phone").
  const loadSeqRef = useRef(0);

  // preferredFamilyId lets createFamily/joinFamily/switchFamily jump
  // straight to the family that was just created/joined/picked, instead of
  // falling back to whatever was previously stored.
  //
  // `silent` skips the loading flag entirely -- App.tsx's route guards treat
  // `loading` as "tear down the whole page and show a full-screen spinner",
  // which is right for the very first load but was also firing on every
  // refresh() call (e.g. after a shop purchase or avatar upload), unmounting
  // the current page -- and whatever modal was open on it -- for the
  // duration of the refetch. A background refresh of already-loaded data
  // shouldn't blow away the screen the user is looking at.
  const load = useCallback(async (userId: string, preferredFamilyId?: string, options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    const mySeq = ++loadSeqRef.current;
    // Bails out of committing any further state once a newer load() call
    // has started -- this call's in-flight results are stale by definition.
    const isStale = () => loadSeqRef.current !== mySeq;
    if (!silent) setLoading(true);
    try {
      const { data: membershipRows, error: membershipErr } = await supabase
        .from('family_members')
        .select('family_id, joined_at')
        .eq('user_id', userId)
        .order('joined_at', { ascending: true })
        .order('family_id', { ascending: true });

      if (membershipErr) throw membershipErr;
      if (isStale()) return;

      if (!membershipRows || membershipRows.length === 0) {
        setFamilies([]);
        setFamily(null);
        setMembers([]);
        return;
      }

      const familyIds = membershipRows.map((m) => m.family_id);
      // family-quest-app and business-quest-app share one Supabase project
      // (and so one auth.users table) -- an account that's a member of
      // rooms in both apps (e.g. tested both with the same email) would
      // otherwise see the *other* app's rooms bleed into this one's family
      // switcher, since family_members carries no room_type of its own.
      // Scoping this query to the current app's own room_type keeps each
      // app showing only the rooms it's meant to. Membership rows for the
      // other room_type still exist in the DB (this doesn't hide or
      // delete them) -- they just don't surface here.
      const { data: familyRows, error: familiesErr } = await supabase
        .from('families')
        .select('*')
        .in('id', familyIds)
        .eq('room_type', APP_MODE);

      if (familiesErr) throw familiesErr;
      if (isStale()) return;

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
      if (isStale()) return;

      const memberIds = (memberRows ?? []).map((m) => m.user_id);
      const { data: profileRows, error: profilesErr } = memberIds.length
        ? await supabase.from('profiles').select('id, display_name, avatar_path, status_message').in('id', memberIds)
        : { data: [], error: null };

      if (profilesErr) throw profilesErr;
      if (isStale()) return;

      const profileNameById = new Map((profileRows ?? []).map((p) => [p.id, p.display_name]));
      const avatarPathById = new Map((profileRows ?? []).map((p) => [p.id, p.avatar_path as string | null]));
      const statusMessageById = new Map(
        (profileRows ?? []).map((p) => [p.id, p.status_message as string | null]),
      );

      setMembers(
        (memberRows ?? []).map((m) => ({
          ...m,
          // A per-family override (m.display_name) wins when set; otherwise
          // fall back to the account's global profile name.
          display_name: m.display_name?.trim() || profileNameById.get(m.user_id) || '',
          avatar_path: avatarPathById.get(m.user_id) ?? null,
          // Global (account-level, not per-family), same as avatar_path --
          // FamilyMembersModal shows this next to each member's name.
          status_message: statusMessageById.get(m.user_id) ?? null,
        })),
      );

      const avatarPaths = Array.from(avatarPathById.values()).filter((p): p is string => !!p);
      const urlByPath = await getAvatarPhotoUrls(avatarPaths);
      if (isStale()) return;

      const urlByUserId = new Map<string, string>();
      avatarPathById.forEach((path, userId) => {
        if (path) {
          const url = urlByPath.get(path);
          if (url) urlByUserId.set(userId, url);
        }
      });
      setAvatarUrlByUserId(urlByUserId);
    } finally {
      if (!silent && !isStale()) setLoading(false);
    }
  }, []);

  // Keyed on user.id, not the user/session object itself -- Supabase
  // refreshes the auth session (and mints a new session/user object) every
  // time the tab regains focus, e.g. after alt-tabbing back. Depending on
  // the object here would re-run this non-silent load and flash the whole
  // app to a loading screen (App.tsx gates all routes on familyLoading) on
  // every one of those, even though the actual signed-in user never changed.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) {
      setFamily(null);
      setFamilies([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    void load(userId);
  }, [userId, load]);

  const refresh = useCallback(async () => {
    if (user) {
      await load(user.id, family?.id, { silent: true });
    }
  }, [user, load, family]);

  // Login-streak tracking (GAMIFICATION_DESIGN.md section 13-A) fires once
  // per family per app session; the periodic heartbeat below is a separate,
  // lighter-weight "still actively here" signal used for presence-based
  // titles (section 13-C) -- keyed on family.id, not the family object
  // itself, since load() creates a new family object on every refresh
  // (including silent background ones) even when nothing changed.
  const familyId = family?.id;
  useEffect(() => {
    if (!familyId) return;
    void supabase.rpc('record_login', { p_family_id: familyId });
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    const tap = () => {
      void supabase.rpc('tap_heartbeat', { p_family_id: familyId });
    };
    const interval = window.setInterval(tap, 25000);
    return () => window.clearInterval(interval);
  }, [familyId]);

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
    // Passing our own room_type lets the server reject joining a room
    // meant for the other app (see schema section 33) instead of silently
    // creating a membership that only the load() filter above would hide.
    const { data, error } = await supabase.rpc('join_family_room', { p_code: code, p_room_type: APP_MODE });
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
