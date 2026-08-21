import { MetadataRoute } from "next";
import { headers } from "next/headers";
import { DEFAULT_APP_URL } from "@/shared/platform/brand";

export default async function robots(): Promise<MetadataRoute.Robots> {
  let host = "";
  try {
    const headersList = await headers();
    host = headersList.get("x-forwarded-host") || headersList.get("host") || "";
  } catch {
    // headers() might not be available during static build export
  }

  const isDilstar = host.includes("dilstar.pp.ua");
  const protocol = host.includes("localhost") ? "http" : "https";
  const baseUrl = host
    ? `${protocol}://${host}`
    : isDilstar
      ? "https://www.dilstar.pp.ua"
      : process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/superadmin/",
          "/vendor/",
          "/customer/",
          "/pos/",
          "/api/",
          "/cart/",
          "/checkout/",
          "/account/",
        ],
      },
      {
        userAgent: [
          "GPTBot",
          "ChatGPT-User",
          "CCBot",
          "ClaudeBot",
          "Claude-Web",
          "Bytespider",
          "anthropic-ai",
          "Google-Extended",
          "PerplexBot",
          "Amazonbot",
          "FacebookBot",
        ],
        disallow: ["/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
