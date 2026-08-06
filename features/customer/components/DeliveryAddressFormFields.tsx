"use client";

import { MapPin, Phone, Building, Map, Hash, Globe, Navigation, Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";

export interface LiveCountry {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

export interface LiveState {
  name: string;
  code?: string;
}

export interface DeliveryAddressFormFieldsProps {
  shippingAddress: string;
  shippingAddressLine2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingPhone: string;
  shippingPhone2: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
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
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Live API States
  const [countries, setCountries] = useState<LiveCountry[]>([]);
  const [states, setStates] = useState<LiveState[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  const selectedCountryName = shippingCountry || "Sri Lanka";

  // 1. Fetch 250+ Live Countries via Next.js Server API Proxy
  useEffect(() => {
    let isMounted = true;
    fetch("/api/locations?type=countries")
      .then((res) => res.json())
      .then((res) => {
        if (isMounted && res?.data) setCountries(res.data);
      })
      .catch((err) => console.warn("Countries fetch notice", err));

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch Live States/Provinces via Next.js Server API Proxy
  useEffect(() => {
    let isMounted = true;
    if (!selectedCountryName) {
      setStates([]);
      return;
    }

    setIsLoadingStates(true);
    fetch(`/api/locations?type=states&country=${encodeURIComponent(selectedCountryName)}`)
      .then((res) => res.json())
      .then((res) => {
        if (isMounted) {
          setStates(res?.data || []);
          setIsLoadingStates(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingStates(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCountryName]);

  // 3. Fetch Live Cities via Next.js Server API Proxy
  useEffect(() => {
    let isMounted = true;
    if (!selectedCountryName || !shippingState) {
      setCities([]);
      return;
    }

    setIsLoadingCities(true);
    fetch(
      `/api/locations?type=cities&country=${encodeURIComponent(selectedCountryName)}&state=${encodeURIComponent(shippingState)}`,
    )
      .then((res) => res.json())
      .then((res) => {
        if (isMounted) {
          setCities(res?.data || []);
          setIsLoadingCities(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingCities(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCountryName, shippingState]);

  const triggerSyntheticChange = (name: string, value: string) => {
    const event = {
      target: { name, value },
    } as unknown as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>;
    onChange(event);
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    onChange(e);
    // Reset state & city when country changes
    triggerSyntheticChange("shippingState", "");
    triggerSyntheticChange("shippingCity", "");
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    onChange(e);
    // Reset city when state changes
    triggerSyntheticChange("shippingCity", "");
  };

  // Worldwide Location Detection (GPS Lat/Lon + Server Proxy + IP Fallback)
  const applyDetectedAddressData = (data: {
    country?: string;
    state?: string;
    city?: string;
    streetAddress?: string;
    postcode?: string;
  }) => {
    if (data.country) triggerSyntheticChange("shippingCountry", data.country);
    if (data.state) triggerSyntheticChange("shippingState", data.state);
    if (data.city) triggerSyntheticChange("shippingCity", data.city);
    if (data.streetAddress) triggerSyntheticChange("shippingAddress", data.streetAddress);
    if (data.postcode) triggerSyntheticChange("shippingPostalCode", data.postcode);

    setLocationStatus(
      `Location set to ${data.city ? data.city + ", " : ""}${data.country || "Detected Region"}!`,
    );
    setTimeout(() => setLocationStatus(null), 4000);
  };

  const handleIpFallback = async () => {
    try {
      setLocationStatus("Detecting location via network...");
      const res = await fetch("/api/locations?type=ip-location");
      const json = await res.json();
      if (json?.success && json?.data) {
        applyDetectedAddressData(json.data);
        return;
      }
    } catch (err) {
      console.warn("IP location fallback failed", err);
    }
    setLocationStatus("Location permission denied. Please select address below.");
    setTimeout(() => setLocationStatus(null), 4000);
  };

  const handleDetectLocation = () => {
    setIsLocating(true);
    setLocationStatus("Detecting location...");

    if (!navigator.geolocation) {
      handleIpFallback().finally(() => setIsLocating(false));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `/api/locations?type=reverse-geocode&lat=${latitude}&lon=${longitude}`,
          );
          const json = await res.json();

          if (json?.success && json?.data) {
            applyDetectedAddressData(json.data);
          } else {
            await handleIpFallback();
          }
        } catch (error) {
          console.error("GPS Reverse Geocode Error", error);
          await handleIpFallback();
        } finally {
          setIsLocating(false);
        }
      },
      async () => {
        // If GPS permission denied or times out, try IP fallback
        try {
          await handleIpFallback();
        } finally {
          setIsLocating(false);
        }
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono flex items-center gap-1.5">
            <Building className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Enterprise Global
            Delivery Address
          </h5>

          {/* Worldwide HTML5 GPS Location Button */}
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isLocating}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-all cursor-pointer disabled:opacity-50"
            title="Auto-detect your location anywhere in the world using GPS"
          >
            {isLocating ? (
              <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
            ) : (
              <Navigation className="w-3 h-3 text-purple-600 dark:text-purple-400" />
            )}
            <span>{isLocating ? "Detecting..." : "Detect Location"}</span>
          </button>
        </div>

        {locationStatus && (
          <p className="text-[10px] text-purple-600 dark:text-purple-400 font-medium px-1 animate-pulse">
            {locationStatus}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Live Global Country Selection Dropdown */}
          <div className="sm:col-span-2 relative">
            <label
              htmlFor="shippingCountry"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
            >
              Country <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                <Globe className="w-4 h-4 text-zinc-400" />
              </div>
              <select
                id="shippingCountry"
                name="shippingCountry"
                value={selectedCountryName}
                onChange={handleCountryChange}
                required
                className="w-full h-11 pl-10 pr-8 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm appearance-none cursor-pointer"
              >
                <option value="">
                  Select Country (
                  {countries.length > 0 ? `${countries.length} Countries Available` : "Loading..."})
                </option>
                {countries.map((c) => (
                  <option key={c.code} value={c.name}>
                    {c.flag} {c.name} {c.dialCode ? `(${c.dialCode})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Live State / Province / District Dropdown OR Input */}
          <div className="relative">
            <label
              htmlFor="shippingState"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1 flex items-center justify-between"
            >
              <span>
                State / Province / District <span className="text-red-500">*</span>
              </span>
              {isLoadingStates && <Loader2 className="w-3 h-3 animate-spin text-purple-600" />}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                <Map className="w-4 h-4 text-zinc-400" />
              </div>
              {states.length > 0 ? (
                <select
                  id="shippingState"
                  name="shippingState"
                  value={shippingState || ""}
                  onChange={handleStateChange}
                  required
                  className="w-full h-11 pl-10 pr-8 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">Select State / Province ({states.length})</option>
                  {states.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="shippingState"
                  type="text"
                  name="shippingState"
                  value={shippingState}
                  onChange={onChange}
                  placeholder={isLoadingStates ? "Loading states..." : "State / Province / Region"}
                  required
                  className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
                />
              )}
            </div>
          </div>

          {/* Dynamic Live City Dropdown OR Input */}
          <div className="relative">
            <label
              htmlFor="shippingCity"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1 flex items-center justify-between"
            >
              <span>
                City / Town <span className="text-red-500">*</span>
              </span>
              {isLoadingCities && <Loader2 className="w-3 h-3 animate-spin text-purple-600" />}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                <Building className="w-4 h-4 text-zinc-400" />
              </div>
              {cities.length > 0 ? (
                <select
                  id="shippingCity"
                  name="shippingCity"
                  value={shippingCity || ""}
                  onChange={onChange}
                  required
                  className="w-full h-11 pl-10 pr-8 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm appearance-none cursor-pointer"
                >
                  <option value="">Select City / Town ({cities.length})</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="shippingCity"
                  type="text"
                  name="shippingCity"
                  value={shippingCity}
                  onChange={onChange}
                  placeholder={isLoadingCities ? "Loading cities..." : "City Name"}
                  required
                  className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
                />
              )}
            </div>
          </div>

          {/* Postal Code Field */}
          <div className="relative">
            <label
              htmlFor="shippingPostalCode"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
            >
              Postal / ZIP Code <span className="text-red-500">*</span>
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
                placeholder="e.g. 10001 or 10100"
                required
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Street Address */}
          <div className="sm:col-span-2 relative">
            <label
              htmlFor="shippingAddress"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
            >
              Street Address / House No <span className="text-red-500">*</span>
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
                placeholder="e.g. 123 Main Street / No. 45 Station Road"
                required
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Address Line 2 */}
          <div className="sm:col-span-2 relative">
            <label
              htmlFor="shippingAddressLine2"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
            >
              Building, Apartment, Suite{" "}
              <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <input
              id="shippingAddressLine2"
              type="text"
              name="shippingAddressLine2"
              value={shippingAddressLine2 || ""}
              onChange={onChange}
              placeholder="e.g. Apt 4B / Suite 200"
              className="w-full h-11 px-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
            />
          </div>
        </div>
      </div>

      <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full my-4" />

      {/* Contact Phone Numbers */}
      <div className="space-y-3">
        <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100 font-mono flex items-center gap-1.5">
          <Phone className="w-3 h-3 text-purple-600 dark:text-purple-400" /> Contact Numbers
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <label
              htmlFor="shippingPhone"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
            >
              Primary Phone{" "}
              <span className="text-zinc-400 font-normal">(For Delivery Courier)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Phone className="w-4 h-4 text-zinc-400" />
              </div>
              <input
                id="shippingPhone"
                type="tel"
                inputMode="tel"
                name="shippingPhone"
                value={shippingPhone || ""}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^0-9+\-()\s]/g, "");
                  if (sanitized !== e.target.value) {
                    const synthEvent = {
                      ...e,
                      target: { ...e.target, name: e.target.name, value: sanitized },
                    } as React.ChangeEvent<HTMLInputElement>;
                    onChange(synthEvent);
                  } else {
                    onChange(e);
                  }
                }}
                placeholder="e.g. +1 555-0198 or 077 123 4567"
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>
          <div className="relative">
            <label
              htmlFor="shippingPhone2"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
            >
              Secondary Phone <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Phone className="w-4 h-4 text-zinc-400 opacity-50" />
              </div>
              <input
                id="shippingPhone2"
                type="tel"
                inputMode="tel"
                name="shippingPhone2"
                value={shippingPhone2 || ""}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^0-9+\-()\s]/g, "");
                  if (sanitized !== e.target.value) {
                    const synthEvent = {
                      ...e,
                      target: { ...e.target, name: e.target.name, value: sanitized },
                    } as React.ChangeEvent<HTMLInputElement>;
                    onChange(synthEvent);
                  } else {
                    onChange(e);
                  }
                }}
                placeholder="Alternative mobile number"
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
