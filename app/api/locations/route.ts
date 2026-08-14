import { NextResponse } from "next/server";
import { Country as CscCountry, State as CscState, City as CscCity } from "country-state-city";

interface RestCountryItem {
  cca2?: string;
  name?: { common?: string; official?: string };
  idd?: { root?: string; suffixes?: string[] };
  flag?: string;
}

interface IsoCountryItem {
  Iso2?: string;
  iso2?: string;
  name?: string;
  country?: string;
}

interface StateItem {
  name?: string;
  state_code?: string;
}

interface ParsedCountry {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
}

interface ParsedState {
  name: string;
  code?: string;
}

/**
 * Helper to sanitize user-provided values before logging to prevent format string injection and log injection.
 */
function sanitizeLogValue(val: string | null): string {
  if (!val) return "";
  return val.replace(/[\r\n\t]/g, " ").slice(0, 100);
}

/**
 * 100% Pure Dynamic Server API Route Handler using `country-state-city` with external API fallbacks.
 *
 * Handles Countries, States, Districts, Cities, and Reverse Geocoding via Server Proxy.
 * Eliminates client-side CORS and User-Agent blocking errors. Zero hardcoded static location records.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const country = searchParams.get("country");
  const state = searchParams.get("state");
  const province = searchParams.get("province");
  const district = searchParams.get("district");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  // 1. Reverse Geocoding (GPS Lat/Lon to Address)
  if (type === "reverse-geocode" && lat && lon) {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (
      !Number.isFinite(latNum) ||
      !Number.isFinite(lonNum) ||
      latNum < -90 ||
      latNum > 90 ||
      lonNum < -180 ||
      lonNum > 180
    ) {
      return NextResponse.json({ success: false, error: "Invalid coordinates" }, { status: 400 });
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(String(latNum))}&lon=${encodeURIComponent(String(lonNum))}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "DilnovaCommerceHub/1.0 (Enterprise Ecommerce Platform)",
          },
          next: { revalidate: 3600 },
        },
      );

      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>;
        const addr = (data.address as Record<string, string>) || {};

        const detectedCountry = addr.country || "";
        const detectedState =
          addr.state || addr.state_district || addr.region || addr.province || "";
        const detectedCity =
          addr.city ||
          addr.town ||
          addr.suburb ||
          addr.village ||
          addr.municipality ||
          addr.county ||
          "";
        const road = addr.road || addr.pedestrian || addr.suburb || "";
        const houseNo = addr.house_number || addr.building || "";
        const postcode = addr.postcode || "";

        const streetAddress = [houseNo, road].filter(Boolean).join(", ");

        return NextResponse.json({
          success: true,
          data: {
            country: detectedCountry,
            state: detectedState,
            city: detectedCity,
            streetAddress,
            postcode,
          },
        });
      }
    } catch (err) {
      console.error("[ServerLocationProxy] Reverse geocode failed", {
        lat: sanitizeLogValue(lat),
        lon: sanitizeLogValue(lon),
        error: err,
      });
    }

    return NextResponse.json(
      { success: false, error: "Reverse geocoding failed" },
      { status: 500 },
    );
  }

  // 2. IP-based Fallback Geocoding (if browser GPS permission is denied)
  if (type === "ip-location") {
    try {
      const rawIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
      const isSafeIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(rawIp) && rawIp !== "127.0.0.1";
      const isSafeIpv6 = /^[0-9a-fA-F:]{3,39}$/.test(rawIp) && rawIp !== "::1";
      const safeIp = isSafeIpv4 || isSafeIpv6 ? rawIp : "";

      const url = safeIp
        ? `https://ipapi.co/${encodeURIComponent(safeIp)}/json/`
        : `https://ipapi.co/json/`;

      const res = await fetch(url, {
        headers: { "User-Agent": "DilnovaCommerceHub/1.0" },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = (await res.json()) as Record<string, string>;
        if (data && !data.error) {
          return NextResponse.json({
            success: true,
            data: {
              country: data.country_name || data.country || "",
              state: data.region || "",
              city: data.city || "",
              postcode: data.postal || data.zip || "",
              streetAddress: "",
            },
          });
        }
      }
    } catch (err) {
      console.error("[ServerLocationProxy] IP location failed", { error: err });
    }

    return NextResponse.json({ success: false, error: "IP location failed" }, { status: 500 });
  }

  // 3. Fetch 250+ Countries (Primary: country-state-city dataset)
  if (type === "countries" || !type) {
    try {
      const cscCountries = CscCountry.getAllCountries();
      if (Array.isArray(cscCountries) && cscCountries.length > 0) {
        const parsed: ParsedCountry[] = cscCountries
          .map((item) => {
            const rawPhone = item.phonecode || "";
            const dialCode = rawPhone ? (rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`) : "";
            return {
              code: item.isoCode || "",
              name: item.name || "",
              flag: item.flag || getEmojiFlag(item.isoCode || ""),
              dialCode,
            };
          })
          .filter((c) => Boolean(c.name && c.code))
          .sort((a, b) => a.name.localeCompare(b.name));

        if (parsed.length > 0) {
          return NextResponse.json({ success: true, data: parsed });
        }
      }
    } catch (err) {
      console.warn("[ServerLocationProxy] CSC Countries lookup notice", { error: err });
    }

    // Fallback 1: REST Countries API
    try {
      const res = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag", {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const data = (await res.json()) as RestCountryItem[];
        if (Array.isArray(data)) {
          const parsed: ParsedCountry[] = data
            .map((item) => {
              const root = item.idd?.root || "";
              const suffix = item.idd?.suffixes?.[0] || "";
              const dialCode = root ? `${root}${suffix}` : "";
              return {
                code: item.cca2 || "",
                name: item.name?.common || item.name?.official || "",
                flag: item.flag || getEmojiFlag(item.cca2 || ""),
                dialCode,
              };
            })
            .filter((c) => Boolean(c.name && c.code))
            .sort((a, b) => a.name.localeCompare(b.name));

          if (parsed.length > 0) {
            return NextResponse.json({ success: true, data: parsed });
          }
        }
      }
    } catch (err) {
      console.warn("[ServerLocationProxy] Primary REST Countries fetch failed", { error: err });
    }

    // Fallback 2: CountriesNow ISO API
    try {
      const res2 = await fetch("https://countriesnow.space/api/v0.1/countries/iso", {
        next: { revalidate: 86400 },
      });
      if (res2.ok) {
        const data2 = (await res2.json()) as { data?: IsoCountryItem[] };
        if (data2?.data && Array.isArray(data2.data)) {
          const parsed2: ParsedCountry[] = data2.data
            .map((item) => {
              const code = item.Iso2 || item.iso2 || "";
              return {
                code,
                name: item.name || item.country || "",
                flag: getEmojiFlag(code),
                dialCode: "",
              };
            })
            .filter((c) => Boolean(c.name && c.code))
            .sort((a, b) => a.name.localeCompare(b.name));

          return NextResponse.json({ success: true, data: parsed2 });
        }
      }
    } catch (err2) {
      console.error("[ServerLocationProxy] Secondary countries fetch failed", { error: err2 });
    }

    return NextResponse.json({ success: false, data: [] });
  }

  // 4a. Fetch Districts / Sub-regions dynamically (Only for 3-tier countries)
  if (type === "districts" && country) {
    const cleanCountryStr = country.trim();
    const cleanProvinceKey = (province || state || "")
      .trim()
      .toLowerCase()
      .replace(/\s+province$/i, "");

    const foundCountry = CscCountry.getAllCountries().find(
      (c) =>
        c.name.toLowerCase() === cleanCountryStr.toLowerCase() ||
        c.isoCode.toLowerCase() === cleanCountryStr.toLowerCase(),
    );

    if (foundCountry) {
      const cscStates = CscState.getStatesOfCountry(foundCountry.isoCode);
      if (Array.isArray(cscStates) && cscStates.length > 0) {
        // Filter sub-district items dynamically from CSC dataset
        const districtsOnly = cscStates.filter(
          (s) =>
            (s.name.toLowerCase().includes("district") &&
              !s.name.toLowerCase().includes("columbia")) ||
            s.name.toLowerCase().includes("county"),
        );

        if (districtsOnly.length > 0) {
          let districtsList = districtsOnly;
          if (cleanProvinceKey) {
            const matched = districtsOnly.filter((s) =>
              s.name.toLowerCase().includes(cleanProvinceKey),
            );
            if (matched.length > 0) districtsList = matched;
          }

          const parsed: ParsedState[] = districtsList
            .map((s) => ({ name: s.name, code: s.isoCode }))
            .filter((s) => Boolean(s.name))
            .sort((a, b) => a.name.localeCompare(b.name));

          return NextResponse.json({ success: true, data: parsed });
        }
      }
    }

    return NextResponse.json({ success: true, data: [] });
  }

  // 4b. Fetch States / Provinces for a Country dynamically
  if (type === "states" && country) {
    const cleanCountryStr = country.trim();

    const foundCountry = CscCountry.getAllCountries().find(
      (c) =>
        c.name.toLowerCase() === cleanCountryStr.toLowerCase() ||
        c.isoCode.toLowerCase() === cleanCountryStr.toLowerCase(),
    );

    let states: ParsedState[] = [];

    if (foundCountry) {
      const cscStates = CscState.getStatesOfCountry(foundCountry.isoCode);
      if (Array.isArray(cscStates) && cscStates.length > 0) {
        // If dataset contains explicit "Province" entries (like Sri Lanka), filter states to Provinces ONLY
        const provinceOnly = cscStates.filter((s) => s.name.toLowerCase().includes("province"));
        const targetList = provinceOnly.length > 0 ? provinceOnly : cscStates;

        states = targetList
          .map((s) => ({ name: s.name, code: s.isoCode }))
          .filter((s) => Boolean(s.name));
      }
    }

    if (states.length > 0) {
      states.sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json({ success: true, data: states });
    }

    // Fallback: countriesnow.space States API
    try {
      const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: cleanCountryStr }),
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const data = (await res.json()) as { data?: { states?: (string | StateItem)[] } };
        if (data?.data?.states && Array.isArray(data.data.states)) {
          const fetchedStates: ParsedState[] = data.data.states
            .map((s) => ({
              name: typeof s === "string" ? s : s.name || "",
              code: typeof s === "object" ? s.state_code : undefined,
            }))
            .filter((s) => Boolean(s.name))
            .sort((a, b) => a.name.localeCompare(b.name));

          return NextResponse.json({ success: true, data: fetchedStates });
        }
      }
    } catch (err) {
      console.error("[ServerLocationProxy] Live states fetch failed", {
        country: sanitizeLogValue(country),
        error: err,
      });
    }

    return NextResponse.json({ success: true, data: [] });
  }

  // 5. Fetch Cities for a Country & District/State dynamically
  if (type === "cities" && country) {
    const cleanCountryStr = country.trim();
    const rawSubRegionStr = (district || state || province || "").trim();
    const cleanSubRegionStr = rawSubRegionStr.replace(/\s+district$/i, "").trim();

    const foundCountry = CscCountry.getAllCountries().find(
      (c) =>
        c.name.toLowerCase() === cleanCountryStr.toLowerCase() ||
        c.isoCode.toLowerCase() === cleanCountryStr.toLowerCase(),
    );

    let cscCities: string[] = [];

    // Primary lookup via country-state-city
    if (foundCountry) {
      if (cleanSubRegionStr) {
        const cscStates = CscState.getStatesOfCountry(foundCountry.isoCode);
        const foundState = cscStates.find(
          (s) =>
            s.name.toLowerCase() === cleanSubRegionStr.toLowerCase() ||
            s.name.replace(/\s+district$/i, "").toLowerCase() === cleanSubRegionStr.toLowerCase() ||
            s.isoCode.toLowerCase() === cleanSubRegionStr.toLowerCase(),
        );

        if (foundState) {
          const citiesObj = CscCity.getCitiesOfState(foundCountry.isoCode, foundState.isoCode);
          if (Array.isArray(citiesObj)) {
            cscCities = citiesObj.map((c) => c.name).filter(Boolean);
          }
        }
      } else {
        const citiesObj = CscCity.getCitiesOfCountry(foundCountry.isoCode);
        if (Array.isArray(citiesObj)) {
          cscCities = citiesObj.map((c) => c.name).filter(Boolean);
        }
      }
    }

    // OpenStreetMap Nominatim Suburbs, Towns & Cities Search dynamically
    if (rawSubRegionStr) {
      try {
        const [suburbsRes, townsRes, citiesRes] = await Promise.all([
          fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`suburbs in ${cleanSubRegionStr}, ${cleanCountryStr}`)}&format=json&limit=100`,
            {
              headers: {
                "Accept-Language": "en",
                "User-Agent": "DilnovaCommerceHub/1.0 (Enterprise Ecommerce Platform)",
              },
              next: { revalidate: 86400 },
            },
          ),
          fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`towns in ${cleanSubRegionStr}, ${cleanCountryStr}`)}&format=json&limit=100`,
            {
              headers: {
                "Accept-Language": "en",
                "User-Agent": "DilnovaCommerceHub/1.0 (Enterprise Ecommerce Platform)",
              },
              next: { revalidate: 86400 },
            },
          ),
          fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`cities in ${cleanSubRegionStr}, ${cleanCountryStr}`)}&format=json&limit=100`,
            {
              headers: {
                "Accept-Language": "en",
                "User-Agent": "DilnovaCommerceHub/1.0 (Enterprise Ecommerce Platform)",
              },
              next: { revalidate: 86400 },
            },
          ),
        ]);

        const rawList: Array<{ name?: string }> = [];
        if (suburbsRes.ok) {
          const d0 = (await suburbsRes.json()) as Array<{ name?: string }>;
          if (Array.isArray(d0)) rawList.push(...d0);
        }
        if (townsRes.ok) {
          const d1 = (await townsRes.json()) as Array<{ name?: string }>;
          if (Array.isArray(d1)) rawList.push(...d1);
        }
        if (citiesRes.ok) {
          const d2 = (await citiesRes.json()) as Array<{ name?: string }>;
          if (Array.isArray(d2)) rawList.push(...d2);
        }

        if (rawList.length > 0) {
          const stateLower = cleanSubRegionStr.toLowerCase();
          const countryLower = cleanCountryStr.toLowerCase();
          const osmCities = rawList
            .map((item) => item.name?.trim())
            .filter((name): name is string =>
              Boolean(
                name &&
                name.length > 1 &&
                name.toLowerCase() !== stateLower &&
                name.toLowerCase() !== countryLower &&
                !name.toLowerCase().endsWith("province") &&
                !name.toLowerCase().endsWith("district"),
              ),
            );

          const merged = Array.from(new Set([...cscCities, ...osmCities])).sort((a, b) =>
            a.localeCompare(b),
          );

          if (merged.length > 0) {
            return NextResponse.json({ success: true, data: merged });
          }
        }
      } catch (err) {
        console.error("[ServerLocationProxy] Nominatim district/province cities fetch failed", err);
      }
    }

    if (cscCities.length > 0) {
      const sortedCities = Array.from(new Set(cscCities)).sort((a, b) => a.localeCompare(b));
      return NextResponse.json({ success: true, data: sortedCities });
    }

    // countriesnow.space State Cities API
    if (rawSubRegionStr) {
      try {
        const res = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ country: cleanCountryStr, state: cleanSubRegionStr }),
          next: { revalidate: 86400 },
        });

        if (res.ok) {
          const data = (await res.json()) as { data?: string[] };
          if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
            const cities = data.data
              .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
              .sort((a, b) => a.localeCompare(b));

            return NextResponse.json({ success: true, data: cities });
          }
        }
      } catch (err) {
        console.error("[ServerLocationProxy] Live state cities fetch failed", {
          state: sanitizeLogValue(state),
          country: sanitizeLogValue(country),
          error: err,
        });
      }
    }

    // Fallback to Country-level Live Cities API if state cities returned empty
    try {
      const res = await fetch("https://countriesnow.space/api/v0.1/countries/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: cleanCountryStr }),
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const data = (await res.json()) as { data?: string[] };
        if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
          const cities = data.data
            .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
            .sort((a, b) => a.localeCompare(b));

          return NextResponse.json({ success: true, data: cities });
        }
      }
    } catch (err) {
      console.error("[ServerLocationProxy] Live country cities fetch failed", {
        country: sanitizeLogValue(country),
        error: err,
      });
    }

    // Fallback: OpenStreetMap Nominatim Live Settlement Cities API
    try {
      const nomRes = await fetch(
        `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(cleanCountryStr)}&featuretype=settlement&format=json&limit=100`,
        {
          headers: {
            "Accept-Language": "en",
            "User-Agent": "DilnovaCommerceHub/1.0 (Enterprise Ecommerce Platform)",
          },
          next: { revalidate: 86400 },
        },
      );

      if (nomRes.ok) {
        const nomData = (await nomRes.json()) as Array<{ name?: string }>;
        if (Array.isArray(nomData) && nomData.length > 0) {
          const nomCities = Array.from(
            new Set(
              nomData
                .map((item) => item.name?.trim())
                .filter((name): name is string => Boolean(name && name.length > 1)),
            ),
          ).sort((a, b) => a.localeCompare(b));

          if (nomCities.length > 0) {
            return NextResponse.json({ success: true, data: nomCities });
          }
        }
      }
    } catch (err) {
      console.error("[ServerLocationProxy] Nominatim cities fetch failed", err);
    }

    return NextResponse.json({ success: false, data: [] });
  }

  return NextResponse.json({ success: false, error: "Invalid location request" }, { status: 400 });
}

function getEmojiFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🌐";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
