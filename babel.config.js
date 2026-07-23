/**
 * Metro has no Babel config of its own, so without this file nothing bundles: TypeScript-only syntax
 * (`export type *` in expo-modules-core) fails to parse, and expo-router never gets the plugin that
 * injects EXPO_ROUTER_APP_ROOT for its `require.context` call.
 *
 * babel-preset-expo covers both — it ships the expo-router plugin as of SDK 50, so listing the plugin
 * separately would double-apply it.
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
