// This is a workaround for https://github.com/eslint/eslint/issues/3458
require('@rushstack/eslint-config/patch/modern-module-resolution');

module.exports = {
    extends: ["@rushstack/eslint-config"],
    "plugins": ["header"],
    "rules": {
        "header/header": [2, "block", "!\n * Copyright (c) Microsoft Corporation. All rights reserved.\n * Licensed under the MIT License.\n "]
    },
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

            // RATIONALE: Allow the convenience of type inference for internal declarations, but require explicit
            //            typing for module exports to prevent unintentionally leaking implementation details.
            '@typescript-eslint/explicit-module-boundary-types': 'error',
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/typedef': 'off',
        }
    }]
};
