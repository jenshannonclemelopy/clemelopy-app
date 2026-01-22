import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/app/lib/AuthContext';

export interface SubscriptionStatus {
  // Plan info
  plan: 'free' | 'starter' | 'pro' | string;
  status: 'active' | 'inactive' | 'cancelled' | 'trialing' | string;
  
  // Run tracking - null means "not yet loaded"
  runsRemaining: number | null;
  
  // Computed access flags
  hasActiveSubscription: boolean;
  canGenerateStrategies: boolean;
  canUseWorkspaceFeatures: boolean;
  
  // Loading state
  isLoading: boolean;
  error: string | null;
}

interface UseRunResult {
  success: boolean;
  canProceed: boolean;
  runsRemaining: number;
  message: string;
  needsSubscription?: boolean;
}

const DEFAULT_STATUS: SubscriptionStatus = {
  plan: 'free',
  status: 'inactive',
  runsRemaining: null,  // null = not loaded yet, prevents flash
  hasActiveSubscription: false,
  canGenerateStrategies: false,
  canUseWorkspaceFeatures: false,
  isLoading: true,
  error: null,
};

/**
 * Hook to check user's subscription status and manage strategy runs
 * 
 * Features:
 * - Checks subscription status on mount
 * - Provides atomic run consumption via consumeRun()
 * - Handles race conditions through server-side atomic operations
 * 
 * Access rules:
 * - Free users with runs remaining: Can generate strategies
 * - Free users with 0 runs: Can only VIEW existing projects
 * - Paid users: Full access
 */
export function useSubscriptionGate(options?: { 
  gateWorkspace?: boolean;
}): SubscriptionStatus & { 
  refresh: () => Promise<void>;
  consumeRun: () => Promise<UseRunResult>;
} {
  const { session } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>(DEFAULT_STATUS);

  const fetchSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setStatus({
        ...DEFAULT_STATUS,
        runsRemaining: 0,  // Only set to 0 when we KNOW there's no session
        isLoading: false,
        error: 'Not authenticated',
      });
      return;
    }

    // Keep runsRemaining as null during loading to prevent flash
    setStatus(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch('/api/billing/subscription', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No license found - new user gets 3 free runs
          setStatus({
            plan: 'free',
            status: 'active',
            runsRemaining: 3,  // New users start with 3 free runs
            hasActiveSubscription: false,
            canGenerateStrategies: true,  // They CAN generate with free runs
            canUseWorkspaceFeatures: true,
            isLoading: false,
            error: null,
          });
          return;
        }
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();

      // Only consider it an active subscription if they have a paid plan AND stripe subscription
      const paidPlans = ['monthly', 'yearly', 'starter', 'pro', 'unlimited', 'pack'];
      const hasActiveSubscription = 
        paidPlans.includes(data.plan?.toLowerCase()) && 
        ['active', 'trialing'].includes(data.status) &&
        !!data.stripe_subscription_id;
      
      const runsRemaining = data.pack_remaining ?? 0;
      const canGenerateStrategies = hasActiveSubscription || runsRemaining > 0;
      
      const canUseWorkspaceFeatures = options?.gateWorkspace
        ? (hasActiveSubscription || runsRemaining > 0)
        : true;

      setStatus({
        plan: data.plan || 'free',
        status: data.status || 'inactive',
        runsRemaining,
        hasActiveSubscription,
        canGenerateStrategies,
        canUseWorkspaceFeatures,
        isLoading: false,
        error: null,
      });

    } catch (err: any) {
      console.error('Error fetching subscription:', err);
      setStatus({
        ...DEFAULT_STATUS,
        runsRemaining: 0,  // Set to 0 on error
        isLoading: false,
        error: err.message || 'Failed to fetch subscription status',
      });
    }
  }, [session?.access_token, options?.gateWorkspace]);

  /**
   * Consume a run atomically before generating a strategy
   * 
   * IMPORTANT: Call this BEFORE starting generation, not after!
   * This prevents race conditions where users spam the button.
   * 
   * @returns UseRunResult with success status and remaining runs
   */
  const consumeRun = useCallback(async (): Promise<UseRunResult> => {
    if (!session?.access_token) {
      return {
        success: false,
        canProceed: false,
        runsRemaining: 0,
        message: 'Not authenticated',
      };
    }

    try {
      const response = await fetch('/api/billing/use-run', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          canProceed: false,
          runsRemaining: status.runsRemaining ?? 0,
          message: errorData.error || 'Failed to consume run',
        };
      }

      const result = await response.json();

      // Update local state to reflect the consumed run
      if (result.success) {
        setStatus(prev => ({
          ...prev,
          runsRemaining: result.runs_remaining,
          canGenerateStrategies: prev.hasActiveSubscription || result.runs_remaining > 0,
          canUseWorkspaceFeatures: options?.gateWorkspace
            ? (prev.hasActiveSubscription || result.runs_remaining > 0)
            : prev.canUseWorkspaceFeatures,
        }));
      }

      return {
        success: result.success,
        canProceed: result.can_proceed,
        runsRemaining: result.runs_remaining,
        message: result.message,
        needsSubscription: result.needs_subscription,
      };

    } catch (err: any) {
      console.error('Error consuming run:', err);
      return {
        success: false,
        canProceed: false,
        runsRemaining: status.runsRemaining ?? 0,
        message: err.message || 'Failed to consume run',
      };
    }
  }, [session?.access_token, status.runsRemaining, status.hasActiveSubscription, options?.gateWorkspace]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    ...status,
    refresh: fetchSubscription,
    consumeRun,
  };
}

/**
 * Simple hook variant that just returns generation capability
 */
export function useCanGenerate(): { 
  canGenerate: boolean; 
  runsRemaining: number;
  isLoading: boolean;
  isSubscriber: boolean;
} {
  const { canGenerateStrategies, runsRemaining, isLoading, hasActiveSubscription } = useSubscriptionGate();
  return { 
    canGenerate: canGenerateStrategies, 
    runsRemaining: runsRemaining ?? 0,  // Convert null to 0 for consumers
    isLoading: isLoading || runsRemaining === null,  // Still loading if runsRemaining is null
    isSubscriber: hasActiveSubscription,
  };
}

/**
 * Hook for the strategy generation flow
 * Provides a clean interface for checking and consuming runs
 */
export function useStrategyGeneration() {
  const { 
    canGenerateStrategies, 
    runsRemaining, 
    hasActiveSubscription,
    isLoading,
    consumeRun,
    refresh,
  } = useSubscriptionGate();

  const [isConsuming, setIsConsuming] = useState(false);
  const [consumeError, setConsumeError] = useState<string | null>(null);

  /**
   * Call this when user clicks "Generate Strategy"
   * Returns true if they can proceed, false if they need to subscribe
   */
  const requestGeneration = useCallback(async (): Promise<{
    canProceed: boolean;
    runsRemaining: number;
    needsSubscription: boolean;
    error?: string;
  }> => {
    setIsConsuming(true);
    setConsumeError(null);

    try {
      // First check if they can generate at all
      if (!canGenerateStrategies && !hasActiveSubscription) {
        return {
          canProceed: false,
          runsRemaining: 0,
          needsSubscription: true,
        };
      }

      // Consume a run atomically
      const result = await consumeRun();

      if (!result.success) {
        setConsumeError(result.message);
        return {
          canProceed: false,
          runsRemaining: result.runsRemaining,
          needsSubscription: result.needsSubscription || false,
          error: result.message,
        };
      }

      return {
        canProceed: true,
        runsRemaining: result.runsRemaining,
        needsSubscription: false,
      };

    } catch (err: any) {
      const errorMsg = err.message || 'Failed to process request';
      setConsumeError(errorMsg);
      return {
        canProceed: false,
        runsRemaining: runsRemaining ?? 0,
        needsSubscription: false,
        error: errorMsg,
      };
    } finally {
      setIsConsuming(false);
    }
  }, [canGenerateStrategies, hasActiveSubscription, consumeRun, runsRemaining]);

  // Check if still loading BEFORE converting null to 0
  const stillLoading = isLoading || runsRemaining === null;
  
  return {
    // Status - isLoading is true until we have actual data
    canGenerate: canGenerateStrategies,
    runsRemaining: runsRemaining ?? 0,  // Convert null to 0 for display
    isSubscriber: hasActiveSubscription,
    isLoading: stillLoading,  // Keep loading true until data arrives
    
    // Generation flow
    requestGeneration,
    isConsuming,
    consumeError,
    
    // Utilities
    refresh,
  };
}