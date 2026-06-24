import { MetadataRoute } from 'next';
import { DEFAULT_APP_URL } from '@/shared/platform/brand';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/superadmin/', '/api/', '/cart/'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
