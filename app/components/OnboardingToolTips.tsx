'use client';

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

interface TooltipStep {
  id: string;
  target: string; // CSS selector for the target element
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface OnboardingContextType {
  isActive: boolean;
  currentStep: number;
  steps: TooltipStep[];
  startOnboarding: (steps: TooltipStep[]) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingTooltipProvider');
  }
  return context;
}

export function OnboardingTooltipProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<TooltipStep[]>([]);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Update target position when step changes
  useEffect(() => {
    if (isActive && steps[currentStep]) {
      const targetElement = document.querySelector(steps[currentStep].target);
      if (targetElement) {
        setTargetRect(targetElement.getBoundingClientRect());
        
        // Scroll element into view if needed
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [isActive, currentStep, steps]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!isActive) return;

    const updatePosition = () => {
      if (steps[currentStep]) {
        const targetElement = document.querySelector(steps[currentStep].target);
        if (targetElement) {
          setTargetRect(targetElement.getBoundingClientRect());
        }
      }
    };

    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isActive, currentStep, steps]);

  const startOnboarding = (newSteps: TooltipStep[]) => {
    // Check if user has already completed onboarding
    const completed = localStorage.getItem('onboardingCompleted');
    if (completed) return;

    setSteps(newSteps);
    setCurrentStep(0);
    setIsActive(true);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeOnboarding();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipOnboarding = () => {
    setIsActive(false);
    localStorage.setItem('onboardingCompleted', 'true');
  };

  const completeOnboarding = () => {
    setIsActive(false);
    localStorage.setItem('onboardingCompleted', 'true');
  };

  const getTooltipPosition = () => {
    if (!targetRect) return {};

    const position = steps[currentStep]?.position || 'bottom';
    const padding = 12;
    const tooltipWidth = 320;
    const tooltipHeight = 150; // Approximate

    switch (position) {
      case 'top':
        return {
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          top: targetRect.top - tooltipHeight - padding,
        };
      case 'bottom':
        return {
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          top: targetRect.bottom + padding,
        };
      case 'left':
        return {
          left: targetRect.left - tooltipWidth - padding,
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
        };
      case 'right':
        return {
          left: targetRect.right + padding,
          top: targetRect.top + targetRect.height / 2 - tooltipHeight / 2,
        };
      default:
        return {
          left: targetRect.left + targetRect.width / 2 - tooltipWidth / 2,
          top: targetRect.bottom + padding,
        };
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep,
        steps,
        startOnboarding,
        nextStep,
        prevStep,
        skipOnboarding,
        completeOnboarding,
      }}
    >
      {children}

      {/* Overlay and Tooltip */}
      {isActive && steps[currentStep] && targetRect && (
        <>
          {/* Dark overlay with spotlight */}
          <div 
            className="fixed inset-0 z-[100]"
            style={{
              background: `radial-gradient(circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px, transparent ${Math.max(targetRect.width, targetRect.height) / 2 + 20}px, rgba(0, 0, 0, 0.5) ${Math.max(targetRect.width, targetRect.height) / 2 + 40}px)`,
            }}
            onClick={skipOnboarding}
          />

          {/* Highlight ring around target */}
          <div
            className="fixed z-[101] pointer-events-none"
            style={{
              left: targetRect.left - 8,
              top: targetRect.top - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              border: '3px solid #FAA819',
              borderRadius: '12px',
              boxShadow: '0 0 0 4px rgba(250, 168, 25, 0.3)',
              animation: 'pulse-ring 2s infinite',
            }}
          />

          {/* Tooltip */}
          <div
            className="fixed z-[102] w-80 bg-white rounded-xl shadow-2xl p-5"
            style={{
              ...getTooltipPosition(),
              fontFamily: 'Inter',
            }}
          >
            {/* Arrow */}
            <div
              className="absolute w-4 h-4 bg-white transform rotate-45"
              style={{
                [steps[currentStep].position === 'bottom' ? 'top' : 'bottom']: '-8px',
                left: '50%',
                marginLeft: '-8px',
                boxShadow: steps[currentStep].position === 'bottom' ? '-2px -2px 4px rgba(0,0,0,0.1)' : '2px 2px 4px rgba(0,0,0,0.1)',
              }}
            />

            {/* Content */}
            <div className="relative">
              {/* Step indicator */}
              <div className="flex items-center justify-between mb-3">
                <span 
                  className="text-xs text-[#00A99D] font-semibold"
                  style={{ fontFamily: 'Montserrat Alternates' }}
                >
                  Step {currentStep + 1} of {steps.length}
                </span>
                <button
                  onClick={skipOnboarding}
                  className="text-xs text-[#1a1a1a]/50 hover:text-[#1a1a1a] transition"
                >
                  Skip tour
                </button>
              </div>

              {/* Title */}
              <h4 
                className="text-lg text-[#1a1a1a] mb-2"
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}
              >
                {steps[currentStep].title}
              </h4>

              {/* Description */}
              <p 
                className="text-sm text-[#1a1a1a]/70 mb-4"
                style={{ fontFamily: 'Inter', fontWeight: 500 }}
              >
                {steps[currentStep].description}
              </p>

              {/* Navigation */}
              <div className="flex items-center justify-between">
                {/* Dots */}
                <div className="flex gap-1.5">
                  {steps.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentStep 
                          ? 'bg-[#FAA819] w-4' 
                          : index < currentStep 
                            ? 'bg-[#00A99D]' 
                            : 'bg-[#dedede]'
                      }`}
                    />
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={prevStep}
                      className="px-3 py-1.5 text-sm text-[#1a1a1a] hover:bg-[#fffaf3] rounded-lg transition"
                      style={{ fontFamily: 'Montserrat Alternates' }}
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={nextStep}
                    className="px-4 py-1.5 text-sm bg-gradient-to-r from-[#FAA819] to-[#E99502] text-white rounded-lg font-medium hover:shadow-md transition"
                    style={{ fontFamily: 'Montserrat Alternates' }}
                  >
                    {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Pulse animation */}
          <style jsx global>{`
            @keyframes pulse-ring {
              0%, 100% {
                box-shadow: 0 0 0 4px rgba(250, 168, 25, 0.3);
              }
              50% {
                box-shadow: 0 0 0 8px rgba(250, 168, 25, 0.1);
              }
            }
          `}</style>
        </>
      )}
    </OnboardingContext.Provider>
  );
}

// Predefined onboarding tours
export const dashboardTour: TooltipStep[] = [
  {
    id: 'welcome',
    target: '[data-tour="welcome-hero"]',
    title: 'Welcome to Clemelopy! 🍊',
    description: 'This is your dashboard - your home base for managing all your GEO linking strategies.',
    position: 'bottom',
  },
  {
    id: 'create-strategy',
    target: '[data-tour="create-strategy"]',
    title: 'Create Your First Strategy',
    description: 'Click here to generate a strategic linking map for your website pages.',
    position: 'bottom',
  },
  {
    id: 'projects',
    target: '[data-tour="projects"]',
    title: 'Your Projects',
    description: 'All your linking strategies will appear here. You can view, edit, or download them anytime.',
    position: 'right',
  },
  {
    id: 'sidebar',
    target: '[data-tour="sidebar"]',
    title: 'Navigation',
    description: 'Use the sidebar to navigate between different sections. Hover to expand, or pin it open in Settings!',
    position: 'right',
  },
];

export default OnboardingTooltipProvider;