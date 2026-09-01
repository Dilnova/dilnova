import { SocialProductPayload, SocialShareLinks } from "../types";

interface GenerateLinksParams {
  product: SocialProductPayload;
  currency?: string;
  storeUrl?: string;
  brandName?: string | null;
}

/**
 * Generates ready-to-use 1-Click web share links for WhatsApp, Facebook, Telegram, Twitter, and Instagram.
 */
export function generateSocialShareUrls({
  product,
  currency = "LKR",
  storeUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dilnova.com",
  brandName = "Dilnova Store",
}: GenerateLinksParams): SocialShareLinks {
  const cleanStoreUrl = storeUrl.replace(/\/+$/, "");
  const productUrl = `${cleanStoreUrl}/products/${product.id}`;
  const formattedPrice = `${currency.toUpperCase()} ${(product.price / 100).toFixed(2)}`;

  // Formatted WhatsApp message for Status & Chats
  const whatsappMessage = [
    `🛍️ *${product.name}*`,
    `💵 Price: *${formattedPrice}*`,
    product.description ? `\n_${product.description.slice(0, 250)}_` : "",
    `\n🛒 *Order Online Directly:*`,
    productUrl,
  ]
    .filter(Boolean)
    .join("\n");

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  // Facebook Web Share Dialog
  const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    productUrl,
  )}&quote=${encodeURIComponent(`Check out ${product.name} on ${brandName || "Dilnova"}: ${formattedPrice}`)}`;

  // Telegram Share Link
  const telegramMessage = `🛍️ ${product.name} - ${formattedPrice}\nOrder here:`;
  const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(
    productUrl,
  )}&text=${encodeURIComponent(telegramMessage)}`;

  // Twitter / X Share Intent
  const twitterText = `Check out ${product.name} for ${formattedPrice}! Order online here:`;
  const twitterShareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    twitterText,
  )}&url=${encodeURIComponent(productUrl)}`;

  // Instagram Formatted Caption for Clipboard Copy
  const instagramCaption = [
    `🛍️ ${product.name}`,
    `💵 ${formattedPrice}`,
    product.description ? `\n${product.description}` : "",
    `\n🔗 Tap the link in bio or visit: ${productUrl}`,
    `\n#${(brandName || "shop").toLowerCase().replace(/[^a-z0-9]/g, "")} #onlineshop #ecommerce #buynow`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    whatsappUrl,
    facebookShareUrl,
    telegramShareUrl,
    twitterShareUrl,
    instagramCaption,
    productUrl,
    formattedPrice,
  };
}
