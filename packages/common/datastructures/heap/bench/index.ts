/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { run } from "hotloop";

const count = 256 * 256;

run([
    { "path": "./heap-push-ascending.ts", args: { count }},
    { "path": "./heap-push-descending.ts", args: { count }},
    { "path": "./heap-push-pop-ascending.ts", args: { count }},
    { "path": "./heap-push-pop-descending.ts", args: { count }},
]).catch(console.error);
