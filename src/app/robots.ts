import type { MetadataRoute } from 'next';

import { SITE_URL } from './site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    // Everything is allowed: Google renders the page and needs the data files to see the map.
    rules: [{ userAgent: '*', allow: '/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
