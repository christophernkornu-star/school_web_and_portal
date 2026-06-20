import { NextResponse } from 'next/server'

export async function GET() {
  const baseUrl = 'https://bmcb.vercel.app'

  const staticPages = [
    { url: '', priority: '1.0', changefreq: 'weekly' },
    { url: '/about', priority: '0.8', changefreq: 'monthly' },
    { url: '/contact', priority: '0.7', changefreq: 'monthly' },
    { url: '/admissions', priority: '0.8', changefreq: 'monthly' },
    { url: '/academics', priority: '0.7', changefreq: 'monthly' },
    { url: '/gallery', priority: '0.6', changefreq: 'monthly' },
    { url: '/news', priority: '0.7', changefreq: 'daily' },
    { url: '/events', priority: '0.6', changefreq: 'weekly' },
    { url: '/staff', priority: '0.6', changefreq: 'monthly' },
    { url: '/login', priority: '0.3', changefreq: 'monthly' },
    { url: '/signup', priority: '0.3', changefreq: 'monthly' },
    { url: '/teacher/dashboard', priority: '0.3', changefreq: 'daily' },
    { url: '/teacher/fees', priority: '0.3', changefreq: 'daily' },
    { url: '/student/dashboard', priority: '0.3', changefreq: 'daily' },
  ]

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${staticPages
    .map(
      (page) => `<url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join('\n  ')}
</urlset>`

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}