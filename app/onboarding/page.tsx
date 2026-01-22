'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AuthLayout from '../components/AuthLayout';
import { supabase } from '../lib/supabase';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

// Glassmorphic input style
const glassInput = {
  background: 'rgba(255, 255, 255, 0.5)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(255, 255, 255, 0.6)',
};

// Input field component
const InputField = ({ 
  label, 
  required = false, 
  hint,
  id,
  ...props 
}: { 
  label: string; 
  required?: boolean; 
  hint?: string;
  id?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label 
        htmlFor={inputId}
        className="block text-sm font-medium text-[#2e2a27] mb-2" 
        style={{ fontFamily: '"Montserrat Alternates"' }}
      >
        {label}{required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        {required && <span className="sr-only">(required)</span>}
        {hint && <span className="text-[#2e2a27]/50 font-normal italic ml-2 text-xs">{hint}</span>}
      </label>
      <input
        id={inputId}
        aria-required={required}
        {...props}
        className="w-full px-4 py-3 rounded-xl text-[#2e2a27] placeholder-[#2e2a27]/40 focus:outline-none focus:ring-2 focus:ring-[#FAA819] transition-all"
        style={{ ...glassInput, fontFamily: 'Inter', fontWeight: 500 }}
      />
    </div>
  );
};

// Select field component
const SelectField = ({ 
  label, 
  required = false,
  options,
  placeholder,
  value,
  onChange,
  id,
}: { 
  label: string; 
  required?: boolean;
  options: string[] | { emoji?: string; label: string }[];
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) => {
  const selectId = id || label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div>
      <label 
        htmlFor={selectId}
        className="block text-sm font-medium text-[#2e2a27] mb-2" 
        style={{ fontFamily: '"Montserrat Alternates"' }}
      >
        {label}{required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        {required && <span className="sr-only">(required)</span>}
      </label>
      <div className="relative">
        <select
          id={selectId}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-required={required}
          className="w-full px-4 py-3 rounded-xl text-[#2e2a27] focus:outline-none focus:ring-2 focus:ring-[#FAA819] transition-all cursor-pointer appearance-none"
          style={{ 
            ...glassInput, 
            fontFamily: 'Inter', 
            fontWeight: 500,
            paddingRight: '40px',
          }}
        >
          <option value="" disabled>{placeholder}</option>
          {options.map((option) => {
            const optionLabel = typeof option === 'string' ? option : option.label;
            const emoji = typeof option === 'string' ? '' : option.emoji;
            return (
              <option key={optionLabel} value={optionLabel}>
                {emoji ? `${emoji} ${optionLabel}` : optionLabel}
              </option>
            );
          })}
        </select>
        {/* Custom dropdown arrow */}
        <div 
          className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        >
          <svg 
            className="w-5 h-5 text-[#5c5652]" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

function OnboardingContent() {
  const searchParams = useSearchParams();
  
  // Get name and email from URL params (passed from signup)
  const nameFromSignup = searchParams.get('name') || '';
  const emailFromSignup = searchParams.get('email') || '';
  
  // Split name into first and last
  const nameParts = nameFromSignup.trim().split(' ');
  const initialFirstName = nameParts[0] || '';
  const initialLastName = nameParts.slice(1).join(' ') || '';

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isAnimating, setIsAnimating] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: initialFirstName, 
    lastName: initialLastName, 
    email: emailFromSignup,
    businessName: '', 
    website: '', 
    profilePhoto: null as string | null,
    streetAddress: '', 
    apartment: '', 
    city: '', 
    state: '', 
    zip: '', 
    country: '', 
    phone: '',
    companySize: '', 
    referralSource: '', 
    referralOther: '', 
    favoriteCitrus: '', 
    citrusOther: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Note: Animation styles (.fade-in) are in globals.css

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
    document.body.appendChild(script);
    script.onload = () => {
      (window as any).clemelopyCornerConfetti = function () {
        const colors = ['#FAA819','#E99502','#FFB547','#00A99D','#009788','#84DCC6','#FDE5C5','#FFE8A3'];
        let idx = 0;
        const nextColor = () => { idx = (idx + 1) % colors.length; return colors[idx]; };
        const rand = (min: number, max: number) => Math.random() * (max - min) + min;
        const end = Date.now() + 2400;
        const confetti = (window as any).confetti;
        (function frame(){
          confetti({ particleCount: 2, angle: 90 + rand(-6,6), spread: 28, startVelocity: 95, gravity: 0.78, ticks: 420, origin: { x: rand(0,0.03), y: 1 }, scalar: 1.05, shapes: ['square'], colors: [nextColor()], drift: rand(-0.4, 0.4) });
          confetti({ particleCount: 2, angle: 90 + rand(-6,6), spread: 28, startVelocity: 95, gravity: 0.78, ticks: 420, origin: { x: rand(0.97,1), y: 1 }, scalar: 1.05, shapes: ['square'], colors: [nextColor()], drift: rand(-0.4, 0.4) });
          if (Date.now() < end) requestAnimationFrame(frame);
        })();
      };
    };
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    if (currentStep === 6) setTimeout(() => { if ((window as any).clemelopyCornerConfetti) (window as any).clemelopyCornerConfetti(); }, 300);
  }, [currentStep]);

  const getProgress = () => ({ 1: 0, 2: 17, 3: 33, 4: 50, 5: 67, 6: 100 }[currentStep]);
  const getInitials = () => ((formData.firstName.charAt(0) || '') + (formData.lastName.charAt(0) || '')).toUpperCase() || 'AB';

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, profilePhoto: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const isStepComplete = () => {
    switch (currentStep) {
      case 1: return formData.firstName.trim() && formData.lastName.trim() && formData.businessName.trim() && formData.website.trim();
      case 2: return formData.streetAddress.trim() && formData.city.trim() && formData.state.trim() && formData.zip.trim() && formData.country.trim() && formData.phone.trim();
      case 3: return formData.companySize !== '';
      case 4: return formData.referralSource !== '';
      case 5: return formData.favoriteCitrus !== '' && (formData.favoriteCitrus !== 'Other' || formData.citrusOther.trim());
      case 6: return true;
      default: return false;
    }
  };

  const handleNext = () => { if (currentStep < 6 && isStepComplete()) { setIsAnimating(true); setTimeout(() => { setCurrentStep((currentStep + 1) as Step); setIsAnimating(false); }, 200); } };
  const handleBack = () => { if (currentStep > 1) { setIsAnimating(true); setTimeout(() => { setCurrentStep((currentStep - 1) as Step); setIsAnimating(false); }, 200); } };
  const handleFinish = async () => {
    try {
      // Get the current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user:', userError);
        alert('Error saving your information. Please try again.');
        return;
      }
  
      // Update the profile with all the onboarding data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          business_name: formData.businessName,
          website_url: formData.website,
          profile_photo: formData.profilePhoto,
          street_address: formData.streetAddress,
          apt_unit_suite: formData.apartment,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          country: formData.country,
          phone_number: { countryCode: '+1', number: formData.phone },
          employee_count: formData.companySize,
          referral_source: formData.referralSource,
          referral_details: formData.referralOther,
          favorite_citrus: formData.favoriteCitrus,
          other_favorite_citrus: formData.citrusOther,
          onboarding_completed: true,
        })
        .eq('id', user.id);
  
      if (updateError) {
        console.error('Error updating profile:', updateError);
        alert('Error saving your information. Please try again.');
        return;
      }
  
      // Success - redirect to home
      // Tours will auto-start based on tour_*_completed columns being false
      window.location.href = '/';
    } catch (error) {
      console.error('Error in handleFinish:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  const companySizeOptions = ['Just Me', '1-10 employees', '11-50 employees', '51-200 employees', '201-500 employees', '500+ employees'];
  const referralOptions = ['Search Engine', 'Social Media', 'Friend/Colleague', 'Online Advertisement', 'Other'];
  const citrusOptions = [{ emoji: '🍊', label: 'Clementines' }, { emoji: '🍊', label: 'Oranges' }, { emoji: '🍊', label: 'Tangerines' }, { emoji: '🍋', label: 'Lemons' }, { emoji: '🍋‍🟩', label: 'Limes' }, { emoji: '🍊', label: 'Grapefruits' }, { emoji: '🍈', label: 'Other' }];

  const ProgressRing = ({ progress }: { progress: number }) => {
    const radius = 45, circumference = 2 * Math.PI * radius, offset = circumference - (progress / 100) * circumference;
    return (
      <div className="relative w-28 h-28 mx-auto mb-3">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="56" cy="56" r={radius} stroke="#FAA819" strokeWidth="6" fill="none" opacity="0.2" />
          <circle cx="56" cy="56" r={radius} stroke="url(#progressGradient)" strokeWidth="6" fill="none" strokeLinecap="round" style={{ strokeDasharray: circumference, strokeDashoffset: offset, transition: 'stroke-dashoffset 0.5s ease-out' }} />
          <defs><linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FAA819" /><stop offset="100%" stopColor="#00A99D" /></linearGradient></defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl text-[#00A99D]" style={{ fontFamily: '"Montserrat Alternates"', fontWeight: 700 }}>{progress}%</span></div>
      </div>
    );
  };

  return (
    <AuthLayout>
        <div className="w-full max-w-2xl">
        <div className={`p-8 ${isAnimating ? 'opacity-50' : 'opacity-100'} transition-opacity`} style={{ background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '32px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)' }}>
          <div className="text-center mb-4"><img src="/clemelopy-logo.svg" alt="Clemelopy" className="h-10 mx-auto" /></div>
          <ProgressRing progress={getProgress()} />
          <p className="text-center text-[#5c5652] mb-6 text-sm" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Step {currentStep} of 6</p>

          {currentStep === 1 && (
            <div className="fade-in">
              <h1 className="text-2xl text-[#00A99D] text-center mb-2" style={{ fontFamily: '"Montserrat Alternates"', fontWeight: 700 }}>Welcome! Let's get started!</h1>
              <p className="text-center text-[#5c5652] mb-6 text-sm" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Tell us a bit about yourself and your business</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="First Name" required type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} placeholder="First name" />
                  <InputField label="Last Name" required type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} placeholder="Last name" />
                </div>
                <InputField label="Business Name" required type="text" value={formData.businessName} onChange={(e) => setFormData({ ...formData, businessName: e.target.value })} placeholder="Business name" />
                <InputField label="Website" required type="url" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} placeholder="Website URL" />
                <div>
                  <label className="block text-sm font-medium text-[#2e2a27] mb-2" style={{ fontFamily: '"Montserrat Alternates"' }}>Profile Photo <span className="text-[#5c5652] font-normal">(optional)</span></label>
                  <div className="flex items-center gap-4">
                    <div onClick={() => fileInputRef.current?.click()} className="flex-1 p-4 text-center cursor-pointer transition-all rounded-xl hover:bg-white/30" style={{ border: '2px dashed rgba(255, 255, 255, 0.6)', background: 'rgba(255, 255, 255, 0.3)' }}>
                      <input ref={fileInputRef} type="file" accept=".svg,.png,.jpg,.jpeg" onChange={handlePhotoUpload} className="hidden" />
                      <svg className="w-6 h-6 mx-auto text-[#5c5652] mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      <p className="text-xs text-[#5c5652]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Drop or click to upload</p>
                    </div>
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center shrink-0 overflow-hidden"
                      style={{
                        background: formData.profilePhoto 
                          ? 'transparent' 
                          : 'rgba(255, 255, 255, 0.35)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06), inset 0 0 0 1px rgba(255, 255, 255, 0.4)',
                      }}
                    >
                      {formData.profilePhoto ? (
                        <img src={formData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span 
                          className="text-2xl font-semibold"
                          style={{ 
                            fontFamily: '"Montserrat Alternates"',
                            background: 'linear-gradient(135deg, #FAA819 0%, #00A99D 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {getInitials()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="fade-in">
              <h1 className="text-2xl text-[#00A99D] text-center mb-2" style={{ fontFamily: '"Montserrat Alternates"', fontWeight: 700 }}>Contact Information</h1>
              <p className="text-center text-[#5c5652] mb-6 text-sm" style={{ fontFamily: 'Inter', fontWeight: 500 }}>This helps us communicate with you when needed</p>
              <div className="space-y-4">
                <InputField label="Street Address" required hint="(personal or business)" type="text" value={formData.streetAddress} onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })} placeholder="Street address" />
                <InputField label="Apartment, Suite, Unit" type="text" value={formData.apartment} onChange={(e) => setFormData({ ...formData, apartment: e.target.value })} placeholder="Apt, Suite, etc. (optional)" />
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="City" required type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="City" />
                  <InputField label="State/Province" required type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="State" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Zip/Postal Code" required type="text" value={formData.zip} onChange={(e) => setFormData({ ...formData, zip: e.target.value })} placeholder="Zip code" />
                  <InputField label="Country" required type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} placeholder="Country" />
                </div>
                <InputField label="Phone Number" required hint="(personal or business)" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone number" />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="fade-in">
              <h1 className="text-2xl text-[#00A99D] text-center mb-2" style={{ fontFamily: '"Montserrat Alternates"', fontWeight: 700 }}>Tell us about your company</h1>
              <p className="text-center text-[#5c5652] mb-6 text-sm" style={{ fontFamily: 'Inter', fontWeight: 500 }}>How many employees does your company have?</p>
              <SelectField label="Company Size" required options={companySizeOptions} placeholder="Select company size" value={formData.companySize} onChange={(value) => setFormData({ ...formData, companySize: value })} />
            </div>
          )}

          {currentStep === 4 && (
            <div className="fade-in">
              <h1 className="text-2xl text-[#00A99D] text-center mb-2" style={{ fontFamily: '"Montserrat Alternates"', fontWeight: 700 }}>How did you hear about us?</h1>
              <p className="text-center text-[#5c5652] mb-6 text-sm" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Help us understand how you discovered our platform</p>
              <div className="space-y-4">
                <SelectField label="Referral Source" required options={referralOptions} placeholder="Select how you heard about us" value={formData.referralSource} onChange={(value) => setFormData({ ...formData, referralSource: value })} />
                {formData.referralSource && <div className="fade-in"><InputField label="Tell us more" type="text" value={formData.referralOther} onChange={(e) => setFormData({ ...formData, referralOther: e.target.value })} placeholder="Share more details (optional)" /></div>}
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="fade-in">
              <h1 className="text-2xl text-[#00A99D] text-center mb-2" style={{ fontFamily: '"Montserrat Alternates"', fontWeight: 700 }}>One last question! 🍊</h1>
              <p className="text-center text-[#5c5652] mb-6 text-sm" style={{ fontFamily: 'Inter', fontWeight: 500 }}>What's your favorite citrus fruit? (Just for fun!)</p>
              <div className="space-y-4">
                <SelectField label="Favorite Citrus Fruit" required options={citrusOptions} placeholder="Select your favorite citrus fruit" value={formData.favoriteCitrus} onChange={(value) => setFormData({ ...formData, favoriteCitrus: value })} />
                {formData.favoriteCitrus === 'Other' && <div className="fade-in"><InputField label="Please specify your favorite citrus" type="text" value={formData.citrusOther} onChange={(e) => setFormData({ ...formData, citrusOther: e.target.value })} placeholder="Enter your favorite citrus" /></div>}
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <div className="fade-in text-center py-8">
              <h1 className="text-3xl text-[#00A99D] mb-3" style={{ fontFamily: '"Montserrat Alternates"', fontWeight: 700 }}>Welcome to Clemelopy! 🎉</h1>
              <p className="text-xl text-[#5c5652] mb-2" style={{ fontFamily: 'Inter', fontWeight: 500 }}>🌻 Let's grow forward together!</p>
              <p className="text-sm text-[#5c5652]" style={{ fontFamily: 'Inter', fontWeight: 500 }}>Your account is all set up and ready to go</p>
            </div>
          )}

          <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.4)', background: 'transparent' }}>
            <div className="flex gap-4">
              {currentStep > 1 && currentStep < 6 && <button onClick={handleBack} className="flex-1 py-3 px-6 rounded-xl font-semibold transition-all hover:scale-[1.02]" style={{ fontFamily: '"Montserrat Alternates"', background: 'rgba(255, 255, 255, 0.5)', border: '1px solid rgba(255, 255, 255, 0.6)', color: '#2e2a27' }}>Back</button>}
              {currentStep < 6 ? (
                <button onClick={handleNext} disabled={!isStepComplete()} className={`py-3 px-6 rounded-xl font-semibold transition-all ${currentStep === 1 ? 'w-full' : 'flex-1'} ${isStepComplete() ? 'hover:scale-[1.02]' : ''}`} style={{ fontFamily: '"Montserrat Alternates"', background: isStepComplete() ? 'linear-gradient(135deg, #FAA819 0%, #E99502 100%)' : 'rgba(255, 255, 255, 0.3)', color: isStepComplete() ? 'white' : 'rgba(46, 42, 39, 0.4)', boxShadow: isStepComplete() ? '0 4px 15px rgba(250, 168, 25, 0.3)' : 'none', cursor: isStepComplete() ? 'pointer' : 'not-allowed' }}>Next →</button>
              ) : (
                <button onClick={handleFinish} className="w-full py-4 px-6 rounded-xl text-white font-semibold transition-all text-lg hover:scale-[1.02]" style={{ fontFamily: '"Montserrat Alternates"', background: 'linear-gradient(135deg, #00A99D 0%, #0D7871 100%)', boxShadow: '0 4px 15px rgba(0, 169, 157, 0.3)' }}>Explore Your Workspace! 🚀</button>
              )}
            </div>
          </div>
        </div>
        <p className="text-center text-[#5c5652] text-sm mt-6" style={{ fontFamily: 'Montserrat Alternates', fontWeight: 600 }}>©{new Date().getFullYear()} Clemelopy™ All Rights Reserved.</p>
      </div>
    </AuthLayout>
  );
}

export default function Onboarding() {
  return (
    <Suspense fallback={
      <AuthLayout>
        <div className="w-full max-w-2xl flex items-center justify-center min-h-[400px]">
          <div className="w-8 h-8 border-3 border-[#FAA819] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AuthLayout>
    }>
      <OnboardingContent />
    </Suspense>
  );
}