import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: Profile | null;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  profile: null,
  profileLoading: false,
  refreshProfile: async () => {},
});

export interface Profile {
  id: string;
  username: string | null;
  points: number | null;
  role: string | null;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    // Check for an initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Set up the auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Reset profile when session changes; it will refetch below
        if (!session?.user) {
          setProfile(null);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // ✅ Added empty dependency array

  const refreshProfile = async () => {
    if (!user?.id) {
      setProfile(null);
      return;
    }
    try {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, points, role ")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        console.error("Error fetching profile:", error.message);
        setProfile(null);
        return;
      }
      setProfile(
        data
          ? {
              id: data.id,
              username: data.username ?? null,
              points: data.points ?? 0,
              role: data.role ?? null,
            }
          : null
      );
    } finally {
      setProfileLoading(false);
    }
  };

  // Fetch profile when user changes
  useEffect(() => {
    if (user?.id) {
      refreshProfile();
    } else {
      setProfile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const value = {
    session,
    user,
    loading,
    profile,
    profileLoading,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
