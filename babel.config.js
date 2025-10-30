console.log('Using root babel.config.js for Spirit Toolkit');

module.exports = {
  presets: [
    [
      'module:metro-react-native-babel-preset',
      {
        useTransformReactJSX: true,
      },
    ],
  ],
  plugins: ['react-native-reanimated/plugin'],
};
