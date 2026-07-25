import { MetadataRoute } from "next";
import { DEFAULT_APP_URL } from "@/shared/platform/brand";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;

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
