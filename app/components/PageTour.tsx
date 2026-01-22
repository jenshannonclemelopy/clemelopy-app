'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export interface TourStep {
  id: string;
  target: string | null;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  spotlightPadding?: number;
  action?: string;
}

interface PageTourProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onSkip?: () => void;  // Called when user clicks "Skip tour"
  steps: TourStep[];
  tourName: string;
  onAction?: (action: string) => void;
}

export default function PageTour({ isOpen, onClose, onComplete, onSkip, steps, tourName, onAction }: PageTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [canRender, setCanRender] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const hasSpotlight = step?.target !== null;

  // Ensure we're mounted (for createPortal)
  useEffect(() => {
    setIsMounted(true);
  }, []);

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
      const rect = targetEl.getBoundingClientRect();
      setTargetRect(rect);
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      console.warn(`Tour target not found: ${step.target}`);
      setTargetRect(null);
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) return;
    
    const timer = setTimeout(updateTargetRect, 100);
    
    window.addEventListener('scroll', updateTargetRect, true);
    window.addEventListener('resize', updateTargetRect);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', updateTargetRect, true);
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [updateTargetRect, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setIsAnimating(true);
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
    };
  }, [isOpen]);

  const handleNext = () => {
    if (step?.action && onAction) {
      onAction(step.action);
    }
    
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
    if (onAction) {
      onAction('closeTaskModal');
    }
    // Use onSkip if provided (shows alert), otherwise fall back to onClose
    if (onSkip) {
      onSkip();
    } else {
      onClose();
    }
  };

  const getTooltipStyles = (): React.CSSProperties => {
    if (!targetRect || step?.position === 'center') {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const padding = step?.spotlightPadding || 8;
    const tooltipWidth = 340;
    const tooltipHeight = 280;
    const offset = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 24;

    let top = 0;
    let left = 0;
    let preferredPosition = step?.position || 'bottom';

    if (preferredPosition === 'bottom' && targetRect.bottom + padding + offset + tooltipHeight > viewportHeight - margin) {
      preferredPosition = 'top';
    } else if (preferredPosition === 'top' && targetRect.top - padding - offset - tooltipHeight < margin) {
      preferredPosition = 'bottom';
    } else if (preferredPosition === 'right' && targetRect.right + padding + offset + tooltipWidth > viewportWidth - margin) {
      preferredPosition = 'left';
    } else if (preferredPosition === 'left' && targetRect.left - padding - offset - tooltipWidth < margin) {
      preferredPosition = 'right';
    }

    switch (preferredPosition) {
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

    if (left < margin) left = margin;
    if (left + tooltipWidth > viewportWidth - margin) left = viewportWidth - tooltipWidth - margin;
    if (top < margin) top = margin;
    if (top + tooltipHeight > viewportHeight - margin) top = viewportHeight - tooltipHeight - margin;

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
    };
  };

  // Don't render until mounted, delay has passed, AND isOpen is true
  if (!isMounted || !canRender || !isOpen || !step) return null;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
      {!hasSpotlight && (
        <div 
          onClick={handleSkip}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 99999,
          }}
        />
      )}
      
      {hasSpotlight && (
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
      )}
      
      {hasSpotlight && targetRect && (
        <div 
          style={{
            position: 'fixed',
            top: `${targetRect.top - (step.spotlightPadding || 8)}px`,
            left: `${targetRect.left - (step.spotlightPadding || 8)}px`,
            width: `${targetRect.width + (step.spotlightPadding || 8) * 2}px`,
            height: `${targetRect.height + (step.spotlightPadding || 8) * 2}px`,
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6)',
            border: '3px solid rgba(250, 168, 25, 0.8)',
            pointerEvents: 'none',
            zIndex: 100000,
            transition: 'top 0.3s ease-out, left 0.3s ease-out, width 0.3s ease-out, height 0.3s ease-out',
          }}
        />
      )}

      <div 
        style={{
          ...getTooltipStyles(),
          width: (!targetRect || step?.position === 'center') ? '420px' : '340px',
          maxWidth: '90%',
          zIndex: 100001,
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: '24px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          opacity: isAnimating ? 0 : 1,
          transform: isAnimating 
            ? `${getTooltipStyles().transform || ''} scale(0.95)`.trim()
            : `${getTooltipStyles().transform || ''} scale(1)`.trim(),
          transition: 'opacity 0.3s ease, transform 0.3s ease',
        }}
      >
        <div 
          style={{
            height: '4px',
            background: 'linear-gradient(to right, #FAA819, #E99502, #00A99D)',
          }}
        />
        
        <div style={{ padding: (!targetRect || step?.position === 'center') ? '32px' : '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              {steps.map((_, idx) => (
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
                        : 'rgba(46, 42, 39, 0.15)',
                  }}
                />
              ))}
            </div>
            <span style={{ fontSize: '13px', color: 'rgba(46, 42, 39, 0.5)', fontFamily: 'Inter' }}>
              {currentStep + 1} of {steps.length}
            </span>
          </div>

          <h3 style={{ 
            fontSize: '20px', 
            fontWeight: 700, 
            color: '#2e2a27', 
            marginBottom: '12px',
            fontFamily: 'Montserrat Alternates',
          }}>
            {step.title}
          </h3>
          <p style={{ 
            fontSize: '15px', 
            color: 'rgba(46, 42, 39, 0.7)', 
            lineHeight: 1.6, 
            marginBottom: '24px',
            fontFamily: 'Inter',
            fontWeight: 500,
          }}>
            {step.content}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button 
              onClick={handleSkip}
              className="tour-skip-button"
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(46, 42, 39, 0.5)',
                fontSize: '14px',
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontWeight: 500,
              }}
            >
              Skip tour
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              {!isFirstStep && (
                <button 
                  onClick={handlePrev}
                  className="tour-back-button"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid rgba(46, 42, 39, 0.2)',
                    background: 'rgba(255, 255, 255, 0.8)',
                    color: '#2e2a27',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontFamily: 'Inter',
                    fontWeight: 600,
                  }}
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="tour-next-button"
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
                {isLastStep ? 'Got it!' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}