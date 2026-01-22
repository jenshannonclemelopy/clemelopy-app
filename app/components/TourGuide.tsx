'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TourStep {
  id: string;
  target: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  spotlightPadding?: number;
}

interface TourGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip?: () => void;
}

const tourSteps: TourStep[] = [
  {
    id: 'welcome',
    target: '',
    title: 'Welcome to Clemelopy! 🍊',
    content: 'This is your dashboard - your home base for creating and managing linking strategies. Let\'s take a quick tour of the main features!',
    position: 'bottom',
    spotlightPadding: 16,
  },
  {
    id: 'sidebar',
    target: '[data-tour="sidebar"]',
    title: 'Navigation Sidebar',
    content: 'This is your main navigation. It is set to always expanded by default. Visit the Settings page to set your preference to always expanded, always collapsed, or change on hover.',
    position: 'right',
    spotlightPadding: 0,
  },
  {
    id: 'create-cta',
    target: '[data-tour="create-cta"]',
    title: 'Create Your Linking Strategy',
    content: 'This is where the magic happens! Click here to generate a strategic linking map for any page on your website.',
    position: 'bottom',
    spotlightPadding: 12,
  },
  {
    id: 'projects',
    target: '[data-tour="projects-section"]',
    title: 'Your Projects',
    content: 'Your most recent generated linking maps appear here. You can view, download as PDF, or delete any project.',
    position: 'right',
    spotlightPadding: 12,
  },
  {
    id: 'orchard-framework',
    target: '[data-tour="orchard-framework"]',
    title: 'Orchard Ecosystem Framework™',
    content: 'Learn about the Orchard Ecosystem Framework™, the framework which everything inside Clemelopy is built on. Understanding this will help you get the most out of the platform.',
    position: 'left',
    spotlightPadding: 12,
  },
  {
    id: 'header',
    target: '[data-tour="header"]',
    title: 'Header & Search',
    content: 'See the current date. Use the search bar to quickly find projects and tasks.',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'notifications',
    target: '[data-tour="notifications"]',
    title: 'Notification Center',
    content: 'Keep track of your to-do reminders and important alerts. The bell icon shows your unread notification count.',
    position: 'bottom',
    spotlightPadding: 8,
  },
  {
    id: 'todo-nav',
    target: '[data-tour="todo-nav"]',
    title: 'Task Management',
    content: 'Organize your work with to-do lists and folders. Set due dates and get notified when tasks are coming up.',
    position: 'right',
    spotlightPadding: 4,
  },
  {
    id: 'settings-nav',
    target: '[data-tour="settings-nav"]',
    title: 'Settings & Preferences',
    content: 'Customize your experience! Update your profile, change sidebar behavior, and more.',
    position: 'right',
    spotlightPadding: 4,
  },
];

export default function TourGuide({ isOpen, onClose, onComplete, onSkip }: TourGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [canRender, setCanRender] = useState(false);
  const rafRef = useRef<number | null>(null);

  const step = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  // Wait before allowing render to prevent flash
  useEffect(() => {
    const timer = setTimeout(() => {
      setCanRender(true);
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const updateTargetRect = useCallback(() => {
    if (!isOpen || !step) return;
    
    if (!step.target) {
      setTargetRect(null);
      return;
    }
    
    const targetEl = document.querySelector(step.target);
    if (targetEl) {
      // Scroll element into view first
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      
      // Wait a bit for scroll to complete, then get rect
      setTimeout(() => {
        const rect = targetEl.getBoundingClientRect();
        setTargetRect(rect);
      }, 300);
    } else {
      console.warn(`Tour target not found: ${step.target}`);
      setTargetRect(null);
    }
  }, [isOpen, step]);

  // Update rect when step changes
  useEffect(() => {
    if (!isOpen) return;
    updateTargetRect();
  }, [currentStep, isOpen, updateTargetRect]);

  // Continuously update rect position (for smooth tracking)
  useEffect(() => {
    if (!isOpen || !step?.target) return;

    const updateLoop = () => {
      const targetEl = document.querySelector(step.target);
      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        setTargetRect(rect);
      }
      rafRef.current = requestAnimationFrame(updateLoop);
    };

    // Start loop after initial scroll
    const startTimer = setTimeout(() => {
      rafRef.current = requestAnimationFrame(updateLoop);
    }, 400);

    return () => {
      clearTimeout(startTimer);
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isOpen, step]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsAnimating(true);
      
      // Lock scroll on body and html
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      
      setTimeout(() => setIsAnimating(false), 300);
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isOpen]);

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      onClose();
    } else {
      setIsAnimating(true);
      setCurrentStep(prev => prev + 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handlePrev = () => {
    if (!isFirstStep) {
      setIsAnimating(true);
      setCurrentStep(prev => prev - 1);
      setTimeout(() => setIsAnimating(false), 300);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onClose();
    }
  };

  const getTooltipStyles = (): React.CSSProperties => {
    if (!targetRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = step.spotlightPadding || 8;
    const tooltipWidth = 340;
    const tooltipHeight = 220;
    const offset = 20;

    let top = 0;
    let left = 0;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate position based on preferred direction
    switch (step.position) {
      case 'top':
        top = targetRect.top - padding - tooltipHeight - offset;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + padding + offset;
        left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
        break;
      case 'left':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.left - padding - tooltipWidth - offset;
        break;
      case 'right':
        top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
        left = targetRect.right + padding + offset;
        break;
    }

    // Boundary checks with fallback repositioning
    if (left < 16) left = 16;
    if (left + tooltipWidth > viewportWidth - 16) left = viewportWidth - tooltipWidth - 16;
    if (top < 16) top = 80; // Leave room for header
    if (top + tooltipHeight > viewportHeight - 16) top = viewportHeight - tooltipHeight - 16;

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
    };
  };

  // Don't render until delay has passed AND isOpen is true
  if (!canRender || !isOpen) return null;

  const colors = {
    bg: 'white',
    text: '#1a1a1a',
    textMuted: 'rgba(46, 42, 39, 0.7)',
    textLight: 'rgba(82, 82, 82, 0.6)',
    border: '#dedede',
    buttonBg: 'white',
    progressInactive: '#dedede',
  };

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
      {/* Backdrop - click to skip */}
      <div 
        onClick={handleSkip}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99999,
        }}
      />
      
      {/* Dark overlay when no target */}
      {!targetRect && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 99999,
            pointerEvents: 'none',
          }}
        />
      )}
      
      {/* Spotlight highlight box */}
      {targetRect && (
        <div 
          style={{
            position: 'fixed',
            top: `${targetRect.top - (step.spotlightPadding || 8)}px`,
            left: `${targetRect.left - (step.spotlightPadding || 8)}px`,
            width: `${targetRect.width + (step.spotlightPadding || 8) * 2}px`,
            height: `${targetRect.height + (step.spotlightPadding || 8) * 2}px`,
            borderRadius: '16px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
            border: '3px solid rgba(250, 168, 25, 0.8)',
            pointerEvents: 'none',
            zIndex: 100000,
            transition: 'all 0.3s ease-out',
          }}
        />
      )}

      {/* Tooltip */}
      <div 
        style={{
          ...getTooltipStyles(),
          width: '340px',
          zIndex: 100001,
          background: colors.bg,
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          opacity: isAnimating ? 0 : 1,
          transform: !targetRect 
            ? `translate(-50%, -50%) scale(${isAnimating ? 0.95 : 1})` 
            : `scale(${isAnimating ? 0.95 : 1})`,
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        {/* Gradient top bar */}
        <div 
          style={{
            height: '4px',
            background: 'linear-gradient(to right, #FAA819, #E99502, #00A99D)',
          }}
        />
        
        <div style={{ padding: '24px' }}>
          {/* Progress indicators */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {tourSteps.map((_, idx) => (
                <div 
                  key={idx}
                  style={{
                    height: '6px',
                    borderRadius: '3px',
                    transition: 'width 0.3s ease, background 0.3s ease',
                    width: idx === currentStep ? '24px' : '6px',
                    background: idx === currentStep 
                      ? 'linear-gradient(to right, #FAA819, #00A99D)' 
                      : idx < currentStep 
                        ? '#00A99D' 
                        : colors.progressInactive,
                  }}
                />
              ))}
            </div>
            <span 
              style={{ 
                fontSize: '12px', 
                color: colors.textLight,
                fontFamily: 'Inter',
                fontWeight: 500,
              }}
            >
              {currentStep + 1} of {tourSteps.length}
            </span>
          </div>

          {/* Title */}
          <h3 
            style={{ 
              fontSize: '18px', 
              color: colors.text, 
              marginBottom: '8px',
              fontFamily: 'Montserrat Alternates',
              fontWeight: 700,
            }}
          >
            {step.title}
          </h3>
          
          {/* Content */}
          <p 
            style={{ 
              fontSize: '14px', 
              color: colors.textMuted, 
              marginBottom: '24px',
              lineHeight: '1.6',
              fontFamily: 'Inter',
              fontWeight: 500,
            }}
          >
            {step.content}
          </p>

          {/* Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={handleSkip}
              style={{ 
                fontSize: '14px', 
                color: colors.textLight,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontWeight: 500,
                padding: '8px 0',
              }}
            >
              Skip tour
            </button>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              {!isFirstStep && (
                <button
                  onClick={handlePrev}
                  style={{ 
                    padding: '10px 16px',
                    borderRadius: '10px',
                    border: `1px solid ${colors.border}`,
                    background: colors.buttonBg,
                    color: colors.text,
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'Montserrat Alternates',
                    fontWeight: 600,
                  }}
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                style={{ 
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'Montserrat Alternates',
                  fontWeight: 600,
                }}
              >
                {isLastStep ? 'Get Started!' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}