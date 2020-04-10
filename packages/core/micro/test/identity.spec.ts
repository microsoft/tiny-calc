/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";

import { IdManager } from "../src/identity";

describe("Identity Manager", () => {
    
    const manager = new IdManager();
    it("should work for basic cases", () => {
        assert.deepStrictEqual(manager.getIndex(0), undefined);
        assert.deepStrictEqual(manager.getIndex(1), undefined);
        manager.update(0, 0, 100);
        assert.deepStrictEqual(manager.getIndex(100), undefined);
        assert.deepStrictEqual(manager.getIndex(50), 50);
        assert.deepStrictEqual(manager.getIndex(0), 0);
        assert.deepStrictEqual(manager.getIndex(99), 99);

        manager.update(10, 10, 10);

        assert.deepStrictEqual(manager.getIndex(10), -1);
        assert.deepStrictEqual(manager.getIndex(11), -1);
        assert.deepStrictEqual(manager.getIndex(12), -1);
        assert.deepStrictEqual(manager.getIndex(13), -1);
        assert.deepStrictEqual(manager.getIndex(14), -1);
        assert.deepStrictEqual(manager.getIndex(15), -1);
        assert.deepStrictEqual(manager.getIndex(16), -1);
        assert.deepStrictEqual(manager.getIndex(17), -1);
        assert.deepStrictEqual(manager.getIndex(18), -1);
        assert.deepStrictEqual(manager.getIndex(19), -1);
        assert.deepStrictEqual(manager.getIndex(20), 20);

        assert.deepStrictEqual(manager.getIndex(100), 10);
        assert.deepStrictEqual(manager.getIndex(101), 11);
        assert.deepStrictEqual(manager.getIndex(102), 12);
        assert.deepStrictEqual(manager.getIndex(103), 13);
        assert.deepStrictEqual(manager.getIndex(104), 14);
        assert.deepStrictEqual(manager.getIndex(105), 15);
        assert.deepStrictEqual(manager.getIndex(106), 16);
        assert.deepStrictEqual(manager.getIndex(107), 17);
        assert.deepStrictEqual(manager.getIndex(108), 18);
        assert.deepStrictEqual(manager.getIndex(109), 19);
        assert.deepStrictEqual(manager.getIndex(110), undefined);

        manager.update(2, 5, 3);

        assert.deepStrictEqual(manager.getIndex(100), 10 - 2);
        assert.deepStrictEqual(manager.getIndex(101), 11 - 2);
        assert.deepStrictEqual(manager.getIndex(102), 12 - 2);
        assert.deepStrictEqual(manager.getIndex(103), 13 - 2);
        assert.deepStrictEqual(manager.getIndex(104), 14 - 2);
        assert.deepStrictEqual(manager.getIndex(105), 15 - 2);
        assert.deepStrictEqual(manager.getIndex(106), 16 - 2);
        assert.deepStrictEqual(manager.getIndex(107), 17 - 2);
        assert.deepStrictEqual(manager.getIndex(108), 18 - 2);
        assert.deepStrictEqual(manager.getIndex(109), 19 - 2);

        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);

        assert.deepStrictEqual(manager.getIndex(111), 8);

        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        manager.update(0, 0, 1);
        
        assert.deepStrictEqual(manager.getIndex(111), 28);
        
    });
});
