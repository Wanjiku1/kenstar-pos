import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',            // Allow them to see your main landing page
      disallow: '/terminal', // HIDE the staff login and clock-in page
    },
    sitemap: 'https://kenstarops.vercel.app/sitemap.xml', // Change to your actual domain
  }
}