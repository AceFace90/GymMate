// eslint-config-expo bundles the React, React-Hooks and React-Native rule sets
// and the correct parser for JSX. Legacy .eslintrc format (ESLint 8).
module.exports = {
  root: true,
  extends: 'expo',
  ignorePatterns: ['dist/', 'web-build/', 'node_modules/', 'coverage/'],
  env: {
    // Node covers config files (__dirname); browser covers localStorage/
    // document/timers used by the web build and React Native's own globals.
    node: true,
    browser: true,
    jest: true,
  },
};
