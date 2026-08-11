import { NextResponse } from "next/server";

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
 * 100% Pure Live Server API Route Handler
 *
 * Handles Countries, States, Cities, and Reverse Geocoding via Server Proxy.
 * Eliminates client-side CORS and User-Agent blocking errors.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const country = searchParams.get("country");
  const state = searchParams.get("state");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  // 1. Reverse Geocoding (GPS Lat/Lon to Address)
  if (type === "reverse-geocode" && lat && lon) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`,
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
      const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0] || "";
      const url =
        clientIp && clientIp !== "127.0.0.1" && clientIp !== "::1"
          ? `http://ip-api.com/json/${encodeURIComponent(clientIp)}?fields=status,country,regionName,city,zip`
          : `http://ip-api.com/json/?fields=status,country,regionName,city,zip`;

      const res = await fetch(url, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = (await res.json()) as Record<string, string>;
        if (data?.status === "success") {
          return NextResponse.json({
            success: true,
            data: {
              country: data.country || "",
              state: data.regionName || "",
              city: data.city || "",
              postcode: data.zip || "",
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

  // 3. Fetch 100% Live Countries
  if (type === "countries" || !type) {
    try {
      const res = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag", {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const data = (await res.json()) as RestCountryItem[];
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
    } catch (err) {
      console.warn("[ServerLocationProxy] Primary REST Countries fetch failed", { error: err });
    }

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

  // 4. Fetch 100% Live States / Provinces for a Country
  if (type === "states" && country) {
    try {
      const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: country.trim() }),
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const data = (await res.json()) as { data?: { states?: (string | StateItem)[] } };
        if (data?.data?.states && Array.isArray(data.data.states)) {
          const states: ParsedState[] = data.data.states
            .map((s) => ({
              name: typeof s === "string" ? s : s.name || "",
              code: typeof s === "object" ? s.state_code : undefined,
            }))
            .filter((s) => Boolean(s.name))
            .sort((a, b) => a.name.localeCompare(b.name));

          return NextResponse.json({ success: true, data: states });
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

  // 5. Fetch 100% Live Cities for a State
  if (type === "cities" && country && state) {
    try {
      const res = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: country.trim(), state: state.trim() }),
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const data = (await res.json()) as { data?: string[] };
        if (data?.data && Array.isArray(data.data)) {
          const cities = data.data
            .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
            .sort((a, b) => a.localeCompare(b));

          return NextResponse.json({ success: true, data: cities });
        }
      }
    } catch (err) {
      console.error("[ServerLocationProxy] Live cities fetch failed", {
        state: sanitizeLogValue(state),
        country: sanitizeLogValue(country),
        error: err,
      });
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
