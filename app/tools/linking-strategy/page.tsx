'use client';

import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import PageTour from '../../components/PageTour';
import TourHelpButton from '../../components/TourHelpButton';
import { usePageTour } from '../../hooks/usePageTour';
import { linkingStrategyTourSteps } from '../../components/linkingStrategyTourSteps';
import { useStrategyGeneration } from '../../hooks/useSubscriptionGate';
import SubscribePrompt, { RunsWarningBanner } from '../../components/SubscribePrompt';

const WORKER_URL = 'https://linking-strategy-map.jen-86f.workers.dev';
const APP_SLUG = 'geo-linking-strategy-map';

export default function LinkingStrategy() {
  const { user, session } = useAuth();
  
  // Subscription & run management
  const { 
    canGenerate, 
    runsRemaining, 
    isSubscriber,
    isLoading: isLoadingSubscription,
    requestGeneration,
    isConsuming,
  } = useStrategyGeneration();

  
  // DEBUG - remove after testing
  console.log('SUBSCRIPTION STATE:', { runsRemaining, isLoadingSubscription, canGenerate });

  // Linking Strategy page tour
  const { showTour, closeTour, completeTour, skipTour, startTour, hasCompletedTour } = usePageTour('linking-strategy', true);
  
  const [pageUrl, setPageUrl] = useState('');
  const [pageContent, setPageContent] = useState('');
  const [projectName, setProjectName] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showSubscribePrompt, setShowSubscribePrompt] = useState(false);
  
  // Result state
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);
  const [generatedProjectId, setGeneratedProjectId] = useState<string | null>(null);

  useEffect(() => {
    setCharCount(pageContent.length);
  }, [pageContent]);

  // Load confetti script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
    document.body.appendChild(script);

    script.onload = () => {
      (window as any).clemelopyCornerConfetti = function () {
        console.log("🎉 Clemelopy plume confetti firing!");

        const clemelopyColors = [
          '#FAA819','#E99502','#FFB547',
          '#00A99D','#009788','#84DCC6',
          '#FDE5C5','#FFE8A3'
        ];

        let colorIndex = 0;
        function nextColor() {
          colorIndex = (colorIndex + 1) % clemelopyColors.length;
          return clemelopyColors[colorIndex];
        }

        function rand(min: number, max: number) { 
          return Math.random() * (max - min) + min; 
        }

        const duration = 2400;
        const end = Date.now() + duration;
        const confetti = (window as any).confetti;

        (function frame(){
          confetti({
            particleCount: 2,
            angle: 90 + rand(-6,6),
            spread: 28,
            startVelocity: 95,
            gravity: 0.78,
            ticks: 420,
            origin: { x: rand(0.00,0.03), y: 1 },
            scalar: 1.05,
            shapes: ['square'],
            colors: [nextColor()],
            drift: rand(-0.4, 0.4)
          });

          confetti({
            particleCount: 2,
            angle: 90 + rand(-6,6),
            spread: 28,
            startVelocity: 95,
            gravity: 0.78,
            ticks: 420,
            origin: { x: rand(0.97,1.00), y: 1 },
            scalar: 1.05,
            shapes: ['square'],
            colors: [nextColor()],
            drift: rand(-0.4, 0.4)
          });

          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      };
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleGenerate = () => {
    if (!user) {
      setError('Please sign in to generate a linking strategy.');
      return;
    }
    
    if (charCount < 300) {
      setError('Please enter at least 300 characters to generate your linking strategy.');
      return;
    }
    
    // Check if user can generate (has runs or subscription)
    if (!canGenerate && !isLoadingSubscription) {
      setShowSubscribePrompt(true);
      return;
    }
    
    setError(null);
    setShowModal(true);
  };

  const handleSaveAndGenerate = async () => {
    if (!projectName.trim()) {
      setError('Please enter a project name.');
      return;
    }

    if (!user || !session) {
      setError('Please sign in to generate a linking strategy.');
      return;
    }

    setShowModal(false);
    setIsGenerating(true);
    setError(null);

    try {
      // ========================================
      // STEP 0: Consume a run atomically FIRST
      // This prevents button spam and race conditions
      // ========================================
      const runResult = await requestGeneration();
      
      if (!runResult.canProceed) {
        if (runResult.needsSubscription) {
          setShowSubscribePrompt(true);
          setIsGenerating(false);
          return;
        }
        throw new Error(runResult.error || 'Unable to process request. Please try again.');
      }
      
      // Run has been consumed - safe to proceed
      console.log(`✓ Run consumed. ${runResult.runsRemaining} runs remaining.`);

      // Step 1: Create a project row in Supabase first to get the projectId
      const { data: newProject, error: insertError } = await supabase
        .from('geo_linking_projects_real')
        .insert({
          user_id: user.id,
          email: user.email,
          app_slug: APP_SLUG,
          title: projectName.trim(),
          project_title: projectName.trim(),
        })
        .select('id')
        .single();

      if (insertError || !newProject) {
        throw new Error(insertError?.message || 'Failed to create project');
      }

      const projectId = newProject.id;
      setGeneratedProjectId(projectId);

      // Step 2: Call the Cloudflare worker to generate the PDF
      const response = await fetch(`${WORKER_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          content: pageContent,
          projectId: projectId,
          projectName: projectName.trim(),
          pageUrl: pageUrl || undefined,
          appSource: APP_SLUG,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.ok) {
        if (result.code === 'PAYWALL') {
          setShowSubscribePrompt(true);
          throw new Error(result.error || 'You\'ve reached your usage limit. Please upgrade to continue.');
        }
        if (result.code === 'BLOCKED') {
          throw new Error(result.error || 'Content could not be processed.');
        }
        throw new Error(result.error || 'Failed to generate linking strategy');
      }

      // Success!
      setGeneratedPdfUrl(result.pdf_url);
      setIsGenerating(false);
      setIsComplete(true);
      
      // Fire confetti!
      if ((window as any).clemelopyCornerConfetti) {
        (window as any).clemelopyCornerConfetti();
      }

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'An error occurred while generating your strategy.');
      setIsGenerating(false);
      
      // Clean up the project if generation failed
      if (generatedProjectId) {
        await supabase
          .from('geo_linking_projects_real')
          .delete()
          .eq('id', generatedProjectId);
      }
    }
  };

  const handleDownload = () => {
    if (generatedPdfUrl) {
      window.open(generatedPdfUrl, '_blank');
    }
  };

  const handleViewProjects = () => {
    if (generatedProjectId) {
      window.location.href = `/project/${generatedProjectId}`;
    } else {
      window.location.href = '/my-projects';
    }
  };

  const resetGenerator = () => {
    setIsComplete(false);
    setPageUrl('');
    setPageContent('');
    setProjectName('');
    setGeneratedPdfUrl(null);
    setGeneratedProjectId(null);
    setError(null);
  };

  // Note: Animation styles for .dot-1, .dot-2, .dot-3 are in globals.css

  // Show subscribe prompt if user has no runs
  if (showSubscribePrompt) {
    return (
      <Layout activeNav="linking-strategy">
        <main className="py-8 px-4">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={() => setShowSubscribePrompt(false)}
              className="mb-6 flex items-center gap-2 text-sm"
              style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
            >
              <span>←</span> Back to generator
            </button>
            <SubscribePrompt 
              runsRemaining={runsRemaining}
              variant="full-page"
            />
          </div>
        </main>
      </Layout>
    );
  }

  return (
    <Layout 
      activeNav="linking-strategy"
    >

      {/* Skip to main content link */}
      <a 
        href="#linking-strategy-main" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-[#005a54] focus:rounded-lg focus:font-semibold"
        style={{ fontFamily: 'Montserrat Alternates' }}
      >
        Skip to main content
      </a>

      <main id="linking-strategy-main" role="main">
        {/* Header - Frosted Glass Container */}
        <header 
          className="rounded-2xl p-8 mb-8 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          }}
        >
          {/* Tour button - top right */}
          <div className="absolute top-4 right-4">
            <TourHelpButton onClick={startTour} hasCompleted={hasCompletedTour} />
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <h1 
                className="text-3xl lg:text-4xl mb-2" 
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
              >
                <span style={{ color: '#1a1a1a' }}>Linking Strategy </span>
                <span 
                  style={{ 
                    background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Map
                </span>
              </h1>
              <p 
                className="text-base max-w-2xl"
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 500,
                  color: '#4a4642',
                }}
              >
                Create a strategic linking map to optimize your site's internal structure and improve visibility in generative search.
              </p>
            </div>
            
            {/* Usage Indicator - Bottom Left */}
            {!isLoadingSubscription && (
              <div className="flex items-center gap-3">
                <div 
                  className="flex items-center gap-3 px-4 py-2 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.65)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                  }}
                >
                  {/* Orange number badge */}
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #FAA819, #E99502)',
                      boxShadow: '0 2px 6px rgba(250, 168, 25, 0.3)',
                    }}
                  >
                    {isSubscriber ? (
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-white text-sm font-bold" style={{ fontFamily: 'Montserrat Alternates' }}>
                        {runsRemaining}
                      </span>
                    )}
                  </div>
                  {/* Text - teal colored */}
                  <div className="flex flex-col">
                    <span 
                      className="text-xs font-semibold"
                      style={{ 
                        fontFamily: 'Montserrat Alternates',
                        color: '#0D7871',
                      }}
                    >
                      {isSubscriber ? 'Subscriber' : `${runsRemaining} ${runsRemaining === 1 ? 'run' : 'runs'} left`}
                    </span>
                    <span 
                      className="text-xs"
                      style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
                    >
                      {isSubscriber ? 'Unlimited generations' : runsRemaining === 0 ? 'Upgrade to continue' : 'this period'}
                    </span>
                  </div>
                </div>

                {/* Upgrade button - only show for non-subscribers */}
                {!isSubscriber && (
                  <a
                    href="/pricing"
                    className="px-5 py-2 rounded-xl text-white text-sm font-semibold transition-all hover:scale-105 flex items-center justify-center"
                    style={{
                      fontFamily: 'Montserrat Alternates',
                      background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                      boxShadow: '0 2px 8px rgba(0, 169, 157, 0.3)',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = '2px solid #005a54';
                      e.currentTarget.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.outline = 'none';
                      e.currentTarget.style.outlineOffset = '0';
                    }}
                  >
                    Upgrade
                  </a>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div 
            className="mb-6 flex items-start gap-3"
            role="alert"
            aria-live="assertive"
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '16px',
              padding: '16px 20px',
            }}
          >
            <svg className="w-6 h-6 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-red-800 font-medium" style={{ fontFamily: 'Montserrat Alternates' }}>{error}</p>
            </div>
            <button 
              onClick={() => setError(null)} 
              className="text-red-600 hover:text-red-800"
              aria-label="Dismiss error"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Runs Warning Banner - shows when running low */}
        {!isSubscriber && !isLoadingSubscription && (
          <RunsWarningBanner runsRemaining={runsRemaining} isLoading={isLoadingSubscription} />
        )}

        {/* Main Frosted Glass Container */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            borderRadius: '32px',
            padding: '32px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          }}
        >
          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left - Input */}
            <div className="space-y-6">
              {/* Input Card */}
              <div 
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.03) 100%)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.7)',
                  borderRadius: '24px',
                  padding: '28px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                }}
              >
            {/* Page URL Input */}
            <div className="mb-6" data-tour="linking-url-input">
              <label htmlFor="page-url" className="block text-sm mb-3" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>
                Page URL <span style={{ color: '#6b6560', fontWeight: 400 }}>(optional - this is for your own reference)</span>
              </label>
              <input
                id="page-url"
                type="url"
                value={pageUrl}
                onChange={(e) => setPageUrl(e.target.value)}
                placeholder="https://yoursite.com/page"
                disabled={isGenerating || isComplete}
                className="w-full px-4 py-3 rounded-xl text-[#1a1a1a] placeholder-[#6b6560] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 500,
                  background: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #005a54';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.outlineOffset = '0';
                }}
              />
            </div>

            {/* Page Content Textarea */}
            <div className="mb-2" data-tour="linking-content-input">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                  <label htmlFor="page-content" className="text-sm" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>
                    Page Content <span className="text-[#b91c1c]">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span 
                      className="text-sm"
                      style={{ 
                        fontFamily: 'Inter', 
                        fontWeight: 500,
                        color: charCount >= 300 ? '#006b63' : '#6b6560'
                      }}
                    >
                      {charCount.toLocaleString()} characters
                    </span>
                    {charCount < 300 ? (
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ 
                          fontFamily: 'Inter', 
                          fontWeight: 600,
                          background: 'rgba(185, 28, 28, 0.1)',
                          color: '#b91c1c'
                        }}
                      >
                        min 300 required
                      </span>
                    ) : (
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 whitespace-nowrap"
                        style={{ 
                          fontFamily: 'Inter', 
                          fontWeight: 600,
                          background: 'rgba(0, 169, 157, 0.1)',
                          color: '#006b63'
                        }}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        ready
                      </span>
                    )}
                  </div>
                </div>
              
              
              <textarea
                id="page-content"
                value={pageContent}
                onChange={(e) => setPageContent(e.target.value)}
                placeholder="Paste your entire page content here..."
                disabled={isGenerating || isComplete}
                className="w-full h-96 px-4 py-3 rounded-xl text-[#1a1a1a] placeholder-[#6b6560] focus:outline-none resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 500,
                  background: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid rgba(255, 255, 255, 0.6)',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #005a54';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.outlineOffset = '0';
                }}
                aria-describedby="char-count-info"
              />
              <span id="char-count-info" className="sr-only">
                {charCount >= 300 ? 'Character requirement met' : `${300 - charCount} more characters needed`}
              </span>
            </div>

            {/* Generate Button */}
            <div data-tour="linking-generate-button">
            {!isGenerating && !isComplete && (
              <button
                onClick={handleGenerate}
                disabled={charCount < 300 || isLoadingSubscription || isConsuming}
                className="w-full py-4 rounded-xl text-lg"
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  fontWeight: 600,
                  background: charCount >= 300 && canGenerate
                    ? 'linear-gradient(135deg, #FAA819, #E99502)' 
                    : 'rgba(255, 255, 255, 0.5)',
                  color: charCount >= 300 && canGenerate ? '#ffffff' : '#6b6560',
                  boxShadow: charCount >= 300 && canGenerate ? '0 4px 15px rgba(250, 168, 25, 0.3)' : 'none',
                  cursor: charCount >= 300 && !isLoadingSubscription && !isConsuming ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid #005a54';
                  e.currentTarget.style.outlineOffset = '2px';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none';
                  e.currentTarget.style.outlineOffset = '0';
                }}
                aria-disabled={charCount < 300 || isLoadingSubscription || isConsuming}
              >
                {isLoadingSubscription ? (
                  'Loading...'
                ) : isConsuming ? (
                  'Processing...'
                ) : !canGenerate ? (
                  'No Runs Remaining - Upgrade'
                ) : (
                  <>
                    Generate My Linking Strategy <span aria-hidden="true">✨</span>
                    {!isSubscriber && runsRemaining > 0 && (
                      <span className="ml-2 text-sm opacity-80">
                        ({runsRemaining} {runsRemaining === 1 ? 'run' : 'runs'} left)
                      </span>
                    )}
                  </>
                )}
              </button>
            )}
            </div>

            {/* Generating State */}
            {isGenerating && (
              <div 
                className="py-8 rounded-xl text-center"
                role="status"
                aria-live="polite"
                style={{
                  background: 'linear-gradient(135deg, #FAA819, #E99502)',
                  boxShadow: '0 4px 15px rgba(250, 168, 25, 0.3)',
                }}
              >
                <p className="text-xl mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#ffffff' }}>
                  Generating Your Strategy<span className="dot-1" aria-hidden="true">.</span><span className="dot-2" aria-hidden="true">.</span><span className="dot-3" aria-hidden="true">.</span>
                </p>
                <p className="text-sm" style={{ fontFamily: 'Inter', fontWeight: 500, color: 'rgba(255, 255, 255, 0.9)' }}>
                  This usually takes 30-60 seconds
                </p>
              </div>
            )}

            {/* Complete State */}
            {isComplete && (
              <div 
                className="text-center space-y-4"
                role="status"
                aria-live="polite"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 100%)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: '2px solid #FAA819',
                  borderRadius: '20px',
                  padding: '32px',
                }}
              >
                <div className="text-6xl mb-4" aria-hidden="true">🎉</div>
                <h2 className="text-2xl mb-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>
                  Hooray! Your Linking Strategy PDF is ready!
                </h2>
                <p className="mb-6" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>
                  Your linking strategy map has been generated and saved to your projects.
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleDownload}
                    className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      fontWeight: 500,
                      background: 'linear-gradient(135deg, #FAA819, #E99502)',
                      color: '#ffffff',
                      transition: 'all 0.3s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = '2px solid #005a54';
                      e.currentTarget.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.outline = 'none';
                      e.currentTarget.style.outlineOffset = '0';
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </button>
                  <button
                    onClick={handleViewProjects}
                    className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2"
                    style={{ 
                      fontFamily: 'Montserrat Alternates',
                      fontWeight: 500,
                      background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                      color: 'white',
                      transition: 'all 0.3s ease',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.outline = '2px solid #005a54';
                      e.currentTarget.style.outlineOffset = '2px';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.outline = 'none';
                      e.currentTarget.style.outlineOffset = '0';
                    }}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Project
                  </button>
                </div>
                <button
                  onClick={resetGenerator}
                  className="text-sm mt-4"
                  style={{ fontFamily: 'Montserrat Alternates', fontWeight: 500, color: '#4a4642' }}
                  onFocus={(e) => {
                    e.currentTarget.style.outline = '2px solid #005a54';
                    e.currentTarget.style.outlineOffset = '2px';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.outline = 'none';
                    e.currentTarget.style.outlineOffset = '0';
                  }}
                >
                  Create Another Strategy <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right - Instructions */}
        <div className="space-y-6">
          {/* How It Works */}
          <section 
            data-tour="linking-how-it-works"
            aria-labelledby="how-it-works-heading"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.03) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              borderRadius: '24px',
              padding: '28px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h2 id="how-it-works-heading" className="text-2xl mb-6" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>
              How It Works
            </h2>
            <ol className="space-y-6">
              {[
                { num: 1, title: 'Copy Your Page Content', desc: 'Navigate to the page you want to optimize and copy all the text content. Include headings, paragraphs, and any relevant text.' },
                { num: 2, title: 'Paste & Generate', desc: 'Paste the content into the text area (minimum 300 characters). Optionally add the page URL for better context.' },
                { num: 3, title: 'Get Your Strategy', desc: 'Our AI analyzes your content and generates a comprehensive linking strategy with both internal and external link recommendations.' },
                { num: 4, title: 'Download & Implement', desc: 'Download your PDF or view it in My Projects. Use the recommendations to optimize your page\'s linking structure.' }
              ].map((step) => (
                <li key={step.num} className="flex gap-4">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ 
                      background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                      fontFamily: 'Montserrat Alternates',
                      fontWeight: 700,
                      color: 'white',
                    }}
                    aria-hidden="true"
                  >
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-lg mb-1" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>
                      {step.title}
                    </h3>
                    <p className="text-sm" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>
                      {step.desc}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Pro Tips */}
          <section 
            data-tour="linking-pro-tips"
            aria-labelledby="pro-tips-heading"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.03) 100%)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.7)',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            <h2 id="pro-tips-heading" className="text-lg mb-4 flex items-center gap-2" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}>
              <span aria-hidden="true">💡</span> Pro Tips
            </h2>
            <ul className="space-y-3 text-sm" style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>
              {[
                'Include all visible text content for best results',
                'The more content you provide, the more accurate the recommendations',
                'Adding the page URL helps contextualize the analysis',
                'Review and customize recommendations based on your site structure'
              ].map((tip, i) => (
                <li key={i} className="flex gap-3">
                  <span className="text-[#006b63] text-lg" aria-hidden="true">✓</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
        </div>
      </main>

      {/* Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div 
            className="max-w-md w-full"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: '24px',
              padding: '32px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            }}
          >
            <div className="text-5xl text-center mb-4" aria-hidden="true">🎯</div>
            <h2 
              id="modal-title"
              className="text-2xl text-center mb-4" 
              style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600, color: '#1a1a1a' }}
            >
              Name Your Project
            </h2>
            <p 
              className="text-center mb-6" 
              style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}
            >
              Give your linking strategy a memorable name so you can find it easily later.
            </p>
            <label htmlFor="project-name" className="sr-only">Project name</label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Homepage Linking Strategy"
              className="w-full px-4 py-3 rounded-xl mb-6 focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2"
              style={{ 
                fontFamily: 'Inter', 
                fontWeight: 500,
                background: 'rgba(255, 255, 255, 0.8)',
                border: '1px solid #d1d5db',
                color: '#1a1a1a',
              }}
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleSaveAndGenerate()}
            />
            <div className="flex gap-4">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2 transition-all"
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  fontWeight: 500,
                  background: 'rgba(255, 255, 255, 0.7)',
                  border: '1px solid #d1d5db',
                  color: '#1a1a1a',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAndGenerate}
                disabled={!projectName.trim() || isConsuming}
                className="flex-1 px-6 py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#00A99D] focus:ring-offset-2 transition-all"
                style={{ 
                  fontFamily: 'Montserrat Alternates',
                  fontWeight: 500,
                  background: 'linear-gradient(135deg, #00A99D, #0D7871)',
                  color: 'white',
                  boxShadow: '0 4px 15px rgba(0, 169, 157, 0.3)',
                }}
              >
                {isConsuming ? 'Processing...' : 'Save & Generate'} <span aria-hidden="true">✨</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Linking Strategy Page Tour */}
      <PageTour
  isOpen={showTour}
  onClose={closeTour}
  onComplete={completeTour}
  onSkip={skipTour}
  steps={linkingStrategyTourSteps}
  tourName="Linking Strategy Tour"
/>
      
    </Layout>
  );
}