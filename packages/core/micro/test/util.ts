import { strict as assert } from "assert";

import {
    AdjustTreeDebug,
    forEachInSegmentRange,
    SegmentRange,
} from "../src/index";

function segmentRangeLength(segmentRange: SegmentRange<unknown>): number {
    let len = 0;
    forEachInSegmentRange(segmentRange, l => (len += l, true))
    return len;
}

export function simpleDeletionTest(tree: AdjustTreeDebug<number>, spec: { pos: number, length: number }) {
    const startLen = tree.getLength();
    const rng = tree.deleteRange(spec.pos, spec.length);
    assert(tree.getLength() === startLen - spec.length);
    assert(segmentRangeLength(rng) === spec.length);
    assert(tree.validate());
}
