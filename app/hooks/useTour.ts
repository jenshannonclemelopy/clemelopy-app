'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

interface UseTourReturn {
  showTour: boolean;
  hasCompletedTour: boolean;
  hasDismissedTour: boolean;
  startTour: () => void;
  closeTour: () => void;
  completeTour: () => void;
  skipTour: () => void;
  resetTour: () => void;
  showTourPrompt: boolean;
  dismissPrompt: () => void;
  isLoading: boolean;
}

export function useTour(): UseTourReturn {
  const { user, profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(true); // Default true to prevent flash
  const [hasDismissedTour, setHasDismissedTour] = useState(false);
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  const hasTriggeredRef = useRef(false); // Prevent multiple auto-triggers

  useEffect(() => {
    if (!user || !profile) {
      setIsLoading(false);
      return;
    }

    // Check tour status from profile
    const completed = profile?.tour_home_completed === true;
    setHasCompletedTour(completed);
    setIsLoading(false);

    // Auto-start tour for new users who haven't completed it
    // Note: onboarding_completed can be boolean or string "true"/"false"
    const onboardingDone = profile?.onboarding_completed === true || profile?.onboarding_completed === 'true';
    
    // Only auto-start if:
    // 1. Tour not completed (from DB)
    // 2. Onboarding is done
    // 3. We haven't already triggered this session
    if (!completed && onboardingDone && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true; // Mark as triggered immediately
      // Small delay to let page render
      setTimeout(() => {
        setShowTour(true);
        document.body.classList.add('tour-active');
      }, 500);
    }
  }, [user, profile]);

  const startTour = useCallback(() => {
    setShowTourPrompt(false);
    setShowTour(true);
    document.body.classList.add('tour-active');
  }, []);

  // Called when user clicks "Skip tour" - shows alert and marks complete
  const skipTour = useCallback(async () => {
    console.log('🔍 skipTour called, user:', user?.id);
    setShowTour(false);
    setShowTourPrompt(false);
    document.body.classList.remove('tour-active');
    setHasCompletedTour(true); // Update local state immediately
    
    // Mark as completed in database FIRST
    if (user) {
      try {
        console.log('🔍 Updating DB for user:', user.id);
        const { data, error } = await supabase
          .from('profiles')
          .update({ tour_home_completed: true })
          .eq('id', user.id)
          .select();
        
        console.log('🔍 DB update result:', { data, error });
        
        if (error) {
          console.error('DB update error:', error);
        }
        
        // Wait for profile refresh to complete
        await refreshProfile();
        console.log('🔍 Profile refreshed');
      } catch (err) {
        console.error('Error saving tour completion:', err);
      }
    } else {
      console.log('🔍 No user found!');
    }
    
    // Show helpful message after DB is updated
    alert("No problem! You can restart the tour any time using the Tour button on the screen.");
  }, [user, refreshProfile]);

  const closeTour = useCallback(async () => {
    setShowTour(false);
    setShowTourPrompt(false);
    document.body.classList.remove('tour-active');
    
    // Mark as completed in database and refresh profile
    if (user && !hasCompletedTour) {
      setHasCompletedTour(true);
      await supabase
        .from('profiles')
        .update({ tour_home_completed: true })
        .eq('id', user.id);
      await refreshProfile();
    }
  }, [user, hasCompletedTour, refreshProfile]);

  const completeTour = useCallback(async () => {
    setShowTour(false);
    setShowTourPrompt(false);
    document.body.classList.remove('tour-active');
    
    // Mark as completed in database and refresh profile
    if (user) {
      setHasCompletedTour(true);
      await supabase
        .from('profiles')
        .update({ tour_home_completed: true })
        .eq('id', user.id);
      await refreshProfile();
    }
  }, [user, refreshProfile]);

  const resetTour = useCallback(async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ tour_home_completed: false })
        .eq('id', user.id);
      setHasCompletedTour(false);
      setShowTourPrompt(true);
      hasTriggeredRef.current = false; // Allow re-trigger after reset
      await refreshProfile();
    }
  }, [user, refreshProfile]);

  const dismissPrompt = useCallback(async () => {
    setShowTourPrompt(false);
    setHasDismissedTour(true);
    // Mark as completed when dismissed
    if (user) {
      setHasCompletedTour(true);
      await supabase
        .from('profiles')
        .update({ tour_home_completed: true })
        .eq('id', user.id);
      await refreshProfile();
    }
  }, [user, refreshProfile]);

  return {
    showTour: !isLoading && showTour,
    hasCompletedTour,
    hasDismissedTour,
    startTour,
    closeTour,
    completeTour,
    skipTour,
    resetTour,
    showTourPrompt: !isLoading && showTourPrompt,
    dismissPrompt,
    isLoading,
  };
}