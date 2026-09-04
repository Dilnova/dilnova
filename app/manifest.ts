import type { MetadataRoute } from "next";
import { headers } from "next/headers";

/**
 * Dynamic Web App Manifest
 *
 * Returns domain-specific PWA metadata:
 * - dilstar.pp.ua → "Dilstar" branding
 * - dilnova.pp.ua → "Dilnova Commerce Hub" branding
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let host = "";
  try {
    const headersList = await headers();
    host = headersList.get("x-forwarded-host") || headersList.get("host") || "";
  } catch {
    // headers() may not be available during static build
  }

  const isDilstar = host.includes("dilstar.pp.ua");

  return {
    name: isDilstar ? "Dilstar" : "Dilnova Commerce Hub",
    short_name: isDilstar ? "Dilstar" : "Dilnova",
    description: isDilstar
      ? "Hardware, Nursery, Tech Shop & Services in Ambalantota, Sri Lanka"
      : "Enterprise multi-vendor commerce hub and curated marketplace",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    theme_color: isDilstar ? "#04060a" : "#ffffff",
    background_color: isDilstar ? "#04060a" : "#ffffff",
    display: "standalone",
  };
}
