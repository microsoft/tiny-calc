/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { run } from "hotloop";

run([
    { "path": "./handletable-get-x256.ts" },
    { "path": "./map-get-x256.ts" },
]).catch(console.error);
