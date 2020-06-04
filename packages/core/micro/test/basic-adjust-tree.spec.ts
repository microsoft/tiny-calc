import "mocha";
import { strict as assert } from "assert";

import {
    createTreeDebug,
    TreeConfiguration,
} from "../src/index";

import { simpleDeletionTest } from "./util";

const config = (order: number): TreeConfiguration<number> => ({
    emptySegment: -1,
    order,
    extractSegmentRange: element => { return { retained: element, removed: element }; }
})

describe('Insertion', () => {
    const makeTree = (config: TreeConfiguration<number>) => {
        const t = createTreeDebug(config);
        t.insertRange(0, 1000, 0);
        return t;
    }
    const orders = [1, 2, 3, 4, 5, 6, 7];
    orders.forEach(order => {
        it(`prefix, split, suffix - order ${order}`, () => {
            const t = makeTree(config(order));
            t.insertRange(0, 10, 1);
            t.insertRange(1010, 10, 2);
            t.insertRange(500, 10, 3);
            assert(t.getLength() === 1030);
            assert.deepStrictEqual(t.getItem(0), { offset: 0, segment: 1 });
            assert.deepStrictEqual(t.getItem(9), { offset: 9, segment: 1 });
            assert.deepStrictEqual(t.getItem(10), { offset: 0, segment: 0 });
            assert.deepStrictEqual(t.getItem(500), { offset: 0, segment: 3 });
            assert.deepStrictEqual(t.getItem(509), { offset: 9, segment: 3 });
            assert.deepStrictEqual(t.getItem(510), { offset: 0, segment: 0 });
            assert.deepStrictEqual(t.getItem(1009), { offset: 499, segment: 0 });
            assert.deepStrictEqual(t.getItem(1010), { offset: 500, segment: 0 });
            assert.deepStrictEqual(t.getItem(1019), { offset: 509, segment: 0 });
            assert.deepStrictEqual(t.getItem(1020), { offset: 0, segment: 2 });
            assert.deepStrictEqual(t.getItem(1029), { offset: 9, segment: 2 });
            t.deleteRange(0, 1030);
            assert(t.getLength() === 0);
            assert(t.validate());
        });
    });
});

describe('Deletion', () => {
    const makeTree = (order: number) => {
        const t = createTreeDebug(config(order));
        for (let i = 0; i < 100; i++) {
            t.insertRange(0, 10, i);
        }
        return t;
    }
    const orders = [1, 2, 3, 4, 5, 6, 7];
    orders.forEach(order => {
        it(`prefix, suffix, split - order ${order}`, () => {
            simpleDeletionTest(makeTree(order), { pos: 0, length: 1000 });
            simpleDeletionTest(makeTree(order), { pos: 0, length: 999 });
            simpleDeletionTest(makeTree(order), { pos: 1, length: 999 });
            simpleDeletionTest(makeTree(order), { pos: 1, length: 998 });
            simpleDeletionTest(makeTree(order), { pos: 0, length: 10 });
            simpleDeletionTest(makeTree(order), { pos: 990, length: 10 });
            simpleDeletionTest(makeTree(order), { pos: 500, length: 10 });
        });
    });
});
