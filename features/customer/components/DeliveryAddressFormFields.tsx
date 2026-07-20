'use client';

import { MapPin, Phone, Building, Map, Hash, Globe } from 'lucide-react';
import React from 'react';

export interface DeliveryAddressFormFieldsProps {
  shippingAddress: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingPhone: string;
  shippingPhone2: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function DeliveryAddressFormFields({
  shippingAddress,
  shippingAddressLine2,
  shippingCity,
  shippingState,
  shippingPostalCode,
  shippingCountry,
  shippingPhone,
  shippingPhone2,
  onChange,
}: DeliveryAddressFormFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono flex items-center gap-1.5">
          <Building className="w-3 h-3" /> Delivery Address
        </h5>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 relative">
            <label htmlFor="shippingAddress" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1">
              Street Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <MapPin className="w-4 h-4 text-zinc-400" />
              </div>
              <input
                id="shippingAddress"
                type="text"
                name="shippingAddress"
                value={shippingAddress}
                onChange={onChange}
                placeholder="e.g. 123 Main Street"
                required
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>
          
          <div className="sm:col-span-2 relative">
            <label htmlFor="shippingAddressLine2" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1">
              Apartment, Suite, Unit <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <input
              id="shippingAddressLine2"
              type="text"
              name="shippingAddressLine2"
              value={shippingAddressLine2 || ''}
              onChange={onChange}
              placeholder="e.g. Apt 4B"
              className="w-full h-11 px-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
            />
          </div>
          
          <div className="relative">
            <label htmlFor="shippingCity" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1">
              City <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Building className="w-4 h-4 text-zinc-400" />
              </div>
              <input
                id="shippingCity"
                type="text"
                name="shippingCity"
                value={shippingCity}
                onChange={onChange}
                placeholder="e.g. New York"
                required
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>
          
          <div className="relative">
            <label htmlFor="shippingState" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1">
              State / Province <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Map className="w-4 h-4 text-zinc-400" />
              </div>
              <input
                id="shippingState"
                type="text"
                name="shippingState"
                value={shippingState}
                onChange={onChange}
                placeholder="e.g. NY"
                required
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>
          
          <div className="relative">
            <label htmlFor="shippingPostalCode" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1">
              Postal Code <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Hash className="w-4 h-4 text-zinc-400" />
              </div>
              <input
                id="shippingPostalCode"
                type="text"
                name="shippingPostalCode"
                value={shippingPostalCode}
                onChange={onChange}
                placeholder="e.g. 10001"
                required
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>
          
          <div className="relative">
            <label htmlFor="shippingCountry" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1">
              Country <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Globe className="w-4 h-4 text-zinc-400" />
              </div>
              <input
                id="shippingCountry"
                type="text"
                name="shippingCountry"
                value={shippingCountry || ''}
                onChange={onChange}
                placeholder="e.g. United States"
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full my-4" />

      <div className="space-y-3">
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono flex items-center gap-1.5">
          <Phone className="w-3 h-3" /> Contact Numbers
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <label htmlFor="shippingPhone" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1">
              Primary Phone <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Phone className="w-4 h-4 text-zinc-400" />
              </div>
              <input
                id="shippingPhone"
                type="tel"
                name="shippingPhone"
                value={shippingPhone || ''}
                onChange={onChange}
                placeholder="e.g. +1 555-0198"
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>
          <div className="relative">
            <label htmlFor="shippingPhone2" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1">
              Secondary Phone <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Phone className="w-4 h-4 text-zinc-400 opacity-50" />
              </div>
              <input
                id="shippingPhone2"
                type="tel"
                name="shippingPhone2"
                value={shippingPhone2 || ''}
                onChange={onChange}
                placeholder="Alternative contact"
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
