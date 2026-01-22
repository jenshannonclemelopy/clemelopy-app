'use client';

/**
 * ================================================
 * CLEMELOPY PAGE TEMPLATE
 * ================================================
 * 
 * Use this template when creating new pages in the app.
 * It provides consistent styling with the glassmorphic design system.
 * 
 * COMPONENTS:
 * - PageHeader: Glassmorphic header with two-tone title, subtitle, and Tour button
 * - PageContainer: Glassmorphic content wrapper
 * 
 * USAGE:
 * 1. Copy this file to your new page location (e.g., app/my-new-page/page.tsx)
 * 2. Update the Layout activeNav prop
 * 3. Update PageHeader props (titleStart, titleEnd, subtitle)
 * 4. Replace the placeholder content in PageContainer
 * 5. Add your page-specific logic and components
 * 
 * ================================================
 */

import Layout from '../components/Layout';
import PageHeader from '../components/PageHeader';
import PageContainer from '../components/PageContainer';

export default function TemplatePage() {
  // Optional: Tour functionality
  const handleTourClick = () => {
    // Implement tour logic here
    console.log('Tour clicked');
  };

  return (
    <Layout 
      activeNav="workspace" // Change to match your nav item: 'workspace' | 'my-projects' | 'tools' | 'learn' | 'to-do' | 'support' | 'settings'
    >
      <main>
        {/* 
          PAGE HEADER
          ===========
          Props:
          - titleStart: First part of title (black text)
          - titleEnd: Second part of title (gradient text)  
          - subtitle: Description text below title
          - centered: Center align text (default: true)
          - showTour: Show/hide Tour button (default: true)
          - onTourClick: Tour button click handler
        */}
        <PageHeader
          titleStart="Page"
          titleEnd="Title"
          subtitle="A brief description of what this page does and how it helps the user."
          centered={true}
          showTour={true}
          onTourClick={handleTourClick}
        />

        {/* 
          PAGE CONTAINER
          ==============
          The main glassmorphic content wrapper.
          Props:
          - children: Your page content
          - className: Additional CSS classes (optional)
          - padding: Custom padding, default '32px' (optional)
        */}
        <PageContainer>
          {/* Your page content goes here */}
          <div className="text-center py-12">
            <p style={{ fontFamily: 'Inter', fontWeight: 500, color: '#4a4642' }}>
              Your page content goes here.
            </p>
          </div>
        </PageContainer>

        {/* 
          MULTIPLE CONTAINERS (Optional)
          ==============================
          You can use multiple PageContainers for different sections.
          Add margin-top for spacing between sections.
        */}
        {/* 
        <PageContainer className="mt-8">
          <div>Second section content</div>
        </PageContainer>
        */}
      </main>
    </Layout>
  );
}


/**
 * ================================================
 * STYLE REFERENCE
 * ================================================
 * 
 * FONTS:
 * - Headings: fontFamily: 'Montserrat Alternates'
 * - Body: fontFamily: 'Inter'
 * 
 * COLORS:
 * - Primary text: #1a1a1a
 * - Secondary text: #4a4642
 * - Muted text: #6b6560
 * - Clemelopy Orange: #FAA819
 * - Clemelopy Orange Dark: #E99502
 * - Clemelopy Teal: #00A99D
 * - Clemelopy Teal Dark: #0D7871
 * - Clemelopy Teal Darker: #005a54
 * 
 * GRADIENTS:
 * - Title gradient: linear-gradient(135deg, #FAA819 0%, #E99502 50%, #00A99D 100%)
 * - Teal button: linear-gradient(135deg, #00A99D, #0D7871)
 * - Orange button: linear-gradient(135deg, #FAA819, #E99502)
 * 
 * GLASSMORPHIC STYLES:
 * - Header background: linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.7) 50%, rgba(0,169,157,0.05) 100%)
 * - Container background: rgba(255, 255, 255, 0.25)
 * - Card background: rgba(255, 255, 255, 0.5) or rgba(255, 255, 255, 0.7)
 * - Backdrop blur: blur(12px) for header, blur(20px) for containers
 * - Border: 1px solid rgba(255, 255, 255, 0.4) to 0.7
 * - Border radius: 20px for cards, 32px for containers
 * - Box shadow: 0 4px 20px rgba(0, 0, 0, 0.06) to 0 8px 32px rgba(0, 0, 0, 0.08)
 * 
 * BUTTONS:
 * - Teal (primary action):
 *   background: linear-gradient(135deg, #00A99D, #0D7871)
 *   color: white
 *   boxShadow: 0 4px 15px rgba(0, 169, 157, 0.3)
 * 
 * - Orange (secondary action):
 *   background: linear-gradient(135deg, #FAA819, #E99502)
 *   color: white
 *   boxShadow: 0 4px 15px rgba(250, 168, 25, 0.3)
 * 
 * - Glass button:
 *   background: rgba(255, 255, 255, 0.6)
 *   border: 1px solid rgba(0, 169, 157, 0.3)
 *   color: #005a54
 * 
 * TAB BUTTONS (like Schema Studio):
 * - Active: bg-linear-to-r from-[#FAA819] to-[#E99502], text-white, shadow
 * - Inactive: bg-white/70, border, subtle shadow
 * 
 * ================================================
 */
