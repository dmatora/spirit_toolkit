const {
  getPrayerEnvCacheKey,
  getPrayerEnvPath,
  loadPrayerEnv,
} = require('./babel.env');

module.exports = function (api) {
  api.cache.using(
    () =>
      `${getPrayerEnvCacheKey()}|${process.env.APP_ENV ?? ''}|${
        process.env.BABEL_ENV ?? ''
      }|${process.env.NODE_ENV ?? ''}`
  );
  loadPrayerEnv();

  return {
    presets: ['module:@react-native/babel-preset'],
    plugins: [
      [
        'module:react-native-dotenv',
        {
          moduleName: '@env',
          path: getPrayerEnvPath(),
          safe: false,
          allowUndefined: true,
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
