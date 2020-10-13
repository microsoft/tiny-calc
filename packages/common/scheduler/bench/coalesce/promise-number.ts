/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { coalesce, done } from "../../src";
import { benchmarkPromise } from "hotloop";

let counter = 0;

const fn: () => Promise<number> = coalesce(
    (callback) => done.then(callback),
    () => counter++,
);

benchmarkPromise(`coalesce (Promise<number>)`, async () => {
    await fn();
});
