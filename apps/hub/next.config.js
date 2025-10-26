const { withNx } = require('@nx/next');
const path = require('path');

module.exports = withNx({
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
  transpilePackages: ['react-native-vector-icons'],
});
