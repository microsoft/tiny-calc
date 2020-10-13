/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { coalesce, done } from "../../src";
import { benchmarkAsync } from "hotloop";

let complete: { resolve: () => void };

const fn = coalesce(
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (callback) => { done.then(callback); },
    () => { complete.resolve(); },
);

benchmarkAsync(`coalesce (async void)`, (deferred) => {
    complete = deferred;
    fn();
});
