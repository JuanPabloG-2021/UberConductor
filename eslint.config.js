// https://docs.expo.dev/guides/using-eslint/
// AI-assisted: see docs/AI_LOG.md #2.
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
