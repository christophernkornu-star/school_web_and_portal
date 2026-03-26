const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false, // Changed to false to prevent blue screen/stale shell
  reloadOnOnline: false, // Changed to false to prevent wiping forms on network stutter
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    skipWaiting: true, // Force new SW to activate immediately
    clientsClaim: true, // Take control of clients immediately
    exclude: [
      /\.html$/,
      /_next\/static\/chunks\/pages\/.*\.js$/,
      /middleware-manifest\.json$/,
      /_next\/static\/.*(?<!\.js)$/,
      /build-manifest\.json$/,
      /react-loadable-manifest\.json$/
    ],
    runtimeCaching: [
      {
        urlPattern: /_next\/static\/.*/i,
        handler: "NetworkFirst", // Ensure we get fresh chunks
        options: {
          cacheName: "next-static-js-assets-v3", // Bump version
          expiration: {
            maxEntries: 40,
            maxAgeSeconds: 24 * 60 * 60,
          },
          networkTimeoutSeconds: 10,
        },
      },
      {
         // Supabase API
        urlPattern: /^https:\/\/okfawhokrtkaibhbcjdk\.supabase\.co\/rest\/v1\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "supabase-api-cache-v3", // Bump version
          expiration: {
            maxEntries: 15,
            maxAgeSeconds: 60 * 5,
          },
          networkTimeoutSeconds: 5, 
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
        handler: "CacheFirst",
        options: {
          cacheName: "google-fonts-v3",
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 365 * 24 * 60 * 60, 
          },
        },
      },
      {
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "static-font-assets-v3",
          expiration: {
            maxEntries: 4,
            maxAgeSeconds: 7 * 24 * 60 * 60, 
          },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "static-image-assets-v3",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60, 
          },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: /\/_next\/image\?url=.+$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "next-image-v3",
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 24 * 60 * 60, 
          },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: /\.(?:mp3|wav|m4a)$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "static-audio-assets-v3",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, 
          },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: /\.(?:mp4|webm)$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "static-video-assets-v3",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, 
          },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: /\.(?:js)$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "static-js-assets-v3",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, 
          },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: /\.(?:css|less)$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "static-style-assets-v3",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, 
          },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: /\/_next\/data\/.+\/.+\.json$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "next-data-v3",
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 24 * 60 * 60, 
          },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: /\/api\/.*$/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "apis-v3",
          expiration: {
            maxEntries: 16,
            maxAgeSeconds: 24 * 60 * 60, 
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  experimental: {
    scrollRestoration: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'okfawhokrtkaibhbcjdk.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.graphic.com.gh',
      },
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.imgur.com',
      },
      {
        protocol: 'https',
        hostname: '**.cloudinary.com',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = withPWA(nextConfig);

// Force restart

