import { clerkClient, auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getCachedOrganizations, type CachedOrg } from '@/utils/clerkCache';
import type { Metadata } from 'next';
import ProductGalleryPlayer from './ProductGalleryPlayer';
import WishlistButton from './WishlistButton';
import ReviewsSection from './ReviewsSection';
import QASection from './QASection';
import ProductViewTracker from './ProductViewTracker';
import ProductDetailAddToCart from './ProductDetailAddToCart';
import { logger } from '@/utils/logger';
import { isVideoUrl } from '@/utils/media';
import { getSystemSetting } from '@/utils/settings';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export const revalidate = 60; // Cache for 60 seconds (ISR)

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const systemName = await getSystemSetting('system_name', 'Dilnova');

  try {
    const [result] = await db
      .select({
        product: schema.products,
      })
      .from(schema.products)
      .where(eq(schema.products.id, id))
      .limit(1);

    if (!result || !result.product) {
      return {
        title: `Product Not Found | ${systemName}`,
      };
    }

    const { product } = result;
    const formattedPrice = (product.price / 100).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });

    const title = `${product.name} | ${systemName}`;
    const description = product.description
      ? (product.description.length > 150 ? product.description.substring(0, 147) + '...' : product.description)
      : `Get ${product.name} for ${formattedPrice} from our multi-vendor catalog on ${systemName}.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        images: product.imageUrl ? [{ url: product.imageUrl }] : [],
      },
    };
  } catch {
    return {
      title: `Product Details | ${systemName}`,
    };
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;

  // 1. Fetch Product with joined Category details
  const [result] = await db
    .select({
      product: schema.products,
      category: schema.categories,
    })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(eq(schema.products.id, id))
    .limit(1);

  if (!result || !result.product) {
    notFound();
  }

  const { product, category } = result;

  // 1.5. Fetch Auth context, Reviews, Questions and Wishlist status
  const { userId, orgId: userOrgId } = await auth();

  const productReviews = await db
    .select()
    .from(schema.reviews)
    .where(eq(schema.reviews.productId, id))
    .orderBy(desc(schema.reviews.createdAt));

  const productQuestions = await db
    .select()
    .from(schema.questions)
    .where(eq(schema.questions.productId, id))
    .orderBy(desc(schema.questions.createdAt));

  let isFavorited = false;
  let userHasReviewed = false;

  if (userId) {
    const [fav] = await db
      .select()
      .from(schema.wishlists)
      .where(
        and(
          eq(schema.wishlists.userId, userId),
          eq(schema.wishlists.productId, id)
        )
      )
      .limit(1);
    isFavorited = !!fav;

    const [rev] = await db
      .select()
      .from(schema.reviews)
      .where(
        and(
          eq(schema.reviews.userId, userId),
          eq(schema.reviews.productId, id)
        )
      )
      .limit(1);
    userHasReviewed = !!rev;
  }

  // Calculate review stats
  const totalReviews = productReviews.length;
  const averageRating = totalReviews
    ? Number((productReviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
    : 0;

  // Fetch parent category if this is a subcategory
  let parentCategory = null;
  if (category?.parentId) {
    const [parentResult] = await db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.id, category.parentId))
      .limit(1);
    parentCategory = parentResult || null;
  }



  // 2. Fetch Seller Organization from Clerk (Optimized with cached lookup + fallback)
  const client = await clerkClient();
  let orgDetails: CachedOrg | null = null;

  try {
    const cachedOrgs = await getCachedOrganizations(client);
    orgDetails = cachedOrgs.find((o) => o.id === product.orgId) || null;

    // Fallback: If not in cached list, query Clerk API directly
    if (!orgDetails) {
      const org = await client.organizations.getOrganization({ organizationId: product.orgId });
      orgDetails = {
        id: org.id,
        name: org.name,
        slug: org.slug,
        imageUrl: org.imageUrl,
        publicMetadata: (org.publicMetadata as CachedOrg['publicMetadata']) || {},
      };
    }
  } catch (err) {
    logger.error('Failed to resolve seller organization details', err, { productId: product.id, orgId: product.orgId });
  }

  const vendorName = orgDetails ? orgDetails.name : 'Unknown Vendor';
  const vendorLogo = orgDetails ? orgDetails.imageUrl : null;
  const vendorSlug = orgDetails ? orgDetails.slug : null;
  const vendorMetadata = orgDetails?.publicMetadata || {};

  const formattedPrice = (product.price / 100).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });

  const mediaPayload = Array.isArray(product.media) && product.media.length > 0
    ? (product.media as { url: string; type: 'image' | 'video' }[])
    : product.imageUrl
      ? [{ url: product.imageUrl, type: isVideoUrl(product.imageUrl) ? ('video' as const) : ('image' as const) }]
      : [];

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans pb-24">
      {/* Client-side View Counter Trigger */}
      <ProductViewTracker productId={id} />
      {/* Top Breadcrumb Nav */}
      <div className="max-w-6xl mx-auto px-6 pt-8 flex items-center justify-between">
        <nav className="flex items-center gap-2 text-xs font-mono text-zinc-400">
          <Link href="/products" className="hover:text-purple-500 transition-colors">
            PRODUCTS
          </Link>
          <span>/</span>
          {category ? (
            <>
              {parentCategory && (
                <>
                  <Link href={`/products?category=${parentCategory.slug}`} className="hover:text-purple-500 uppercase transition-colors">
                    {parentCategory.name}
                  </Link>
                  <span>/</span>
                </>
              )}
              <Link href={`/products?category=${category.slug}`} className="hover:text-purple-500 uppercase transition-colors">
                {category.name}
              </Link>
              <span>/</span>
            </>
          ) : (
            <>
              <span className="uppercase">CATALOG</span>
              <span>/</span>
            </>
          )}
          <span className="text-zinc-600 dark:text-zinc-300 font-bold truncate max-w-[200px] uppercase">
            {product.name}
          </span>
        </nav>

        <Link
          href="/products"
          className="text-xs font-semibold px-3 py-1.5 rounded-md border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300 transition-all"
        >
          &larr; All Listings
        </Link>
      </div>

      {/* Main Grid Section */}
      <main className="max-w-6xl mx-auto px-6 mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white border border-zinc-200 rounded-3xl p-6 lg:p-10 dark:bg-zinc-950 dark:border-zinc-800 shadow-xl shadow-zinc-900/5 dark:shadow-none">
          
          {/* Left Column: Image Area (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <ProductGalleryPlayer media={mediaPayload} alt={product.name} type={product.type} />
          </div>

          {/* Right Column: Title, Price, Description, Vendor Info (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
            
            {/* Upper Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                {category ? (
                  <span className="text-[10px] font-mono uppercase tracking-widest text-purple-600 dark:text-purple-400 font-bold">
                    {category.name}
                  </span>
                ) : (
                  <div />
                )}
                <div className="flex items-center gap-4">
                  {totalReviews > 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold font-mono">
                      <span>★</span>
                      <span>{averageRating}</span>
                      <span className="text-zinc-400 font-normal">({totalReviews})</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-zinc-400 font-mono">Unrated</span>
                  )}

                  <div className="flex items-center gap-1 text-xs text-zinc-450 dark:text-zinc-500 font-mono" title="Total page views">
                    <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span>{product.views + 1} views</span>
                  </div>
                </div>
              </div>

              <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black font-mono text-purple-700 dark:text-purple-400">
                  {formattedPrice}
                </span>
                <span className="text-xs text-zinc-400 font-mono">USD</span>
              </div>

              <hr className="border-zinc-200 dark:border-zinc-800" />

              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-mono">
                  Description
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-350 leading-relaxed whitespace-pre-line">
                  {product.description || 'No detailed description provided by the seller.'}
                </p>
              </div>
            </div>

            {/* Vendor Owner Block */}
            <div className="bg-zinc-50 border border-zinc-200/80 rounded-2xl p-5 dark:bg-zinc-900/40 dark:border-zinc-800/80 space-y-4">
              <div className="flex items-center gap-3">
                {vendorLogo ? (
                  <Image
                    src={vendorLogo}
                    alt={vendorName}
                    width={40}
                    height={40}
                    className="rounded-xl object-cover border border-zinc-200 dark:border-zinc-800 bg-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-lg flex items-center justify-center">
                    🏢
                  </div>
                )}
                <div className="flex-1 leading-tight">
                  <span className="text-[10px] text-zinc-400 block font-mono">AUTHORIZED VENDOR</span>
                  {vendorSlug ? (
                    <Link
                      href={`/vendors/${vendorSlug}`}
                      className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                      {vendorName}
                    </Link>
                  ) : (
                    <span className="font-extrabold text-sm text-zinc-850 dark:text-zinc-200">
                      {vendorName}
                    </span>
                  )}
                </div>
              </div>

              {/* Vendor metadata phone / address */}
              {(vendorMetadata.phone || vendorMetadata.address) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 text-xs text-zinc-500 dark:text-zinc-400">
                  {vendorMetadata.address && (
                    <div>
                      <span className="text-zinc-450 block font-mono text-[10px]">Location</span>
                      <span className="font-medium text-zinc-850 dark:text-zinc-200">{vendorMetadata.address}</span>
                    </div>
                  )}
                  {vendorMetadata.phone && (
                    <div>
                      <span className="text-zinc-455 block font-mono text-[10px]">Contact</span>
                      <span className="font-medium text-zinc-850 dark:text-zinc-200">{vendorMetadata.phone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Transactional Add to Cart Section */}
              <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60">
                <ProductDetailAddToCart
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.imageUrl,
                    vendorName: vendorName,
                    type: product.type,
                  }}
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                {vendorSlug && (
                  <Link
                    href={`/vendors/${vendorSlug}`}
                    className="flex-1 text-center py-2.5 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-300 text-xs font-semibold rounded-lg shadow-sm transition-all"
                  >
                    Storefront &rarr;
                  </Link>
                )}
                
                <a
                  href={`mailto:support@dilnova.com?subject=Enquiry: ${encodeURIComponent(product.name)}`}
                  className="flex-1 text-center py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg shadow-sm shadow-purple-900/10 transition-all cursor-pointer"
                >
                  Contact Vendor
                </a>

                <WishlistButton
                  productId={product.id}
                  initialFavorited={isFavorited}
                  isLoggedIn={!!userId}
                  showLabel={true}
                  className="flex-1 sm:flex-initial"
                />
              </div>
            </div>

          </div>

        </div>

        {/* Reviews Section */}
        <ReviewsSection
          productId={product.id}
          reviews={productReviews}
          isLoggedIn={!!userId}
          userHasReviewed={userHasReviewed}
          productOrgId={product.orgId}
          userOrgId={userOrgId || null}
        />

        {/* Q&A Section */}
        <QASection
          productId={product.id}
          questions={productQuestions}
          isLoggedIn={!!userId}
          productOrgId={product.orgId}
          userOrgId={userOrgId || null}
        />
      </main>
    </div>
  );
}
