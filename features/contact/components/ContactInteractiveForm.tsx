'use client';

import { logger } from '@/shared/logging/logger';
import { useState, useTransition, useEffect, useRef } from 'react';
import { submitContactFormAction } from '@/features/contact/actions';
import { toast } from 'sonner';
import { Spinner } from '@/shared/ui/loading';
import { useUser } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';

type CategoryType = 'collaboration' | 'registration' | 'info';

interface ContactInteractiveFormProps {
  systemName: string;
}

export default function ContactInteractiveForm({ systemName }: ContactInteractiveFormProps) {
  const { user, isSignedIn, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const [isPending, startTransition] = useTransition();

  const turnstileRef = useRef<HTMLDivElement>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  useEffect(() => {
    // Load Turnstile script dynamically
    const scriptId = 'cloudflare-turnstile-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    // Poll for Turnstile to load and render widget
    let checkCount = 0;
    let widgetId: string | null = null;
    const checkTurnstile = setInterval(() => {
      checkCount++;
      if (typeof window !== 'undefined' && (window as any).turnstile && turnstileRef.current) {
        clearInterval(checkTurnstile);
        try {
          if (turnstileRef.current.innerHTML === '') {
            widgetId = (window as any).turnstile.render(turnstileRef.current, {
              sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
              callback: (token: string) => {
                setTurnstileToken(token);
              },
            });
          }
        } catch (err) {
          logger.error('Failed to render Turnstile widget:', err);
        }
      } else if (checkCount > 50) { // Stop polling after 5 seconds
        clearInterval(checkTurnstile);
      }
    }, 100);

    return () => {
      clearInterval(checkTurnstile);
      if (widgetId !== null && typeof window !== 'undefined' && (window as any).turnstile) {
        try {
          (window as any).turnstile.remove(widgetId);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  const getSampleMessage = (category: CategoryType) => {
    if (category === 'collaboration') {
      return `Hi ${systemName} team,\n\nWe are interested in exploring a strategic technology integration or partnership with ${systemName}. Please connect us with a representative to discuss potential collaboration.\n\nThanks!`;
    }
    if (category === 'registration') {
      return `Hi ${systemName} team,\n\nI would like to register my store on ${systemName} to manage products, inventory, and orders. Please guide me on the next steps to set up our storefront catalog.\n\nBest regards!`;
    }
    return `Hi ${systemName} team,\n\nI have a few questions regarding platform capabilities, pricing options, and system features. Could you please provide more details?\n\nThank you!`;
  };

  const [formData, setFormData] = useState(() => {
    let category: CategoryType = 'info';
    let subject = '';
    let message = '';
    if (plan) {
      const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
      category = plan === 'enterprise' ? 'collaboration' : 'registration';
      subject = `Inquiry for ${planName} Plan Registration`;
      if (plan === 'starter') {
        message = `Hi ${systemName} team,\n\nI would like to register my storefront on the Starter Plan ($0/month). Please guide me on the next steps to set up my catalog.\n\nThanks!`;
      } else if (plan === 'growth') {
        message = `Hi ${systemName} team,\n\nI am interested in registering my storefront on the Growth Plan ($5/yearly) to upload unlimited listings. Please let me know how to get started.\n\nThanks!`;
      } else if (plan === 'enterprise') {
        message = `Hi ${systemName} team,\n\nWe are looking to set up multiple storefront profiles with custom branding and priority support configurations. Please connect us with a representative to discuss the custom Enterprise Plan setup.\n\nThanks!`;
      } else {
        message = `Hi ${systemName} team,\n\nI am interested in registering a new storefront on the marketplace. Please provide more details on how to get started.\n\nThanks!`;
      }
    }
    return {
      name: '',
      email: '',
      category,
      subject,
      message,
      middleName: '',
    };
  });

  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const userEmail = user.primaryEmailAddress?.emailAddress || '';
      const userName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim();
      setFormData((prev) => ({
        ...prev,
        email: prev.email || userEmail,
        name: prev.name || userName,
      }));
    }
  }, [isLoaded, isSignedIn, user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const submissionData = new FormData();
    submissionData.append('name', formData.name);
    submissionData.append('email', formData.email);
    submissionData.append('category', formData.category);
    submissionData.append('subject', formData.subject);
    submissionData.append('message', formData.message);
    submissionData.append('middleName', formData.middleName);
    if (turnstileToken) {
      submissionData.append('cf-turnstile-response', turnstileToken);
    }

    startTransition(async () => {
      const result = await submitContactFormAction(null, submissionData);
      if (result.success) {
        toast.success('Thank you! Your message has been sent successfully.');
        setFormData({ name: '', email: '', category: 'info', subject: '', message: '', middleName: '' });
      } else {
        toast.error(result.error || 'Failed to submit contact form.');
      }

      if (typeof window !== 'undefined' && (window as any).turnstile) {
        (window as any).turnstile.reset();
        setTurnstileToken(null);
      }
    });
  };

  const selectCategory = (category: CategoryType) => {
    setFormData((prev) => {
      const isMessageDefault = !prev.message || prev.message.startsWith('Hi ');
      const newSubject = prev.subject === '' || ['Partnership Proposal', 'New Vendor Registration Inquiry', 'Information Request'].includes(prev.subject)
        ? (category === 'collaboration' ? 'Partnership Proposal' : category === 'registration' ? 'New Vendor Registration Inquiry' : 'Information Request')
        : prev.subject;

      return {
        ...prev,
        category,
        subject: newSubject,
        message: isMessageDefault ? getSampleMessage(category) : prev.message,
      };
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Info cards: Left Column */}
      <div className="lg:col-span-5 flex flex-col gap-6">
            <h2 className="text-xl font-bold tracking-tight text-zinc-800 dark:text-zinc-200 px-1">
              Choose a topic to learn more
            </h2>
            
            {/* Card 1: Collaboration */}
            <button
              type="button"
              onClick={() => selectCategory('collaboration')}
              className={`text-left border p-6 rounded-2xl transition-all duration-300 cursor-pointer ${
                formData.category === 'collaboration'
                  ? 'border-purple-500 bg-purple-500/5 shadow-md scale-[1.01]'
                  : 'border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl text-purple-700 dark:text-purple-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-950 dark:text-zinc-50 mb-1">Collaborate with Us</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Build integrations, co-market solutions, or join as a strategic technology partner. We love building together.
                  </p>
                </div>
              </div>
            </button>

            {/* Card 2: Vendor Registration */}
            <button
              type="button"
              onClick={() => selectCategory('registration')}
              className={`text-left border p-6 rounded-2xl transition-all duration-300 cursor-pointer ${
                formData.category === 'registration'
                  ? 'border-purple-500 bg-purple-500/5 shadow-md scale-[1.01]'
                  : 'border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl text-purple-700 dark:text-purple-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-950 dark:text-zinc-50 mb-1">Register Organization / Store</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Set up your storefront, manage products, handle orders, and expand your target audience using {systemName}’s commerce ecosystem.
                  </p>
                </div>
              </div>
            </button>

            {/* Card 3: Info */}
            <button
              type="button"
              onClick={() => selectCategory('info')}
              className={`text-left border p-6 rounded-2xl transition-all duration-300 cursor-pointer ${
                formData.category === 'info'
                  ? 'border-purple-500 bg-purple-500/5 shadow-md scale-[1.01]'
                  : 'border-zinc-200/80 dark:border-zinc-800/80 bg-white/60 dark:bg-zinc-900/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/60'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900/40 rounded-xl text-purple-700 dark:text-purple-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-base text-zinc-950 dark:text-zinc-50 mb-1">General Inquiry / Info</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Have questions about platform pricing, security compliance, or how the commerce tools can help your specific workflow? Ask away.
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Form: Right Column */}
          <div className="lg:col-span-7">
            <div className="border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/40 backdrop-blur-xl p-8 rounded-3xl shadow-xl transition-all duration-300">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                      Your Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="John Doe"
                      className="w-full h-11 px-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/40 dark:focus:ring-purple-500/30 transition-all duration-200"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="john@example.com"
                      className="w-full h-11 px-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/40 dark:focus:ring-purple-500/30 transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Honeypot field (hidden from users, targeted at spam bots) */}
                <div className="hidden" aria-hidden="true">
                  <label htmlFor="middleName" className="sr-only">Middle Name</label>
                  <input
                    type="text"
                    id="middleName"
                    name="middleName"
                    tabIndex={-1}
                    value={formData.middleName}
                    onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label htmlFor="category" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    Inquiry Type / Topic
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={(e) => selectCategory(e.target.value as CategoryType)}
                    className="w-full h-11 px-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/40 dark:focus:ring-purple-500/30 transition-all duration-200 cursor-pointer text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="collaboration">Collaborate with Us</option>
                    <option value="registration">Register Organization / Store</option>
                    <option value="info">General Inquiry / Learn More</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Inquiry subject..."
                    className="w-full h-11 px-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/40 dark:focus:ring-purple-500/30 transition-all duration-200"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Message Description
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, message: getSampleMessage(prev.category) }))}
                      className="text-xs font-medium text-purple-600 dark:text-purple-400 hover:underline cursor-pointer focus:outline-none"
                    >
                      + Load Sample Template
                    </button>
                  </div>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe your inquiry in detail..."
                    className="w-full p-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-purple-500/40 dark:focus:ring-purple-500/30 transition-all duration-200 resize-none"
                  />
                </div>

                {/* Sonner Toasts will handle feedback */}

                {/* Turnstile widget container */}
                <div className="flex justify-center my-4">
                  <div ref={turnstileRef} />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Spinner size="sm" />
                      <span>Sending Inquiry...</span>
                    </>
                  ) : (
                    <span>Send Inquiry</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
  );
}
