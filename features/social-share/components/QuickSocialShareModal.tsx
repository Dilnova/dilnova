"use client";

import { useState } from "react";
import Image from "next/image";
import {
  X,
  Share2,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Send,
  Loader2,
  Sparkles,
} from "lucide-react";
import { generateSocialShareUrls } from "../services/whatsapp-share";
import { manualPublishProductAction } from "../actions";
import { toast } from "sonner";

export interface ShareModalProduct {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  imageUrl?: string | null;
  currency?: string | null;
}

interface QuickSocialShareModalProps {
  product: ShareModalProduct | null;
  isOpen: boolean;
  onClose: () => void;
  brandName?: string;
}

export function QuickSocialShareModal({
  product,
  isOpen,
  onClose,
  brandName = "Dilnova Store",
}: QuickSocialShareModalProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  if (!isOpen || !product) return null;

  const links = generateSocialShareUrls({
    product: {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      imageUrl: product.imageUrl,
    },
    currency: product.currency || "LKR",
    brandName,
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(links.productUrl);
    setCopiedLink(true);
    toast.success("Direct checkout link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleFacebookShareClick = () => {
    // Copy caption to clipboard so user can immediately paste in Facebook dialog
    navigator.clipboard.writeText(
      `🛍️ ${product.name}\n💵 Price: ${links.formattedPrice}\n${product.description ? product.description + "\n" : ""}🛒 Order: ${links.productUrl}`,
    );
    toast.success("Product details copied! Paste into the post.");
  };

  const handleCopyCaption = () => {
    navigator.clipboard.writeText(links.instagramCaption);
    setCopiedCaption(true);
    toast.success("Instagram formatted caption & hashtags copied!");
    setTimeout(() => setCopiedCaption(false), 2500);
  };

  const handleDirectPagePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await manualPublishProductAction({
        productId: product.id,
        channels: ["facebook_feed"],
      });

      if (res?.data?.success) {
        toast.success("Published directly to your Facebook Page feed!");
      } else {
        toast.error(res?.serverError || "Failed to publish to Facebook Page.");
      }
    } catch {
      toast.error("Failed to publish post.");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Share & Blast Product
              </h3>
              <p className="text-[11px] text-zinc-500">
                1-Tap publishing to WhatsApp, Facebook, Instagram, and more.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Product Preview Card */}
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800">
            <div className="relative h-14 w-14 rounded-xl overflow-hidden bg-white dark:bg-zinc-800 shrink-0 border border-zinc-200/60 dark:border-zinc-700/60">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400 font-bold">
                  IMG
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {product.name}
              </h4>
              <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {links.formattedPrice}
              </p>
            </div>
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-800 transition-colors shrink-0"
            >
              {copiedLink ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copiedLink ? "Copied" : "Copy Link"}
            </button>
          </div>

          {/* Social Channels 1-Tap Grid */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono block">
              1-Tap Social Publishing
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* WhatsApp Status & Chat */}
              <a
                href={links.whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/40 dark:hover:bg-emerald-950/70 border border-emerald-200/70 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 transition-all group shadow-sm"
              >
                <div className="p-2 rounded-xl bg-emerald-500 text-white shrink-0 group-hover:scale-105 transition-transform">
                  <MessageCircle className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold flex items-center justify-between">
                    WhatsApp Share <ExternalLink className="h-3 w-3 opacity-60" />
                  </div>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                    Status, Groups & Chats
                  </p>
                </div>
              </a>

              {/* Facebook Web Share */}
              <a
                href={links.facebookShareUrl}
                target="_blank"
                rel="noreferrer"
                onClick={handleFacebookShareClick}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50 hover:bg-blue-100/80 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 border border-blue-200/70 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 transition-all group shadow-sm"
              >
                <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 group-hover:scale-105 transition-transform">
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold flex items-center justify-between">
                    Facebook Share <ExternalLink className="h-3 w-3 opacity-60" />
                  </div>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400">
                    Profile, Groups & Pages
                  </p>
                </div>
              </a>

              {/* Telegram Channel Share */}
              <a
                href={links.telegramShareUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-sky-50 hover:bg-sky-100/80 dark:bg-sky-950/40 dark:hover:bg-sky-950/70 border border-sky-200/70 dark:border-sky-800/60 text-sky-800 dark:text-sky-300 transition-all group shadow-sm"
              >
                <div className="p-2 rounded-xl bg-sky-500 text-white shrink-0 group-hover:scale-105 transition-transform">
                  <Send className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold flex items-center justify-between">
                    Telegram Share <ExternalLink className="h-3 w-3 opacity-60" />
                  </div>
                  <p className="text-[10px] text-sky-600 dark:text-sky-400">
                    Channels & Direct Messages
                  </p>
                </div>
              </a>

              {/* Instagram Caption Copy */}
              <button
                type="button"
                onClick={handleCopyCaption}
                className="flex items-center gap-2.5 p-3 rounded-2xl bg-pink-50 hover:bg-pink-100/80 dark:bg-pink-950/40 dark:hover:bg-pink-950/70 border border-pink-200/70 dark:border-pink-800/60 text-pink-800 dark:text-pink-300 transition-all group shadow-sm text-left cursor-pointer"
              >
                <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 text-white shrink-0 group-hover:scale-105 transition-transform">
                  <Copy className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold flex items-center justify-between">
                    {copiedCaption ? "Caption Copied! ✓" : "Instagram Caption"}
                  </div>
                  <p className="text-[10px] text-pink-600 dark:text-pink-400">
                    Copy caption + hashtags
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Auto-Post to Page Feed */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={handleDirectPagePublish}
              disabled={isPublishing || !product.imageUrl}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Publishing Post...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-purple-400" /> Auto-Post to Facebook Page Feed
                </>
              )}
            </button>
            {!product.imageUrl && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 block text-center mt-1.5 font-medium">
                ⚠️ Upload a product image to enable automated Facebook Page feed posting.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
