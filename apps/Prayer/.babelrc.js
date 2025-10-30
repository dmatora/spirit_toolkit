module.exports = function (api) {
  api.cache(true);

  const nxTarget = process.env.NX_TASK_TARGET_TARGET || '';

  if (nxTarget === 'build' || nxTarget.includes('storybook')) {
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
      ['module:metro-react-native-babel-preset', { useTransformReactJSX: true }],
    ],
  };
};
