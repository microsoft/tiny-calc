import "mocha";

import {
    createTreeDebug,
    TreeConfiguration,
} from "../src/index";

import { simpleDeletionTest } from "./util";

const config = (order: number): TreeConfiguration<number> => ({
    emptySegment: -1,
    order,
    deleteSegmentRange: element => { return [element, element]; }
})


const makeTree = (chunks: number, config: TreeConfiguration<number>) => {
    const t = createTreeDebug(config);
    for (let i = 0; i < chunks; i++) {
        t.insertRange(i * 10, 10, i);
    }
    return t;
}

describe('Fixed random samples part one', () => {
    const cases: { pos: number, length: number }[][] = [
        [
            { pos: 869, length: 47 },
            { pos: 523, length: 48 },
            { pos: 96, length: 294 },
            { pos: 567, length: 21 },
            { pos: 338, length: 45 },
            { pos: 2, length: 155 },
            { pos: 241, length: 58 },
            { pos: 76, length: 87 },
        ],
        [

            { pos: 348, length: 5 },
            { pos: 745, length: 66 },
            { pos: 758, length: 84 },
            { pos: 682, length: 3 },
            { pos: 248, length: 61 },
            { pos: 440, length: 94 },
            { pos: 612, length: 29 },
            { pos: 132, length: 13 },
            { pos: 194, length: 154 },
            { pos: 196, length: 109 },
            { pos: 214, length: 73 },
            { pos: 21, length: 137 },
        ],
        [
            { pos: 424, length: 169 },
            { pos: 504, length: 47 },
            { pos: 762, length: 6 },
            { pos: 4, length: 352 },
            { pos: 314, length: 12 },
            { pos: 154, length: 90 },
            { pos: 167, length: 48 },
            { pos: 139, length: 2 },
            { pos: 77, length: 97 },
            { pos: 79, length: 45 },
            { pos: 71, length: 6 },
            { pos: 38, length: 6 },
            { pos: 102, length: 1 },
            { pos: 102, length: 6 },
            { pos: 11, length: 6 },
            { pos: 14, length: 14 },
        ],
        [
            { pos: 834, length: 12 },
            { pos: 883, length: 8 },
            { pos: 5, length: 339 },
            { pos: 503, length: 26 },
            { pos: 556, length: 8 },
            { pos: 397, length: 90 },
            { pos: 207, length: 154 },
            { pos: 318, length: 11 },
            { pos: 100, length: 1 },
            { pos: 27, length: 17 },
            { pos: 58, length: 42 },
        ],
        [
            { pos: 495, length: 7 },
            { pos: 409, length: 223 },
            { pos: 198, length: 156 },
            { pos: 552, length: 27 },
            { pos: 163, length: 160 },
            { pos: 4, length: 113 },
        ],
        [
            { pos: 387, length: 51 },
            { pos: 112, length: 317 },
            { pos: 186, length: 163 },
            { pos: 163, length: 136 },
        ],
        [
            { pos: 441, length: 272 },
            { pos: 9, length: 54 },
            { pos: 509, length: 13 },
            { pos: 176, length: 196 },
        ],
        [
            { pos: 852, length: 8 },
            { pos: 275, length: 258 },
            { pos: 297, length: 139 },
            { pos: 22, length: 259 },
        ],
        [
            { pos: 940, length: 19 },
            { pos: 684, length: 8 },
            { pos: 418, length: 43 },
            { pos: 389, length: 122 },
            { pos: 76, length: 25 },
            { pos: 376, length: 140 },
        ],
        [
            { pos: 749, length: 11 },
        ],
        [
            { pos: 593, length: 15 },
            { pos: 375, length: 21 },
            { pos: 21, length: 37 },
            { pos: 737, length: 9 },
            { pos: 392, length: 4 },
            { pos: 389, length: 7 },
            { pos: 359, length: 11 },
            { pos: 659, length: 6 },
        ],
        [
            { pos: 504, length: 16 },
        ],
        [
            { pos: 9747, length: 2760 },
            { pos: 48728, length: 1431 },
            { pos: 92970, length: 133 },
            { pos: 21606, length: 2744 },
            { pos: 40429, length: 2129 },
            { pos: 46588, length: 414 },
            { pos: 29140, length: 1761 },
            { pos: 36996, length: 188 },
            { pos: 38313, length: 1860 },
            { pos: 15566, length: 3182 },
            { pos: 52607, length: 1082 },
            { pos: 12288, length: 87 },
            { pos: 22292, length: 580 },
            { pos: 64139, length: 656 },
            { pos: 24794, length: 2759 },
        ],
        [
            { pos: 2800, length: 7200 },
            { pos: 519, length: 2281 },
            { pos: 58, length: 461 },
            { pos: 30, length: 28 },
            { pos: 12, length: 18 },
            { pos: 2, length: 10 },
        ],
        [
            { pos: 7476, length: 2524 },
        ],
        [
            { pos: 8359, length: 554 },
            { pos: 7082, length: 1943 },
            { pos: 837, length: 6458 },
        ],
        [
            { pos: 3298, length: 713 },
            { pos: 5553, length: 2578 },
            { pos: 4554, length: 606 },
            { pos: 379, length: 5678 },
            { pos: 63, length: 275 },
            { pos: 98, length: 46 },
        ],
        [
            { pos: 609, length: 3905 },
            { pos: 5198, length: 401 },
            { pos: 5083, length: 281 },
        ],
        [
            { pos: 4215, length: 3694 },
        ],
        [
            { pos: 9144, length: 841 },
        ],
        [
            { pos: 486, length: 5821 },
            { pos: 1696, length: 1151 },
            { pos: 315, length: 2292 },
        ],
    ];
    const orders = [1, 2, 3, 4, 5, 6, 7];
    orders.forEach(order => {
        it(`should delete to empty tree - order ${order}`, () => {
            const c = config(order);
            cases.forEach(example => {
                const tree = makeTree(10000, c);
                example.forEach(op => {
                    simpleDeletionTest(tree, op);
                });
            });
        }).timeout(5000);
    });
});

describe('Fixed random samples part two', () => {
    const cases: { pos: number, length: number }[][] = [
        [
            { pos: 3323, length: 2515 },
            { pos: 6063, length: 244 },
            { pos: 6997, length: 86 },
            { pos: 6574, length: 73 },
            { pos: 1947, length: 1194 },
            { pos: 2026, length: 1522 },
        ],
        [
            { pos: 1471, length: 700 },
            { pos: 7883, length: 457 },
            { pos: 8356, length: 67 },
            { pos: 7895, length: 128 },
            { pos: 7183, length: 517 },
            { pos: 6949, length: 226 },
            { pos: 4542, length: 1369 },
            { pos: 4444, length: 383 },
            { pos: 685, length: 2142 },
            { pos: 1371, length: 1202 },
            { pos: 2395, length: 57 },
            { pos: 497, length: 307 },
            { pos: 911, length: 86 },
            { pos: 1436, length: 352 },
            { pos: 921, length: 515 },
        ],
    ];
    const orders = [1, 2, 3, 4, 5, 6, 7];
    orders.forEach(order => {
        it(`should delete to empty tree - order ${order}`, () => {
            const c = config(order);
            cases.forEach(example => {
                const tree = makeTree(1000, c);
                example.forEach(op => {
                    simpleDeletionTest(tree, op);
                });
            });
        }).timeout(5000);
    });
});
