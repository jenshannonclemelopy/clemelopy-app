'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import SchemaBuilder from '../../components/SchemaBuilder';
import PageTour from '../../components/PageTour';
import TourHelpButton from '../../components/TourHelpButton';
import { schemaStudioTourSteps } from '../../components/schemaStudioTourSteps';

export default function SchemaStudioPage() {
  // Tour state
  const [showTour, setShowTour] = useState(false);
  const [tourCompleted, setTourCompleted] = useState(false);
  
  // State to control SchemaBuilder's active tab from the tour
  const [externalActiveTab, setExternalActiveTab] = useState<string | undefined>(undefined);

  // Check localStorage on mount
  useEffect(() => {
    const completed = localStorage.getItem('clemelopy_schema_studio_tour_completed') === 'true';
    setTourCompleted(completed);
  }, []);

  // Handler for tour actions - switches tabs during the tour
  // This handles BOTH beforeAction and action callbacks
  const handleTourAction = (action: string) => {
    switch (action) {
      case 'switchToUrl':
        setExternalActiveTab('url');
        break;
      case 'switchToPaste':
        setExternalActiveTab('paste');
        break;
      case 'switchToManual':
        setExternalActiveTab('manual');
        break;
      case 'switchToBatch':
        setExternalActiveTab('batch');
        break;
    }
  };

  const handleTourComplete = () => {
    setShowTour(false);
    setTourCompleted(true);
    setExternalActiveTab(undefined);
    localStorage.setItem('clemelopy_schema_studio_tour_completed', 'true');
  };

  const handleTourClose = () => {
    setShowTour(false);
    setExternalActiveTab(undefined);
  };

  const handleTourSkip = () => {
    setShowTour(false);
    setExternalActiveTab(undefined);
    localStorage.setItem('clemelopy_schema_studio_tour_dismissed', 'true');
  };

  const handleStartTour = () => {
    // Reset to URL tab when starting tour
    setExternalActiveTab('url');
    setShowTour(true);
  };

  return (
    <Layout activeNav="tools">
      <main>
        {/* Header - Frosted Glass Container */}
        <header 
          className="rounded-2xl px-8 py-12 mb-8"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.7) 50%, rgba(0, 169, 157, 0.05) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex-1 text-center">
              <h1 
                className="text-3xl lg:text-4xl mb-2" 
                style={{ fontFamily: 'Montserrat Alternates', fontWeight: 700 }}
              >
                <span style={{ color: '#1a1a1a' }}>Schema </span>
                <span 
                  style={{ 
                    background: 'linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Studio
                </span>
              </h1>
              <p 
                className="text-base max-w-2xl mx-auto"
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: 500,
                  color: '#4a4642',
                }}
              >
                Create structured data markup so AI engines can understand and cite your content.
              </p>
            </div>
            {/* Tour Button */}
            <TourHelpButton 
              onClick={handleStartTour} 
              hasCompleted={tourCompleted}
            />
          </div>
        </header>

        {/* Main Glassmorphic Container */}
        <div 
          style={{ 
            background: 'rgba(255, 255, 255, 0.25)', 
            backdropFilter: 'blur(20px)', 
            WebkitBackdropFilter: 'blur(20px)', 
            border: '1px solid rgba(255, 255, 255, 0.4)', 
            borderRadius: '32px', 
            padding: '32px', 
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)' 
          }}
        >
          <SchemaBuilder 
            externalActiveTab={externalActiveTab}
            onTabChange={(tab) => {
              // If user manually changes tab during tour, sync external state
              // This prevents the tour from fighting with user input
              if (showTour) {
                setExternalActiveTab(tab);
              }
            }}
          />
        </div>
      </main>

      {/* Tour Component */}
      <PageTour
        isOpen={showTour}
        onClose={handleTourClose}
        onComplete={handleTourComplete}
        onSkip={handleTourSkip}
        steps={schemaStudioTourSteps}
        tourName="schema-studio"
        onAction={handleTourAction}
      />
    </Layout>
  );
}
