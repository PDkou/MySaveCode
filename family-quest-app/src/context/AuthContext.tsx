import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { useTranslation } from 'react-i18next';

import { supabase } from '../lib/supabaseClient';
import type { AppLanguageCode, ProfileRow } from '../types/database';
import { LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from '../i18n';
import { AvatarPhotoError, deleteAvatarPhoto, getAvatarPhotoUrls, uploadAvatarPhoto } from '../lib/avatarPhotos';

export class AuthActionError extends Error {
  translationKey: string;

  constructor(translationKey: string) {
    super(translationKey);
    this.translationKey = translationKey;
  }
}

function mapAuthErrorToKey(message: string | undefined): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('invalid login credentials')) return 'auth.error.invalidCredentials';
  if (m.includes('already registered') || m.includes('already exists')) return 'auth.error.emailInUse';
  if (m.includes('password should be at least') || m.includes('password')) return 'auth.error.weakPassword';
  if (m.includes('unable to validate email') || m.includes('invalid email')) return 'auth.error.invalidEmail';
  if (m.includes('email not confirmed')) return 'auth.error.emailNotConfirmed';
  return 'auth.error.unknown';
}

function detectDeviceLanguage(): AppLanguageCode {
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'ko';
  return nav.toLowerCase().startsWith('ja') ? 'ja' : 'ko';
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  avatarUrl: string | null;
  initializing: boolean;
  profileLoading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setLanguage: (language: AppLanguageCode) => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  updateAvatarPhoto: (blob: Blob) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    setProfileLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw error;
      setProfile(data);
      if (data && SUPPORTED_LANGUAGES.includes(data.preferred_language)) {
        void i18n.changeLanguage(data.preferred_language);
      }
      if (data?.avatar_path) {
        const urls = await getAvatarPhotoUrls([data.avatar_path]);
        setAvatarUrl(urls.get(data.avatar_path) ?? null);
      } else {
        setAvatarUrl(null);
      }
    } finally {
      setProfileLoading(false);
    }
  }, [i18n]);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setInitializing(false);
      if (data.session?.user) {
        void loadProfile(data.session.user.id);
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        void loadProfile(nextSession.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      throw new AuthActionError('auth.error.displayNameRequired');
    }
    const preferred_language = SUPPORTED_LANGUAGES.includes(i18n.language as AppLanguageCode)
      ? (i18n.language as AppLanguageCode)
      : detectDeviceLanguage();

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: trimmedName,
          preferred_language,
        },
      },
    });

    if (error) {
      throw new AuthActionError(mapAuthErrorToKey(error.message));
    }

    return { needsEmailConfirmation: !data.session };
  }, [i18n.language]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      throw new AuthActionError(mapAuthErrorToKey(error.message));
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) {
      throw new AuthActionError('auth.error.emailRequired');
    }
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      throw new AuthActionError(mapAuthErrorToKey(error.message));
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    if (newPassword.length < 6) {
      throw new AuthActionError('auth.error.weakPassword');
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new AuthActionError(mapAuthErrorToKey(error.message));
    }
  }, []);

  const setLanguage = useCallback(async (language: AppLanguageCode) => {
    await i18n.changeLanguage(language);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // localStorage can be unavailable (private mode / storage quota) -- the
      // language still applies for this session via i18next's in-memory state.
    }
    if (session?.user) {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_language: language })
        .eq('id', session.user.id);
      if (!error) {
        setProfile((prev) => (prev ? { ...prev, preferred_language: language } : prev));
      }
    }
  }, [i18n, session]);

  const updateDisplayName = useCallback(async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new AuthActionError('auth.error.displayNameRequired');
    }
    if (!session?.user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: trimmedName })
      .eq('id', session.user.id);
    if (error) {
      throw new AuthActionError('auth.error.unknown');
    }
    setProfile((prev) => (prev ? { ...prev, display_name: trimmedName } : prev));
  }, [session]);

  const updateAvatarPhoto = useCallback(async (blob: Blob) => {
    if (!session?.user) return;
    const userId = session.user.id;
    const previousPath = profile?.avatar_path ?? null;

    const path = await uploadAvatarPhoto(userId, blob);

    // getAvatarPhotoUrls swallows storage errors and returns an empty map
    // (reasonable for the batch case elsewhere, where one bad avatar
    // shouldn't break a whole member list) -- but here, silently leaving
    // avatarUrl unset after a "successful" upload would look exactly like
    // nothing happened. Failing loudly instead surfaces whatever's actually
    // wrong (e.g. the avatars bucket/policies not deployed yet).
    const urls = await getAvatarPhotoUrls([path]);
    const newUrl = urls.get(path);
    if (!newUrl) {
      throw new AvatarPhotoError('profile.error.photoUploadFailed');
    }

    const { error } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId);
    if (error) {
      throw new AvatarPhotoError('profile.error.photoUploadFailed');
    }

    setProfile((prev) => (prev ? { ...prev, avatar_path: path } : prev));
    setAvatarUrl(newUrl);

    // Best-effort cleanup of the replaced file -- not worth failing the
    // whole update if this doesn't succeed.
    if (previousPath) {
      void deleteAvatarPhoto(previousPath);
    }
  }, [session, profile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) {
      await loadProfile(session.user.id);
    }
  }, [session, loadProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    avatarUrl,
    initializing,
    profileLoading,
    signUp,
    signIn,
    signOut,
    setLanguage,
    updateDisplayName,
    updateAvatarPhoto,
    sendPasswordReset,
    updatePassword,
    refreshProfile,
  }), [
    session, profile, avatarUrl, initializing, profileLoading, signUp, signIn, signOut, setLanguage,
    updateDisplayName, updateAvatarPhoto, sendPasswordReset, updatePassword, refreshProfile,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
