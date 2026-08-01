// ESLint flat config — Expo SDK 54.
//
// `future/` is deliberately excluded: it holds the parked paywall screen, which
// imports react-native-iap. That dependency was removed from package.json for the
// free-only release, so the file cannot lint until the paid tier is restored.
// Metro never bundles it (nothing under app/ imports it).
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'future/**',
      'android/**',
      'ios/**',
    ],
  },
  {
    rules: {
      // Both of the following are DOM-oriented rules that eslint-config-expo
      // inherits from the shared React config. This app renders through React
      // Native, never through the DOM.
      //
      // react/no-unescaped-entities guards against apostrophes and quotes being
      // ambiguous in HTML. React Native <Text> has no HTML parsing, so a literal
      // apostrophe in JSX text is correct and rewriting it to &apos; would only
      // make the source harder to read.
      'react/no-unescaped-entities': 'off',
      // react/display-name fires on the inline `tabBarIcon: ({color}) => <Icon/>`
      // render callbacks in app/(tabs)/_layout.tsx. Those are render props, not
      // component definitions, and naming them changes nothing at runtime.
      'react/display-name': 'off',
    },
  },
];
