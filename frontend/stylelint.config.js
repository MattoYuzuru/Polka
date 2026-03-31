module.exports = {
  extends: ['stylelint-config-standard-scss'],
  ignoreFiles: ['dist/**/*', 'coverage/**/*'],
  rules: {
    'alpha-value-notation': null,
    'color-function-alias-notation': null,
    'color-function-notation': null,
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'font-family-name-quotes': null,
    'media-feature-range-notation': null,
  },
};
