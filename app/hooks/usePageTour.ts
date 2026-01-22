'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

interface UsePageTourReturn {
  showTour: boolean;
  hasCompletedTour: boolean;
  startTour: () => void;
  closeTour: () => void;
  completeTour: () => void;
  skipTour: () => void;
  resetTour: () => void;
  isLoading: boolean;
}

// Map tour keys to database column names
const tourColumnMap: Record<string, string> = {
  'todo': 'tour_todo_completed',
  'settings': 'tour_settings_completed',
  'linking-strategy': 'tour_linking_strategy_completed',
  'project': 'tour_project_completed',
};

export function usePageTour(tourKey: string, autoShowForNewUsers: boolean = false): UsePageTourReturn {
  const { user, profile, refreshProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [showTour, setShowTour] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(true); // Default true to prevent flash
  const hasTriggeredRef = useRef(false); // Prevent multiple auto-triggers

  const columnName = tourColumnMap[tourKey] || `tour_${tourKey.replace(/-/g, '_')}_completed`;

  useEffect(() => {
    if (!user || !profile) {
      setIsLoading(false);
      return;
    }

    // Check tour status from profile (dynamic column access needs type assertion)
    const completed = (profile as Record<string, any>)?.[columnName] === true;
    setHasCompletedTour(completed);
    setIsLoading(false);

    // Auto-show for new users who haven't completed this specific tour
    // Note: onboarding_completed can be boolean or string "true"/"false"
    const onboardingDone = profile?.onboarding_completed === true || profile?.onboarding_completed === 'true';
    
    if (autoShowForNewUsers && !completed && onboardingDone && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true; // Mark as triggered immediately
      // Small delay to let page render first
      // Don't use cleanup - we want the timer to complete even if effect re-runs
      setTimeout(() => {
        setShowTour(true);
      }, 500);
    }
  }, [user, profile, columnName, autoShowForNewUsers, tourKey]);

  const startTour = useCallback(() => {
    setShowTour(true);
  }, []);

  // Called when user clicks "Skip tour" - shows alert and marks complete
  const skipTour = useCallback(async () => {
    setShowTour(false);
    setHasCompletedTour(true); // Update local state immediately
    
    // Mark as completed in database FIRST
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ [columnName]: true })
          .eq('id', user.id);
        // Wait for profile refresh to complete
        await refreshProfile();
      } catch (err) {
        console.error('Error saving tour completion:', err);
      }
    }
    
    // Show helpful message after DB is updated
    alert("No problem! You can restart the tour any time using the Tour button on the screen.");
  }, [user, columnName, refreshProfile]);

  // Called when user closes tour without completing (e.g., clicking backdrop)
  const closeTour = useCallback(async () => {
    setShowTour(false);
    
    // Mark as completed in database
    if (user && !hasCompletedTour) {
      setHasCompletedTour(true);
      try {
        await supabase
          .from('profiles')
          .update({ [columnName]: true })
          .eq('id', user.id);
        await refreshProfile();
      } catch (err) {
        console.error('Error saving tour completion:', err);
      }
    }
  }, [user, columnName, hasCompletedTour, refreshProfile]);

  // Called when user completes all steps
  const completeTour = useCallback(async () => {
    setShowTour(false);
    
    // Mark as completed in database
    if (user) {
      setHasCompletedTour(true);
      try {
        await supabase
          .from('profiles')
          .update({ [columnName]: true })
          .eq('id', user.id);
        await refreshProfile();
      } catch (err) {
        console.error('Error saving tour completion:', err);
      }
    }
  }, [user, columnName, refreshProfile]);

  // Reset tour so it can be shown again
  const resetTour = useCallback(async () => {
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ [columnName]: false })
          .eq('id', user.id);
        setHasCompletedTour(false);
        hasTriggeredRef.current = false; // Allow re-trigger after reset
        await refreshProfile();
      } catch (err) {
        console.error('Error resetting tour:', err);
      }
    }
  }, [user, columnName, refreshProfile]);

  return {
    showTour: !isLoading && showTour,
    hasCompletedTour,
    startTour,
    closeTour,
    completeTour,
    skipTour,
    resetTour,
    isLoading,
  };
}