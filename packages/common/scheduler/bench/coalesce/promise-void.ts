/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { coalesce, done } from "../../src";
import { benchmarkPromise } from "hotloop";

const fn = coalesce(
    (callback) => done.then(callback),
    () => { },
);

benchmarkPromise(`coalesce (Promise<void>)`, fn);
