import Image from "next/image";

interface StorefrontBannerProps {
  imageUrl: string;
  altText?: string;
  className?: string;
}

/**
 * Enterprise-grade Storefront Banner component.
 * Replaces dynamic `style={{ backgroundImage: '...' }}` to support strict CSP (no 'unsafe-inline') and improves LCP via next/image.
 */
export default function StorefrontBanner({
  imageUrl,
  altText = "Storefront Banner",
  className = "",
}: StorefrontBannerProps) {
  if (!imageUrl) {
    return <div className={`bg-zinc-200 dark:bg-zinc-800 ${className}`} />;
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={imageUrl}
        alt={altText}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 100vw"
        priority
      />
    </div>
  );
}
