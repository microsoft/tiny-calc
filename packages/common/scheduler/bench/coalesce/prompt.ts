/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { coalesce } from "../../src";
import { benchmark } from "hotloop";

const fn = coalesce(
    (callback) => callback(),
    () => {},
);

benchmark(`coalesce (prompt void)`, () => {
    fn();
});
