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
      }|${process.env.NODE_ENV ?? ''}|${
        process.env.NX_TASK_TARGET_TARGET ?? ''
      }`
  );
  loadPrayerEnv();

  const nxTarget = process.env.NX_TASK_TARGET_TARGET;

  if (
    nxTarget === 'build' ||
    (typeof nxTarget === 'string' && nxTarget.includes('storybook'))
  ) {
    return {
      presets: [
        [
          '@nx/react/babel',
          {
            runtime: 'automatic',
          },
        ],
      ],
    };
  }

  return {
    presets: [
      ['module:@react-native/babel-preset', { useTransformReactJSX: true }],
    ],
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
    ],
  };
};
