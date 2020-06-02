import {
    AdjustTreeDebug,
    createTreeDebug,
    TreeConfiguration,
} from "../src/index";

import { simpleDeletionTest } from "./util";

const config = (order: number): TreeConfiguration<number> => ({
    emptySegment: -1,
    order,
    deleteSegmentRange: element => { return [element, element]; }
})

const makeTree = (order: number) => {
    const t = createTreeDebug(config(order));
    for (let i = 0; i < 1000; i++) {
        t.insertRange(i * 10, 10, i);
    }
    return t;
}

const granularity = 0.03;
const order = 2;

function deleteRandom(t: AdjustTreeDebug<number>, { pos, length }: { pos?: number, length?: number }) {
    const startR = Math.random();
    const len = t.getLength();
    if (len === 0) {
        return 'done' as const;
    }
    let available;
    if (pos === undefined) {
        let posR = Math.floor(startR * (len - 1));
        available = (len - posR);
        while (available < 1) {
            posR = Math.floor(startR * (len - 1));
            available = (len - posR);
        }
        pos = posR;
    }
    else {
        available = len - pos;
    }
    if (length === undefined) {
        let countR = Math.random();
        let attempt = Math.floor(countR * available * granularity);
        while (attempt > available || attempt < 1) {
            countR = Math.random();
            attempt = Math.ceil(countR * available * granularity);
        }
        length = attempt;
    }
    try {
        simpleDeletionTest(t, { pos, length })
        return 'ok' as const;
    }
    catch (e) {
        return 'fail' as const;
    }
}

function runRandomTest(iterations: number) {
    for (let i = 0; i < iterations; i++) {
        const tree = makeTree(order);
        console.log(`round ${i}`);
        let valid: "ok" | "done" | "fail" = "ok";
        while (valid === "ok") {
            valid = deleteRandom(tree, {});
        }
        if (valid === "fail") {
            throw "fail";
        }
    }
}

runRandomTest(100);
