import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, AuthUser, UserRole } from '../lib/supabase';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string, role: UserRole) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole, additionalData?: any) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const role = await getUserRole(session.user.id);
        setUser({
          id: session.user.id,
          email: session.user.email!,
          role,
        });
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = async (userId: string): Promise<UserRole> => {
    const { data: admin } = await supabase
      .from('admin')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (admin) return 'admin';

    const { data: participant } = await supabase
      .from('participants')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (participant) return 'participant';

    return null;
  };

const signIn = async (email: string, password: string, role: UserRole) => {
  // First, try to sign in using Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error('Invalid email or password');
  }

  // Get the role from your custom tables (optional but cleaner)
  const { data: roleCheck } = await supabase
    .from(role === 'admin' ? 'admin' : 'participants')
    .select('id')
    .eq('id', data.user?.id)
    .maybeSingle();

  if (!roleCheck) {
    throw new Error('Access denied for this role');
  }

  if (data.user) {
    setUser({
      id: data.user.id,
      email: data.user.email!,
      role,
    });
  }
};


  const signUp = async (email: string, password: string, role: UserRole, additionalData?: any) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user && role === 'participant' && additionalData) {
      const { error: insertError } = await supabase
        .from('participants')
        .insert({
          id: data.user.id,
          email,
          password_hash: password,
          ...additionalData,
        });

      if (insertError) throw insertError;

      setUser({
        id: data.user.id,
        email,
        role: 'participant',
      });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
