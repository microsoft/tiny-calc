import { performance } from "perf_hooks";

import {
    AdjustTree,
    createTree,
    TreeConfiguration,
} from "../adjust-tree/index";

const enum PermutationKind {
    Empty,
    Direct,
    RunLength,
}

type PermutationSegment =
    | { kind: PermutationKind.Empty }
    | { kind: PermutationKind.Direct, content: number[] }
    | { kind: PermutationKind.RunLength, content: number[] };

const empty = { kind: PermutationKind.Empty } as const;
const emptyPair: { retained: PermutationSegment, removed: PermutationSegment } = { retained: empty, removed: empty };

const permutationConfig: TreeConfiguration<PermutationSegment> = {
    order: 7,
    emptySegment: empty,
    extractSegmentRange: (segment, start, length) => {
        switch (segment.kind) {
            case PermutationKind.Empty:
                return emptyPair;

            case PermutationKind.Direct:
                return {
                    retained: segment,
                    removed: { kind: PermutationKind.Direct, content: segment.content.splice(start, length) }
                };

            case PermutationKind.RunLength:
                const content = segment.content;
                const size = content.length;
                let startIndex = 0;
                let startPos = start;
                while (startIndex < size) {
                    const len = content[startIndex];
                    if (startPos < len) {
                        break;
                    }
                    startPos -= len;
                    startIndex += 2;
                }
                let endIndex = 0;
                let endPos = start + length;
                while (endIndex < size) {
                    const len = content[endIndex];
                    if (endPos < len) {
                        break;
                    }
                    endPos -= len;
                    endIndex += 2;
                }
                if (startIndex === endIndex) {
                    const len = content[startIndex];
                    const base = content[startIndex + 1];
                    const removed = content.splice(startIndex, 2, startPos, base, len - endPos, base);
                    return { retained: segment, removed: { kind: PermutationKind.RunLength, content: removed } };
                }

                const wholeStartIndex = startPos === 0 ? startIndex : startIndex + 2;
                const toRemove = (endIndex - wholeStartIndex) / 2;
                endIndex -= toRemove;
                const removed: number[] = toRemove > 0 ? content.splice(wholeStartIndex, toRemove) : [];
                if (startPos > 0) {
                    removed.push(content[startIndex] - startPos);
                    removed.push(content[startIndex + 1] + startPos);
                    content[startIndex] = startPos;
                }
                if (endPos > 0) {
                    removed[removed.length] = endPos;
                    removed[removed.length] = content[endIndex + 1] - endPos;
                    content[endIndex] -= endPos;
                }
                return { retained: segment, removed: { kind: PermutationKind.RunLength, content: removed } };
        }
    }
};

export class IdentityVector {

    permutationTree: AdjustTree<PermutationSegment> = createTree(permutationConfig);
    next: number = 0;

    getItem(position: number) {
        const { offset, segment } = this.permutationTree.getItem(position);
        switch (segment.kind) {
            case PermutationKind.Empty:
                return -1;

            case PermutationKind.Direct:
                return segment.content[offset];

            case PermutationKind.RunLength:
                const content = segment.content;
                const size = content.length;
                let startIndex = 0;
                let end = offset;
                while (startIndex < size) {
                    const len = content[startIndex];
                    if (end < len) {
                        break;
                    }
                    end -= len;
                    startIndex += 2;
                }
                return end + content[startIndex + 1];
        }
    }

    insertRange(position: number, length: number) {
        this.permutationTree.insertRange(position, length, { kind: PermutationKind.RunLength, content: [length, this.next] })
        this.next += length;
    }

    deleteRange(position: number, length: number) {
        return this.permutationTree.deleteRange(position, length);
    }

}

const v = new IdentityVector();
v.insertRange(0, 100000);
const t = performance.now();
v.insertRange(10, 100);
v.insertRange(12, 2);
v.insertRange(12, 2);
v.insertRange(12, 2);
v.insertRange(12, 2);
v.insertRange(12, 2);
v.insertRange(12, 2);
v.insertRange(12, 2);
v.insertRange(12, 2);
v.insertRange(12, 2);
v.insertRange(12, 2);
v.insertRange(12, 2);
v.insertRange(12, 2);
v.insertRange(422, 2);
v.insertRange(422, 119);
v.insertRange(422, 2);
v.insertRange(4225, 65);
v.insertRange(4221, 2);
v.insertRange(4242, 2);
v.insertRange(422, 2);
v.insertRange(1422, 2);
v.insertRange(6422, 2);
v.insertRange(3422, 1);
v.insertRange(9422, 2);
v.insertRange(3322, 2);
v.insertRange(7422, 2);
v.insertRange(625, 4);
v.insertRange(64564, 4535);
v.insertRange(644, 455);
console.log(performance.now() - t);
const ranges = [];
const t1 = performance.now();
for (let i = 0; i < 1000; i++) {
    ranges.push(v.getItem(i));
}
console.log(performance.now() - t1);
console.log(ranges);
v.deleteRange(0, 10000);
const ranges2 = [];
const t2 = performance.now();
for (let i = 0; i < 1000; i++) {
    ranges2.push(v.getItem(i));
}
console.log(performance.now() - t2);
console.log(ranges2);
