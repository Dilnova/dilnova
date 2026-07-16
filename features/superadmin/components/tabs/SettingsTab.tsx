'use client';

import { useState, useTransition, useRef } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import { uploadToCloudinary } from '@/shared/media/cloudinary-upload';
import { updateSystemSettingAction } from '@/features/superadmin/settings.actions';
import CheckoutOptionsSettings from '../CheckoutOptionsSettings';
import StockAvailabilitySettings from '@/features/inventory/components/StockAvailabilitySettings';
import type { CheckoutOptionDefinition } from '@/features/organization/checkout-options.shared';
import type { StockAvailabilityDefinition } from '@/features/inventory/availability.shared';

interface SettingsTabProps {
  systemName: string;
  mediaLimit: number;
  logoUrl: string | null;
  faviconUrl: string | null;
  hardwareCustomEnabled: boolean;
  nurseryCustomEnabled: boolean;
  techCustomEnabled: boolean;
  servicesCustomEnabled: boolean;
  checkoutOptionsCatalog: CheckoutOptionDefinition[];
  stockAvailabilityCatalog: StockAvailabilityDefinition[];
}

export default function SettingsTab({
  systemName,
  mediaLimit,
  logoUrl,
  faviconUrl,
  hardwareCustomEnabled,
  nurseryCustomEnabled,
  techCustomEnabled,
  servicesCustomEnabled,
  checkoutOptionsCatalog,
  stockAvailabilityCatalog,
}: SettingsTabProps) {
  const [isPending, startTransition] = useTransition();

  const [systemNameInput, setSystemNameInput] = useState(systemName);
  const [mediaLimitInput, setMediaLimitInput] = useState(mediaLimit);
  const [hardwareCustomEnabledInput, setHardwareCustomEnabledInput] = useState(hardwareCustomEnabled);
  const [nurseryCustomEnabledInput, setNurseryCustomEnabledInput] = useState(nurseryCustomEnabled);
  const [techCustomEnabledInput, setTechCustomEnabledInput] = useState(techCustomEnabled);
  const [servicesCustomEnabledInput, setServicesCustomEnabledInput] = useState(servicesCustomEnabled);

  // Logo Upload State
  const [logoInput, setLogoInput] = useState(logoUrl || '');
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState<number | null>(null);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  // Favicon Upload State
  const [faviconInput, setFaviconInput] = useState(faviconUrl || '');
  const [isFaviconUploading, setIsFaviconUploading] = useState(false);
  const [faviconUploadProgress, setFaviconUploadProgress] = useState<number | null>(null);
  const faviconFileInputRef = useRef<HTMLInputElement>(null);

  const triggerNotification = (success: boolean, text: string) => {
    if (success) toast.success(text);
    else toast.error(text);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      triggerNotification(false, 'Logo file size exceeds 5MB limit.');
      return;
    }

    setIsLogoUploading(true);
    setLogoUploadProgress(0);

    try {
      const result = await uploadToCloudinary(file, {
        uploadKind: 'platform',
        onProgress: (progress) => {
          setLogoUploadProgress(progress.percent);
        },
      });

      if (result.success && result.publicUrl) {
        setLogoInput(result.publicUrl);
        triggerNotification(true, 'Logo uploaded successfully.');
      } else {
        triggerNotification(false, result.error || 'Logo upload failed.');
      }
    } catch (err) {
      console.error('Error', err);
      triggerNotification(false, 'An error occurred during logo upload.');
    } finally {
      setIsLogoUploading(false);
      setLogoUploadProgress(null);
      if (logoFileInputRef.current) logoFileInputRef.current.value = '';
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      triggerNotification(false, 'Favicon file size exceeds 2MB limit.');
      return;
    }

    setIsFaviconUploading(true);
    setFaviconUploadProgress(0);

    try {
      const result = await uploadToCloudinary(file, {
        uploadKind: 'platform',
        onProgress: (progress) => {
          setFaviconUploadProgress(progress.percent);
        },
      });

      if (result.success && result.publicUrl) {
        setFaviconInput(result.publicUrl);
        triggerNotification(true, 'Favicon uploaded successfully.');
      } else {
        triggerNotification(false, result.error || 'Favicon upload failed.');
      }
    } catch (err) {
      console.error('Error', err);
      triggerNotification(false, 'An error occurred during favicon upload.');
    } finally {
      setIsFaviconUploading(false);
      setFaviconUploadProgress(null);
      if (faviconFileInputRef.current) faviconFileInputRef.current.value = '';
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await Promise.all([
          updateSystemSettingAction('system_name', systemNameInput),
          updateSystemSettingAction('max_media_per_product', mediaLimitInput.toString()),
          updateSystemSettingAction('logo_url', logoInput),
          updateSystemSettingAction('favicon_url', faviconInput),
          updateSystemSettingAction('custom_hardware_storefront_enabled', hardwareCustomEnabledInput ? 'true' : 'false'),
          updateSystemSettingAction('custom_nursery_storefront_enabled', nurseryCustomEnabledInput ? 'true' : 'false'),
          updateSystemSettingAction('custom_tech_storefront_enabled', techCustomEnabledInput ? 'true' : 'false'),
          updateSystemSettingAction('custom_services_storefront_enabled', servicesCustomEnabledInput ? 'true' : 'false'),
        ]);
        triggerNotification(true, 'System settings updated successfully.');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to update system settings.';
        triggerNotification(false, msg);
      }
    });
  };

  return (
    <div className="max-w-2xl space-y-4">
      {isPending && (
        <div className="fixed inset-0 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-[2px] flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 px-5 py-3 rounded-xl shadow-2xl text-xs font-mono font-bold tracking-wider flex items-center gap-2.5">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            SAVING...
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50">System Settings</h2>
        <p className="text-[10px] sm:text-[11px] text-zinc-400 font-mono mt-0.5">Configure system thresholds and branding</p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-4">
        {/* Application Name */}
        <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <span>🏷️</span> Application Name
          </h3>
          <input
            type="text"
            required
            maxLength={100}
            value={systemNameInput}
            onChange={(e) => setSystemNameInput(e.target.value)}
            className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-sans focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
            placeholder="e.g. Dilnova Hub"
          />
          <p className="text-[10px] text-zinc-400">
            The global display name of the application, used in header titles, layouts, metadata, and automated emails.
          </p>
        </div>

        {/* Media Limit */}
        <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <span>📊</span> Media Upload Limit
          </h3>
          <input
            type="number"
            min="1"
            max="20"
            inputMode="numeric"
            required
            value={mediaLimitInput}
            onChange={(e) => setMediaLimitInput(parseInt(e.target.value, 10) || 1)}
            className="w-full px-4 py-3 sm:py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-base sm:text-sm bg-zinc-50 dark:bg-zinc-900 font-mono focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
          />
          <p className="text-[10px] text-zinc-400">
            Max images/videos per product listing (1–20).
          </p>
        </div>

        {/* Logo */}
        <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <span>🖼️</span> System Logo
          </h3>
          {logoInput ? (
            <div className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
              <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex-shrink-0">
                <Image src={logoInput} alt="System Logo Preview" fill className="object-contain" sizes="64px" />
              </div>
              <button
                type="button"
                onClick={() => setLogoInput('')}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => logoFileInputRef.current?.click()}
              disabled={isLogoUploading}
              className="w-full py-5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="w-7 h-7 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                {isLogoUploading ? 'Uploading...' : 'Upload Logo'}
              </span>
              <span className="text-[9px] text-zinc-400 font-mono">PNG, JPG, WEBP (Max 5MB)</span>
            </button>
          )}
          <input type="file" ref={logoFileInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
          {isLogoUploading && logoUploadProgress !== null && (
            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${logoUploadProgress}%` }} />
            </div>
          )}
        </div>

        {/* Favicon */}
        <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <span>⭐</span> Favicon Icon
          </h3>
          {faviconInput ? (
            <div className="flex items-center gap-3 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 bg-zinc-50/50 dark:bg-zinc-900/10">
              <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 flex-shrink-0">
                <Image src={faviconInput} alt="Favicon Preview" fill className="object-contain" sizes="40px" />
              </div>
              <button
                type="button"
                onClick={() => setFaviconInput('')}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/20 dark:hover:bg-red-900/30 dark:text-red-400 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
              >
                Remove
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => faviconFileInputRef.current?.click()}
              disabled={isFaviconUploading}
              className="w-full py-5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-900/40 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <span className="text-2xl">⭐</span>
              <span className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                {isFaviconUploading ? 'Uploading...' : 'Upload Favicon'}
              </span>
              <span className="text-[9px] text-zinc-400 font-mono">ICO, PNG (Max 2MB)</span>
            </button>
          )}
          <input type="file" ref={faviconFileInputRef} onChange={handleFaviconUpload} accept="image/*" className="hidden" />
          {isFaviconUploading && faviconUploadProgress !== null && (
            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 rounded-full transition-all" style={{ width: `${faviconUploadProgress}%` }} />
            </div>
          )}
        </div>

        {/* Custom Storefront Toggles */}
        <div className="bg-white border border-zinc-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 dark:bg-zinc-950 dark:border-zinc-800 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 border-b border-zinc-100 dark:border-zinc-900 pb-2">
            <span>🎨</span> Custom Storefront Layouts
          </h3>
          
          <div className="flex items-center justify-between py-1">
            <div className="space-y-0.5">
              <label htmlFor="toggle-hardware" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Distar Hardware Storefront
              </label>
              <p className="text-[10px] text-zinc-400">
                Toggle custom dashboard storefront layout for Distar Hardware
              </p>
            </div>
            <button
              id="toggle-hardware"
              type="button"
              onClick={() => setHardwareCustomEnabledInput(!hardwareCustomEnabledInput)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                hardwareCustomEnabledInput ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
              aria-pressed={hardwareCustomEnabledInput}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  hardwareCustomEnabledInput ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-zinc-100 dark:border-zinc-900 pt-3">
            <div className="space-y-0.5">
              <label htmlFor="toggle-nursery" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Distar Nursery Storefront
              </label>
              <p className="text-[10px] text-zinc-400">
                Toggle custom dashboard storefront layout for Distar Nursery
              </p>
            </div>
            <button
              id="toggle-nursery"
              type="button"
              onClick={() => setNurseryCustomEnabledInput(!nurseryCustomEnabledInput)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                nurseryCustomEnabledInput ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
              aria-pressed={nurseryCustomEnabledInput}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  nurseryCustomEnabledInput ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-zinc-100 dark:border-zinc-900 pt-3">
            <div className="space-y-0.5">
              <label htmlFor="toggle-tech" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Distar Tech Storefront
              </label>
              <p className="text-[10px] text-zinc-400">
                Toggle custom dashboard storefront layout for Distar Tech Store
              </p>
            </div>
            <button
              id="toggle-tech"
              type="button"
              onClick={() => setTechCustomEnabledInput(!techCustomEnabledInput)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                techCustomEnabledInput ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
              aria-pressed={techCustomEnabledInput}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  techCustomEnabledInput ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-1 border-t border-zinc-100 dark:border-zinc-900 pt-3">
            <div className="space-y-0.5">
              <label htmlFor="toggle-services" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Dilstar Services Storefront
              </label>
              <p className="text-[10px] text-zinc-400">
                Toggle custom dashboard storefront layout for Dilstar Services
              </p>
            </div>
            <button
              id="toggle-services"
              type="button"
              onClick={() => setServicesCustomEnabledInput(!servicesCustomEnabledInput)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                servicesCustomEnabledInput ? 'bg-purple-600' : 'bg-zinc-200 dark:bg-zinc-800'
              }`}
              aria-pressed={servicesCustomEnabledInput}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  servicesCustomEnabledInput ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={isPending || isLogoUploading || isFaviconUploading}
          className="w-full py-3.5 sm:py-3 bg-purple-700 hover:bg-purple-800 text-white text-sm font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-purple-900/15 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-2"
        >
          {isPending ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Saving...
            </>
          ) : (
            'Save All Settings'
          )}
        </button>
      </form>

      <CheckoutOptionsSettings
        initialCatalog={checkoutOptionsCatalog}
      />

      <StockAvailabilitySettings
        initialCatalog={stockAvailabilityCatalog}
      />
    </div>
  );
}
