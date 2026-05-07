const { withNx } = require('@nx/next');
const path = require('path');

const withPWA = require('@ducanh2912/next-pwa').default({
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  dynamicStartUrl: false,
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-webfonts',
          expiration: {
            maxEntries: 8,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-stylesheets',
          expiration: {
            maxEntries: 8,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: /\/_next\/static\/.*\.js$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'next-static-js-assets',
          expiration: {
            maxEntries: 96,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [200],
          },
        },
      },
      {
        urlPattern: /\.(?:js)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-js-assets',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [200],
          },
        },
      },
      {
        urlPattern: /\.(?:css|less)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-style-assets',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 30 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [200],
          },
        },
      },
      {
        urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-font-assets',
          expiration: {
            maxEntries: 32,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [0, 200],
          },
        },
      },
      {
        urlPattern: ({ request, sameOrigin, url }) =>
          request.method === 'GET' &&
          sameOrigin &&
          (url.pathname.startsWith('/icons/') ||
            /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i.test(url.pathname)),
        handler: 'CacheFirst',
        options: {
          cacheName: 'static-image-assets',
          expiration: {
            maxEntries: 96,
            maxAgeSeconds: 365 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [200],
          },
        },
      },
      {
        urlPattern: ({ request, sameOrigin, url }) =>
          request.method === 'GET' &&
          sameOrigin &&
          request.mode === 'navigate' &&
          !url.pathname.startsWith('/api/'),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'pages',
          matchOptions: {
            ignoreVary: true,
          },
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [200],
          },
        },
      },
      {
        urlPattern: ({ request, sameOrigin, url }) =>
          request.method === 'GET' &&
          sameOrigin &&
          request.headers.get('RSC') === '1' &&
          request.headers.get('Next-Router-Prefetch') === '1' &&
          !url.pathname.startsWith('/api/'),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'pages-rsc-prefetch',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [200],
          },
        },
      },
      {
        urlPattern: ({ request, sameOrigin, url }) =>
          request.method === 'GET' &&
          sameOrigin &&
          request.headers.get('RSC') === '1' &&
          !url.pathname.startsWith('/api/'),
        handler: 'StaleWhileRevalidate',
        options: {
          cacheName: 'pages-rsc',
          expiration: {
            maxEntries: 64,
            maxAgeSeconds: 7 * 24 * 60 * 60,
          },
          cacheableResponse: {
            statuses: [200],
          },
        },
      },
    ],
  },
});

module.exports = withNx(
  withPWA({
    nx: {
      svgr: false,
    },
    experimental: {
      externalDir: true,
    },
    webpack: (config) => {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        'react-native$': 'react-native-web',
        'react-native-vector-icons/Ionicons': path.resolve(
          __dirname,
          '../../libs/prayer-feature/src/web/Ionicons.tsx'
        ),
      };
      config.resolve.extensions = Array.from(
        new Set([
          '.web.ts',
          '.web.tsx',
          '.web.js',
          ...(config.resolve.extensions ?? []).filter(Boolean),
        ])
      );
      return config;
    },
    // Ensure packages that might ship modern syntax are transpiled
    transpilePackages: [
      'react-native',
      'react-native-safe-area-context',
      'react-native-vector-icons',
      'react-native-svg',
      '@spirit/prayer-feature',
      '@spirit/dashboard-feature',
    ],
  })
);
