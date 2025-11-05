const { withNx } = require('@nx/next');
const path = require('path');
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
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
          '../../libs/prayer-feature/src/web/Ionicons.tsx',
        ),
      };
      config.resolve.extensions = Array.from(
        new Set([
          '.web.ts',
          '.web.tsx',
          '.web.js',
          ...((config.resolve.extensions ?? []).filter(Boolean)),
        ]),
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
  }),
);
