"use client";

import { MapPin, Building, Map, Hash, Globe, Navigation, Loader2, Phone } from "lucide-react";
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
  shippingPhone?: string;
  shippingPhone2?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export default function DeliveryAddressFormFields({
  shippingAddress,
  shippingAddressLine2,
  shippingCity,
  shippingState,
  shippingPostalCode,
  shippingCountry,
  shippingPhone = "",
  shippingPhone2 = "",
  onChange,
}: DeliveryAddressFormFieldsProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);

  // Live API States
  const [countries, setCountries] = useState<LiveCountry[]>([]);
  const [states, setStates] = useState<LiveState[]>([]);
  const [districts, setDistricts] = useState<LiveState[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoadingStates, setIsLoadingStates] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  const selectedCountryName = shippingCountry;
  const isThreeTierActive = districts.length > 0;

  const triggerSyntheticChange = (name: string, value: string) => {
    const event = {
      target: { name, value },
    } as unknown as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>;
    onChange(event);
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    onChange(e);
    // Reset state, district & city when country changes
    triggerSyntheticChange("shippingState", "");
    triggerSyntheticChange("shippingAddressLine2", "");
    triggerSyntheticChange("shippingCity", "");
  };

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    onChange(e);
    // Reset district & city when province/state changes
    triggerSyntheticChange("shippingAddressLine2", "");
    triggerSyntheticChange("shippingCity", "");
  };

  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    onChange(e);
    // Reset city when district changes
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
        try {
          await handleIpFallback();
        } finally {
          setIsLocating(false);
        }
      },
      { timeout: 8000, enableHighAccuracy: true },
    );
  };

  // Instant auto-fill location dynamically on mount if no address is set yet
  useEffect(() => {
    if (!shippingCountry && !shippingCity && !shippingAddress) {
      setIsLocating(true);
      handleIpFallback().finally(() => setIsLocating(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // 3. Fetch Live Districts for 3-tier countries (like Sri Lanka)
  useEffect(() => {
    let isMounted = true;
    if (!selectedCountryName) {
      setDistricts([]);
      return;
    }

    setIsLoadingDistricts(true);
    const url = shippingState
      ? `/api/locations?type=districts&country=${encodeURIComponent(selectedCountryName)}&province=${encodeURIComponent(shippingState)}`
      : `/api/locations?type=districts&country=${encodeURIComponent(selectedCountryName)}`;

    fetch(url)
      .then((res) => res.json())
      .then((res) => {
        if (isMounted) {
          setDistricts(res?.data || []);
          setIsLoadingDistricts(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsLoadingDistricts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCountryName, shippingState]);

  // 4. Fetch Live Cities via Next.js Server API Proxy
  useEffect(() => {
    let isMounted = true;
    if (!selectedCountryName) {
      setCities([]);
      return;
    }

    setIsLoadingCities(true);
    const activeSubRegion = shippingAddressLine2 || shippingState;
    const url = activeSubRegion
      ? `/api/locations?type=cities&country=${encodeURIComponent(selectedCountryName)}&district=${encodeURIComponent(activeSubRegion)}`
      : `/api/locations?type=cities&country=${encodeURIComponent(selectedCountryName)}`;

    fetch(url)
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
  }, [selectedCountryName, shippingState, shippingAddressLine2]);

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
          {/* Live Global Country Type-ahead Auto-suggest Input */}
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
              <input
                id="shippingCountry"
                type="text"
                name="shippingCountry"
                value={selectedCountryName || ""}
                onChange={handleCountryChange}
                list="country-suggestions-list"
                autoComplete="off"
                placeholder={
                  countries.length > 0 ? "Search or select country..." : "Loading countries..."
                }
                required
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
              {countries.length > 0 && (
                <datalist id="country-suggestions-list">
                  {countries.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.flag} {c.name} {c.dialCode ? `(${c.dialCode})` : ""}
                    </option>
                  ))}
                </datalist>
              )}
            </div>
            {countries.length > 0 && (
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 ml-1">
                Type a few letters to see matching country suggestions ({countries.length}{" "}
                available)
              </p>
            )}
          </div>

          {/* Tier 1: State / Province Type-ahead Input */}
          <div className="relative">
            <label
              htmlFor="shippingState"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1 flex items-center justify-between"
            >
              <span>
                {isThreeTierActive ? "Province" : "State / Province"}{" "}
                <span className="text-red-500">*</span>
              </span>
              {isLoadingStates && <Loader2 className="w-3 h-3 animate-spin text-purple-600" />}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                <Map className="w-4 h-4 text-zinc-400" />
              </div>
              <input
                id="shippingState"
                type="text"
                name="shippingState"
                value={shippingState || ""}
                onChange={handleStateChange}
                list="state-suggestions-list"
                autoComplete="off"
                placeholder={
                  isLoadingStates
                    ? "Loading suggestions..."
                    : isThreeTierActive
                      ? "Enter or search province..."
                      : "Enter or search state / province..."
                }
                required
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
              {states.length > 0 && (
                <datalist id="state-suggestions-list">
                  {states.map((s) => (
                    <option key={s.name} value={s.name} />
                  ))}
                </datalist>
              )}
            </div>
            {states.length > 0 && (
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 ml-1">
                Type a few letters to see matching suggestions ({states.length} available)
              </p>
            )}
          </div>

          {/* Tier 2: District / Sub-Region Type-ahead Input */}
          {isThreeTierActive && (
            <div className="relative">
              <label
                htmlFor="shippingAddressLine2"
                className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1 flex items-center justify-between"
              >
                <span>
                  District / Sub-Region <span className="text-red-500">*</span>
                </span>
                {isLoadingDistricts && <Loader2 className="w-3 h-3 animate-spin text-purple-600" />}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                  <MapPin className="w-4 h-4 text-zinc-400" />
                </div>
                <input
                  id="shippingAddressLine2"
                  type="text"
                  name="shippingAddressLine2"
                  value={shippingAddressLine2 || ""}
                  onChange={handleDistrictChange}
                  list="district-suggestions-list"
                  autoComplete="off"
                  placeholder={
                    isLoadingDistricts
                      ? "Loading suggestions..."
                      : "Enter or search district / sub-region..."
                  }
                  required
                  className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
                />
                {districts.length > 0 && (
                  <datalist id="district-suggestions-list">
                    {districts.map((d) => (
                      <option key={d.name} value={d.name} />
                    ))}
                  </datalist>
                )}
              </div>
              {districts.length > 0 && (
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 ml-1">
                  Type a few letters to see matching district suggestions ({districts.length}{" "}
                  available)
                </p>
              )}
            </div>
          )}

          {/* Tier 3: City / Town / Suburb Type-ahead Auto-suggest Input */}
          <div className="relative">
            <label
              htmlFor="shippingCity"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1 flex items-center justify-between"
            >
              <span>
                City / Town / Suburb <span className="text-red-500">*</span>
              </span>
              {isLoadingCities && <Loader2 className="w-3 h-3 animate-spin text-purple-600" />}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none z-10">
                <Building className="w-4 h-4 text-zinc-400" />
              </div>
              <input
                id="shippingCity"
                type="text"
                name="shippingCity"
                value={shippingCity || ""}
                onChange={onChange}
                list="city-suggestions-list"
                autoComplete="off"
                placeholder={
                  isLoadingCities ? "Loading suggestions..." : "Enter or search city / town..."
                }
                required
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
              {cities.length > 0 && (
                <datalist id="city-suggestions-list">
                  {cities.map((city) => (
                    <option key={city} value={city} />
                  ))}
                </datalist>
              )}
            </div>
            {cities.length > 0 && (
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 ml-1">
                Type a few letters to see matching suggestions ({cities.length} available)
              </p>
            )}
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
                placeholder="Postal / ZIP code"
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
                placeholder="Street address, house number, or P.O. Box"
                required
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Building / Suite (Shown when Address Line 2 is NOT being used as District) */}
          {!isThreeTierActive && (
            <div className="sm:col-span-2 relative">
              <label
                htmlFor="shippingAddressLine2"
                className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
              >
                Building, Apartment, Suite (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Building className="w-4 h-4 text-zinc-400" />
                </div>
                <input
                  id="shippingAddressLine2"
                  type="text"
                  name="shippingAddressLine2"
                  value={shippingAddressLine2}
                  onChange={onChange}
                  placeholder="Apartment, suite, unit, building, floor (optional)"
                  className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
                />
              </div>
            </div>
          )}

          {/* Phone Number Field */}
          <div className="relative">
            <label
              htmlFor="shippingPhone"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
            >
              Contact Phone Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Phone className="w-4 h-4 text-zinc-400" />
              </div>
              <input
                id="shippingPhone"
                type="tel"
                name="shippingPhone"
                value={shippingPhone}
                onChange={onChange}
                placeholder="Phone number (with country code)"
                required
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* Alternative Phone Field (Optional) */}
          <div className="relative">
            <label
              htmlFor="shippingPhone2"
              className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 ml-1"
            >
              Alternative Phone Number (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Phone className="w-4 h-4 text-zinc-400" />
              </div>
              <input
                id="shippingPhone2"
                type="tel"
                name="shippingPhone2"
                value={shippingPhone2}
                onChange={onChange}
                placeholder="Secondary phone number (optional)"
                className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors shadow-sm placeholder:text-zinc-400"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
