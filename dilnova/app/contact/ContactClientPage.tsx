'use client';

import { useState, useTransition, useEffect } from 'react';
import { submitContactFormAction } from './actions';

type CategoryType = 'collaboration' | 'registration' | 'info';

interface ContactClientPageProps {
  systemName: string;
}

export default function ContactClientPage({ systemName }: ContactClientPageProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<{ success: boolean | null; error: string | null }>({
    success: null,
    error: null,
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    category: 'info' as CategoryType,
    subject: '',
    message: '',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const plan = searchParams.get('plan');
      if (plan) {
        const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
        let defaultMessage = '';
        if (plan === 'starter') {
          defaultMessage = `Hi ${systemName} team,\n\nI would like to register my storefront on the Starter Plan ($0/month). Please guide me on the next steps to set up my catalog.\n\nThanks!`;
        } else if (plan === 'growth') {
          defaultMessage = `Hi ${systemName} team,\n\nI am interested in registering my storefront on the Growth Plan ($5/yearly) to upload unlimited listings. Please let me know how to get started.\n\nThanks!`;
        } else if (plan === 'enterprise') {
          defaultMessage = `Hi ${systemName} team,\n\nWe are looking to set up multiple storefront profiles with custom branding and priority support configurations. Please connect us with a representative to discuss the custom Enterprise Plan setup.\n\nThanks!`;
        } else {
          defaultMessage = `Hi ${systemName} team,\n\nI am interested in registering a new storefront on the marketplace. Please provide more details on how to get started.\n\nThanks!`;
        }
        requestAnimationFrame(() => {
          setFormData((prev) => ({
            ...prev,
            category: plan === 'enterprise' ? 'collaboration' : 'registration',
            subject: `Inquiry for ${planName} Plan Registration`,
            message: defaultMessage,
          }));
        });
      }
    }
  }, [systemName]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setState({ success: null, error: null });

    const submissionData = new FormData();
    submissionData.append('name', formData.name);
    submissionData.append('email', formData.email);
    submissionData.append('category', formData.category);
    submissionData.append('subject', formData.subject);
    submissionData.append('message', formData.message);

    startTransition(async () => {
      const result = await submitContactFormAction(null, submissionData);
      if (result.success) {
        setState({ success: true, error: null });
        setFormData({ name: '', email: '', category: 'info', subject: '', message: '' });
      } else {
        setState({ success: false, error: result.error });
      }
    });
  };

  const selectCategory = (category: CategoryType) => {
    setFormData((prev) => ({
      ...prev,
      category,
      subject: prev.subject === '' ? 
        (category === 'collaboration' ? 'Partnership Proposal' : category === 'registration' ? 'New Vendor Registration Inquiry' : 'Information Request') 
        : prev.subject
    }));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans px-4 py-12 md:py-20 relative overflow-hidden">
      {/* Background ambient accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 dark:bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-6xl relative z-10 flex flex-col gap-10">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-zinc-900 via-purple-700 to-zinc-900 dark:from-zinc-100 dark:via-purple-400 dark:to-zinc-100 bg-clip-text text-transparent mb-4">
            Connect with {systemName}
          </h1>
          <p className="text-base text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Whether you want to partner, scale your business by registering as a vendor, or simply want to learn more, we are here to help.
          </p>
        </div>

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
                  <label htmlFor="message" className="block text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                    Message Description
                  </label>
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

                {state.success && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Thank you! Your message has been sent successfully.</span>
                  </div>
                )}

                {state.error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-3">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{state.error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl transition-all duration-200 shadow-md hover:shadow-purple-500/20 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    'Send Message'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
