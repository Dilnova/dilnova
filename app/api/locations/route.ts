import { NextResponse } from "next/server";

/**
 * 100% Pure Live Server API Route Handler
 * ZERO static data files or hardcoded fallback lists.
 * Everything is fetched 100% live from public REST APIs on the server.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const country = searchParams.get("country");
  const state = searchParams.get("state");

  // 1. Fetch 100% Live Countries
  if (type === "countries" || !type) {
    // Try Primary Source: REST Countries API
    try {
      const res = await fetch("https://restcountries.com/v3.1/all?fields=name,cca2,idd,flag", {
        headers: { Accept: "application/json" },
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = data
          .map((item: any) => {
            const root = item.idd?.root || "";
            const suffix = item.idd?.suffixes?.[0] || "";
            const dialCode = root ? `${root}${suffix}` : "";
            return {
              code: item.cca2 || "",
              name: item.name?.common || item.name?.official || "",
              flag: item.flag || getEmojiFlag(item.cca2),
              dialCode,
            };
          })
          .filter((c: any) => Boolean(c.name && c.code))
          .sort((a: any, b: any) => a.name.localeCompare(b.name));

        if (parsed.length > 0) {
          return NextResponse.json({ success: true, data: parsed });
        }
      }
    } catch (err) {
      console.warn(
        "[ServerLocationProxy] Primary REST Countries fetch failed, trying secondary live source...",
        err,
      );
    }

    // Try Secondary Source: CountriesNow ISO API
    try {
      const res2 = await fetch("https://countriesnow.space/api/v0.1/countries/iso", {
        next: { revalidate: 86400 },
      });
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2?.data && Array.isArray(data2.data)) {
          const parsed2 = data2.data
            .map((item: any) => ({
              code: item.Iso2 || item.iso2 || "",
              name: item.name || item.country || "",
              flag: getEmojiFlag(item.Iso2 || item.iso2),
              dialCode: "",
            }))
            .filter((c: any) => Boolean(c.name && c.code))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

          return NextResponse.json({ success: true, data: parsed2 });
        }
      }
    } catch (err2) {
      console.error("[ServerLocationProxy] Secondary live countries fetch failed", err2);
    }

    return NextResponse.json({ success: false, data: [] });
  }

  // 2. Fetch 100% Live States / Provinces for a Country
  if (type === "states" && country) {
    try {
      const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: country.trim() }),
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.data?.states && Array.isArray(data.data.states)) {
          const states = data.data.states
            .map((s: any) => ({
              name: typeof s === "string" ? s : s.name,
              code: typeof s === "object" ? s.state_code : undefined,
            }))
            .filter((s: any) => Boolean(s.name))
            .sort((a: any, b: any) => a.name.localeCompare(b.name));

          return NextResponse.json({ success: true, data: states });
        }
      }
    } catch (err) {
      console.error(`[ServerLocationProxy] Live states fetch failed for ${country}`, err);
    }

    return NextResponse.json({ success: true, data: [] });
  }

  // 3. Fetch 100% Live Cities for a State
  if (type === "cities" && country && state) {
    try {
      const res = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: country.trim(), state: state.trim() }),
        next: { revalidate: 86400 },
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.data && Array.isArray(data.data)) {
          const cities = data.data
            .filter((c: any) => typeof c === "string" && c.trim().length > 0)
            .sort((a: string, b: string) => a.localeCompare(b));

          return NextResponse.json({ success: true, data: cities });
        }
      }
    } catch (err) {
      console.error(`[ServerLocationProxy] Live cities fetch failed for ${state}, ${country}`, err);
    }

    return NextResponse.json({ success: true, data: [] });
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
