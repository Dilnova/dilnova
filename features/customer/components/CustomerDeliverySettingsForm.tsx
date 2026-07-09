'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateCustomerDeliveryDetailsAction, type UpdateDeliverySettingsInput } from '../profile.actions';
import { MapPin, CheckCircle, Loader2, Save, AlertCircle } from 'lucide-react';
import DeliveryAddressFormFields from './DeliveryAddressFormFields';

interface CustomerDeliverySettingsFormProps {
  initialData: {
    shippingAddress: string;
    shippingAddressLine2: string;
    shippingCity: string;
    shippingState: string;
    shippingPostalCode: string;
    shippingCountry: string;
    shippingPhone: string;
    shippingPhone2: string;
  } | null;
}

export default function CustomerDeliverySettingsForm({ initialData }: CustomerDeliverySettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<UpdateDeliverySettingsInput>({
    shippingAddress: initialData?.shippingAddress || '',
    shippingAddressLine2: initialData?.shippingAddressLine2 || '',
    shippingCity: initialData?.shippingCity || '',
    shippingState: initialData?.shippingState || '',
    shippingPostalCode: initialData?.shippingPostalCode || '',
    shippingCountry: initialData?.shippingCountry || '',
    shippingPhone: initialData?.shippingPhone || '',
    shippingPhone2: initialData?.shippingPhone2 || '',
  });

  const isFormEmpty = !initialData?.shippingAddress && !initialData?.shippingPhone;

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateCustomerDeliveryDetailsAction(formData);
      if (result.success) {
        setSuccess(true);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm dark:bg-zinc-900/40 dark:border-zinc-800 overflow-hidden relative">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-white dark:from-purple-950/20 dark:to-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-5">
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Delivery Preferences
            </h4>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed max-w-md">
              {isFormEmpty 
                ? 'Set up your default delivery details to speed up your checkout process.' 
                : 'Manage the default address and contact numbers used for your home deliveries.'}
            </p>
          </div>
          {success && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-widest animate-in fade-in slide-in-from-top-2">
              <CheckCircle className="w-3 h-3" /> Saved
            </div>
          )}
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        
        <DeliveryAddressFormFields
          shippingAddress={formData.shippingAddress}
          shippingAddressLine2={formData.shippingAddressLine2 || ''}
          shippingCity={formData.shippingCity}
          shippingState={formData.shippingState}
          shippingPostalCode={formData.shippingPostalCode}
          shippingCountry={formData.shippingCountry || ''}
          shippingPhone={formData.shippingPhone || ''}
          shippingPhone2={formData.shippingPhone2 || ''}
          onChange={handleChange}
        />

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-xs rounded-xl animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Action Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : success ? (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            ) : (
              <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            )}
            {isPending ? 'Saving...' : success ? 'Saved!' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
