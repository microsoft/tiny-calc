// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@rushstack/eslint-config/patch/modern-module-resolution');

module.exports = {
    extends: ["@rushstack/eslint-config"],
    overrides: [{
        // Declare an override that applies to TypeScript files only
        files: ['*.ts', '*.tsx'],
        rules: {
            // RATIONALE: Not concerned about readability for non-TypeScript developers.  (Harmless)
            '@typescript-eslint/no-parameter-properties': 'off',

            // RATIONALE: Underscore prefixes are not common practice for TS/JS devs, but we allow them when
            //            needed to prevent collisions between public/private accessors.
            // Docs: https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/naming-convention.md
            '@typescript-eslint/naming-convention': [
                'error',
                { selector: 'accessor', modifiers: ['private'], format: ['camelCase'], "leadingUnderscore": "allow" },
            ],

            // RATIONAL: Requiring explicit typing for module exports helps prevent unintentionally leaking
            //           implementation details, but still allow the convenience of type inference for internal
            //           declarations.
            '@typescript-eslint/explicit-module-boundary-types': 'error',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/typedef': 'off',
        }
    }]
};
