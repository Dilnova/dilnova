'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateCustomerDeliveryDetailsAction, type UpdateDeliverySettingsInput } from '../profile.actions';
import { MapPin, Loader2, Save } from 'lucide-react';
import DeliveryAddressFormFields from './DeliveryAddressFormFields';
import { toast } from 'sonner';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await updateCustomerDeliveryDetailsAction(formData);
      if (result?.data?.success) {
        toast.success('Delivery preferences saved successfully!');
        router.refresh();
      } else {
        toast.error(result?.serverError || result?.validationErrors?._errors?.[0] || 'Failed to save delivery details');
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

        {/* Action Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            )}
            {isPending ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>
    </div>
  );
}
