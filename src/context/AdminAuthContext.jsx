import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const AdminAuthContext = createContext(null);

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  editor: 'Content Manager',
  viewer: 'Viewer',
};

/**
 * Provides persistent Supabase Auth session & verified admin_profiles RBAC state.
 * Never relies on client-only role flags; always loads role & is_active from PostgreSQL.
 */
export function AdminAuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  const loadAdminProfile = useCallback(async (userId) => {
    if (!supabase || !userId) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase
      .from('admin_profiles')
      .select('id, email, full_name, role, is_active, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setProfile(null);
      setAuthError(error.message || 'Unable to verify administrator profile.');
      return null;
    }

    if (!data) {
      setProfile(null);
      setAuthError(
        'This account is not registered in admin_profiles. Contact a Super Admin.'
      );
      return null;
    }

    if (!data.is_active) {
      setProfile(null);
      setAuthError(
        'Your administrator account is currently deactivated. Contact a Super Admin.'
      );
      return null;
    }

    setAuthError('');
    setProfile(data);
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      setAuthError(
        'Supabase environment variables are missing. Check .env.local.'
      );
      return undefined;
    }

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) {
          setAuthError(error.message);
          setSession(null);
          setProfile(null);
        } else {
          const activeSession = data?.session || null;
          setSession(activeSession);
          if (activeSession?.user?.id) {
            await loadAdminProfile(activeSession.user.id);
          } else {
            setProfile(null);
          }
        }
      } catch (err) {
        if (mounted) {
          setAuthError(err.message || 'Failed to restore session.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (!mounted) return;
        setSession(nextSession);
        if (nextSession?.user?.id) {
          setLoading(true);
          loadAdminProfile(nextSession.user.id).finally(() => {
            if (mounted) setLoading(false);
          });
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [loadAdminProfile]);

  const signIn = useCallback(
    async (email, password) => {
      if (!isSupabaseConfigured || !supabase) {
        throw new Error('Supabase client is not configured.');
      }
      setAuthError('');

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      const verifiedProfile = await loadAdminProfile(data.user.id);
      if (!verifiedProfile) {
        await supabase.auth.signOut();
        throw new Error(
          'Access denied: account is not an active SRC administrator.'
        );
      }

      return verifiedProfile;
    },
    [loadAdminProfile]
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setAuthError('');
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) {
      return loadAdminProfile(session.user.id);
    }
    return null;
  }, [session, loadAdminProfile]);

  const role = profile?.role || null;
  const isSuperAdmin = role === 'super_admin' && Boolean(profile?.is_active);
  const isContentManager = role === 'editor' && Boolean(profile?.is_active);
  const isViewer = role === 'viewer' && Boolean(profile?.is_active);
  const canEdit = isSuperAdmin || isContentManager;
  const isAuthenticatedAdmin = Boolean(session && profile && profile.is_active);

  return (
    <AdminAuthContext.Provider
      value={{
        session,
        user: session?.user || null,
        profile,
        role,
        roleLabel: role ? ROLE_LABELS[role] || role : '',
        isSuperAdmin,
        isContentManager,
        isViewer,
        canEdit,
        isAuthenticatedAdmin,
        loading,
        authError,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return ctx;
}
