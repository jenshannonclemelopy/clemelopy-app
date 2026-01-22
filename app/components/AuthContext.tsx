'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  profile_photo?: string;
  website_url?: string;
  business_name?: string;
  employee_count?: string;
  street_address?: string;
  apt_unit_suite?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone_number?: { countryCode: string; number: string };
  onboarding_completed?: boolean | string;
  // Tour completion tracking
  tour_home_completed?: boolean;
  tour_todo_completed?: boolean;
  tour_settings_completed?: boolean;
  tour_linking_strategy_completed?: boolean;
  tour_project_completed?: boolean;
  // Sample data tracking
  sample_task_created?: boolean;
  // Personal Tasks folder color preference
  personal_tasks_color?: string;
}

interface License {
  lifetime_uses: number;
  plan: string;
  status: string;
}

// Email confirmation status
export type EmailConfirmationStatus = 'confirmed' | 'grace_period' | 'blocked';

interface EmailConfirmationInfo {
  status: EmailConfirmationStatus;
  daysRemaining: number;
  runsRemaining: number;
  isConfirmed: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  // Email confirmation
  emailConfirmation: EmailConfirmationInfo;
  resendConfirmationEmail: () => Promise<{ error: any }>;
  refreshEmailConfirmationStatus: () => Promise<void>;
}

const GRACE_PERIOD_DAYS = 7;
const FREE_RUNS_LIMIT = 3;

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [license, setLicense] = useState<License | null>(null);
  const [emailConfirmation, setEmailConfirmation] = useState<EmailConfirmationInfo>({
    status: 'confirmed',
    daysRemaining: GRACE_PERIOD_DAYS,
    runsRemaining: FREE_RUNS_LIMIT,
    isConfirmed: true,
  });

  // Fetch user's license info
  const fetchLicense = async (email: string, accessToken: string): Promise<License | null> => {
    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/licenses?email=eq.${encodeURIComponent(email)}&app_slug=eq.geo-linking-strategy-map&select=lifetime_uses,plan,status&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        return data[0] as License;
      }
      return null;
    } catch (err) {
      console.error('AuthContext: Exception fetching license:', err);
      return null;
    }
  };

  // Calculate email confirmation status
  const calculateEmailConfirmationStatus = (
    user: User | null,
    license: License | null
  ): EmailConfirmationInfo => {
    // If no user, return default (will be blocked by auth anyway)
    if (!user) {
      return {
        status: 'confirmed',
        daysRemaining: GRACE_PERIOD_DAYS,
        runsRemaining: FREE_RUNS_LIMIT,
        isConfirmed: true,
      };
    }

    // Check if email is confirmed
    const isConfirmed = !!user.email_confirmed_at;
    
    if (isConfirmed) {
      return {
        status: 'confirmed',
        daysRemaining: GRACE_PERIOD_DAYS,
        runsRemaining: FREE_RUNS_LIMIT,
        isConfirmed: true,
      };
    }

    // Calculate days since signup
    const signupDate = new Date(user.created_at);
    const now = new Date();
    const daysSinceSignup = Math.floor((now.getTime() - signupDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, GRACE_PERIOD_DAYS - daysSinceSignup);

    // Calculate runs remaining
    const lifetimeUses = license?.lifetime_uses || 0;
    const runsRemaining = Math.max(0, FREE_RUNS_LIMIT - lifetimeUses);

    // Determine status
    let status: EmailConfirmationStatus = 'grace_period';
    
    // Block if: 7 days passed OR free runs exhausted
    if (daysRemaining === 0 || runsRemaining === 0) {
      status = 'blocked';
    }

    return {
      status,
      daysRemaining,
      runsRemaining,
      isConfirmed: false,
    };
  };

  // Refresh email confirmation status
  const refreshEmailConfirmationStatus = async () => {
    if (user && session?.access_token) {
      const licenseData = await fetchLicense(user.email || '', session.access_token);
      setLicense(licenseData);
      const confirmationStatus = calculateEmailConfirmationStatus(user, licenseData);
      setEmailConfirmation(confirmationStatus);
    }
  };

  // Resend confirmation email
  const resendConfirmationEmail = async () => {
    if (!user?.email) {
      return { error: { message: 'No email address found' } };
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
    });

    return { error };
  };

  // Fetch user profile from profiles table using REST API
  const fetchProfile = async (userId: string, accessToken: string): Promise<Profile | null> => {
    try {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=*`;
      
      const response = await fetch(url, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        return data[0] as Profile;
      }
      return null;
    } catch (err) {
      console.error('AuthContext: Exception fetching profile:', err);
      return null;
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (user && session?.access_token) {
      const profileData = await fetchProfile(user.id, session.access_token);
      setProfile(profileData);
    }
  };

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      setSession(session);
      setUser(session?.user ?? null);

      // Fetch profile and license if user exists
      if (session?.user && session.access_token) {
        const profileData = await fetchProfile(session.user.id, session.access_token);
        setProfile(profileData);
        
        const licenseData = await fetchLicense(session.user.email || '', session.access_token);
        setLicense(licenseData);
        
        const confirmationStatus = calculateEmailConfirmationStatus(session.user, licenseData);
        setEmailConfirmation(confirmationStatus);
      }

      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes - NO AUTO REDIRECT
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user && session.access_token) {
          const profileData = await fetchProfile(session.user.id, session.access_token);
          setProfile(profileData);
          
          const licenseData = await fetchLicense(session.user.email || '', session.access_token);
          setLicense(licenseData);
          
          const confirmationStatus = calculateEmailConfirmationStatus(session.user, licenseData);
          setEmailConfirmation(confirmationStatus);
        } else {
          setProfile(null);
          setLicense(null);
          setEmailConfirmation({
            status: 'confirmed',
            daysRemaining: GRACE_PERIOD_DAYS,
            runsRemaining: FREE_RUNS_LIMIT,
            isConfirmed: true,
          });
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    let firstName = '';
    let lastName = '';
    if (name) {
      const nameParts = name.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (error) {
      return { error };
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: email,
          first_name: firstName || null,
          last_name: lastName || null,
          onboarding_completed: false,
          // Initialize all tour columns as false for new users
          tour_home_completed: false,
          tour_todo_completed: false,
          tour_settings_completed: false,
          tour_linking_strategy_completed: false,
          tour_project_completed: false,
          // Sample data tracking
          sample_task_created: false,
          created_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setLicense(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    refreshProfile,
    emailConfirmation,
    resendConfirmationEmail,
    refreshEmailConfirmationStatus,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}