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
    return config;
  },
  transpilePackages: ['react-native-vector-icons'],
});
