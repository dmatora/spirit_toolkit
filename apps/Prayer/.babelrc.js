module.exports = function (api) {
  api.cache(true);

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
          path: '../../.env',
        },
      ],
    ],
  };
};
