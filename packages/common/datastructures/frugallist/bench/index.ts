/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { run } from "hotloop";

// eslint-disable-next-line no-void
void (async () => {
    let count = 0;
    console.group(`ConsumerSet (length=${count})`)
    await run([
        { "path": "./foreach-array.ts", args: { count }},
        { "path": "./foreach-frugallist.ts", args: { count }},
        { "path": "./foreach-twofield.ts", args: { count }},
    ]);
    console.groupEnd();

    count = 1;
    console.group(`ConsumerSet (length=${count})`)
    await run([
        { "path": "./foreach-array.ts", args: { count }},
        { "path": "./foreach-frugallist.ts", args: { count }},
        { "path": "./foreach-twofield.ts", args: { count }},
    ]);
    console.groupEnd();

    count = 2;
    console.group(`ConsumerSet (length=${count})`)
    await run([
        { "path": "./foreach-array.ts", args: { count }},
        { "path": "./foreach-frugallist.ts", args: { count }},
        { "path": "./foreach-twofield.ts", args: { count }},
    ]);
    console.groupEnd();
})();
