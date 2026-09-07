/**
 * `jsxImportSource: 'nativewind'` is what makes `className` a real prop on
 * RN components; without it every className silently does nothing.
 *
 * The Reanimated plugin must stay last — it rewrites worklet functions and
 * expects to see the output of every other transform. In Reanimated 4 this
 * entry point re-exports the react-native-worklets plugin.
 */
module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: ['react-native-reanimated/plugin'],
  };
};
