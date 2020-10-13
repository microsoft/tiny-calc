/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import { done, coalesce } from "../src";

describe("coalesce()", () => {
    it("must coalesce repeated calls until dispatched", async () => {
        let count = 0;

        const fn: () => Promise<void> = coalesce(
            (callback) => done.then(callback),
            () => { ++count; }
        );

        assert.equal(count, 0);

        await Promise.all([fn(), fn()]);
        assert.equal(count, 1);

        await done;
        assert.equal(count, 1);
    });

    it("must return values from callback and dispatcher", async () => {
        let count = 0;

        const fn = coalesce(
            (callback) => done.then(callback),
            () => ++count
        );

        assert.deepEqual(await Promise.all([fn(), fn()]), [1, 1]);
    });

    it("must resume after exception", async () => {
        let count = 0;

        const fn = coalesce(
            (callback) => done.then(callback),
            () => {
                if (++count === 1) {
                    throw new Error();
                }

                return count;
            }
        );

        try {
            await fn();

            assert.fail("First invocation of fn() must return a rejected promise.");
        } catch {
            // do nothing
        }

        assert.equal(await fn(), 2);
    });
});
