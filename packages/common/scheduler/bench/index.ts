/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { run } from "hotloop";

run([
    { "path": "./coalesce/prompt.ts" },
    { "path": "./coalesce/async.ts" },
    { "path": "./coalesce/promise-void.ts" },
    { "path": "./coalesce/promise-number.ts" },
]).catch(console.error);
