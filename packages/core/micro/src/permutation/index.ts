import { performance } from "perf_hooks";

import { AdjustTree, createTree, SegmentRange, TreeConfiguration } from "../adjust-tree/index";

const enum PermutationKind {
    Empty,
    Direct,
    RunLength,
}

type PermutationSegment =
    | { kind: PermutationKind.Empty }
    | { kind: PermutationKind.Direct; content: number[] }
    | { kind: PermutationKind.RunLength; content: number[] };

const empty = { kind: PermutationKind.Empty } as const;
const emptyPair: { retained: PermutationSegment; removed: PermutationSegment } = { retained: empty, removed: empty };

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
                    removed: { kind: PermutationKind.Direct, content: segment.content.splice(start, length) },
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
                    if (startPos > 0) {
                        if (endPos > 0) {
                            content.splice(startIndex, 2, startPos, base, len - endPos, base + endPos);
                        } else {
                            content[startIndex] = startPos;
                        }
                    } else {
                        content[startIndex] = len - endPos;
                        content[startIndex + 1] = base + endPos;
                    }

                    const removed = [len, base + startPos];
                    return { retained: segment, removed: { kind: PermutationKind.RunLength, content: removed } };
                }

                const wholeStartIndex = startPos === 0 ? startIndex : startIndex + 2;
                const toRemove = endIndex - wholeStartIndex;
                endIndex -= toRemove;
                const removed: number[] = toRemove > 0 ? content.splice(wholeStartIndex, toRemove) : [];
                if (startPos > 0) {
                    removed.unshift(content[startIndex] - startPos, content[startIndex + 1] + startPos);
                    content[startIndex] = startPos;
                }
                if (endPos > 0) {
                    removed[removed.length] = endPos;
                    removed[removed.length] = content[endIndex + 1] - endPos;
                    content[endIndex] -= endPos;
                }
                return { retained: segment, removed: { kind: PermutationKind.RunLength, content: removed } };
        }
    },
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
        this.permutationTree.insertRange(position, length, {
            kind: PermutationKind.RunLength,
            content: [length, this.next],
        });
        this.next += length;
    }

    deleteRange(position: number, length: number) {
        return this.permutationTree.deleteRange(position, length);
    }
}

export class PermutationVector {
    permutationTree: AdjustTree<PermutationSegment> = createTree(permutationConfig);
    next: number = 0;
    freeList: SegmentRange<PermutationSegment> | undefined;

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
        let toAlloc = length;
        let free = this.freeList;
        let pos = position;
        while (free) {
            const { lengths, segments } = free;
            for (let i = 0; i < free.size; i++) {
                const len = lengths[i];
                const segment = segments[i];
                if (segment.kind === PermutationKind.Empty) {
                    (<PermutationSegment[]>segments)[i] = empty;
                    continue;
                }
                if (len === toAlloc) {
                    this.permutationTree.insertRange(pos, len, segment);
                    (<number[]>lengths)[i] = 0;
                    (<PermutationSegment[]>segments)[i] = empty;
                    return;
                }
                if (len < toAlloc) {
                    this.permutationTree.insertRange(pos, len, segment);
                    pos += len;
                    toAlloc -= len;
                    (<number[]>lengths)[i] = 0;
                    (<PermutationSegment[]>segments)[i] = empty;
                    continue;
                }
                const { retained, removed } = permutationConfig.extractSegmentRange(segment, 0, toAlloc);
                (<number[]>lengths)[i] = len - toAlloc;
                (<PermutationSegment[]>segments)[i] = removed;
                this.permutationTree.insertRange(pos, toAlloc, retained);
                return;
            }
            free = free.next;
        }
        if (toAlloc > 0) {
            this.permutationTree.insertRange(pos, toAlloc, {
                kind: PermutationKind.RunLength,
                content: [toAlloc, this.next],
            });
            this.next += toAlloc;
        }
    }

    deleteRange(position: number, length: number) {
        const freed = this.permutationTree.deleteRange(position, length);
        if (this.freeList) {
            (<any>this.freeList).prev = freed;
        }
        (<any>freed).next = this.freeList;
        return (this.freeList = freed);
    }
}

// const v = new PermutationVector();
// v.insertRange(0, 100);
// let ranges = [];
// let t1 = performance.now();
// for (let i = 0; i < 100; i++) {
//     ranges.push(v.getItem(i));
// }
// console.log(performance.now() - t1);
// console.log(ranges);
//
// t1 = performance.now();
// v.deleteRange(90, 10);
// console.log(performance.now() - t1);
//
// t1 = performance.now();
// v.insertRange(0, 5);
// v.insertRange(0, 5);
// console.log(performance.now() - t1);
//
// ranges = [];
// t1 = performance.now();
// for (let i = 0; i < 100; i++) {
//     ranges.push(v.getItem(i));
// }
// console.log(performance.now() - t1);
// console.log(ranges);

const v = new PermutationVector();
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

const t3 = performance.now();
v.insertRange(10, 100);
v.insertRange(1442, 2);
v.insertRange(1242, 2);
v.insertRange(12, 343);
v.insertRange(12, 2);
v.insertRange(422, 2);
v.insertRange(422, 119);
v.insertRange(422, 2);
v.insertRange(4225, 65);
v.insertRange(4221, 2);
v.insertRange(4242, 32);
v.insertRange(422, 2);
v.insertRange(1422, 432);
v.insertRange(422, 2);
v.insertRange(3422, 431);
v.insertRange(9422, 2);
v.insertRange(3322, 2);
v.insertRange(7422, 432);
v.insertRange(625, 4);
v.insertRange(64564, 4535);
v.insertRange(644, 455);
console.log(performance.now() - t3);

const t4 = performance.now();
console.time("t4");
v.deleteRange(12, 1);
v.insertRange(0, 1);
v.deleteRange(13, 1);
v.insertRange(0, 1);
v.deleteRange(2, 1);
v.insertRange(11, 1);
v.deleteRange(2, 1);
v.insertRange(11, 1);
v.deleteRange(2, 1);
v.insertRange(11, 1);
v.deleteRange(2, 1);
v.insertRange(11, 1);
v.deleteRange(2, 1);
v.insertRange(11, 1);
v.deleteRange(2, 1);
v.insertRange(11, 1);
v.deleteRange(112, 1);
v.insertRange(0, 1);
v.deleteRange(113, 1);
v.insertRange(0, 1);
v.deleteRange(332, 1);
v.insertRange(11, 1);
v.deleteRange(442, 1);
v.insertRange(11, 14);
v.deleteRange(552, 41);
v.insertRange(11, 1);
v.deleteRange(222, 1);
v.insertRange(11, 14);
v.deleteRange(112, 10);
v.insertRange(11, 12);
v.deleteRange(6542, 1);
v.insertRange(11, 14);
v.deleteRange(422, 14);
v.insertRange(141, 1);
v.deleteRange(5432, 41);
v.insertRange(1421, 1);
v.deleteRange(1142, 1);
v.insertRange(4, 15);
v.deleteRange(11423, 1);
v.insertRange(52, 1);
v.deleteRange(3342, 41);
v.insertRange(411, 14);
v.deleteRange(4542, 1);
v.insertRange(101, 14);
v.deleteRange(952, 1);
v.insertRange(121, 12);
v.deleteRange(72, 14);
v.insertRange(661, 1);
v.deleteRange(1142, 51);
v.insertRange(112, 1);
v.deleteRange(6542, 21);
v.insertRange(1421, 16);
v.deleteRange(72, 2);
v.insertRange(0, 2);
console.timeEnd("t4");
console.log(`insert and delete ${performance.now() - t4}`);

const ranges3 = [];
const t5 = performance.now();
for (let i = 0; i < 1000; i++) {
    ranges3.push(v.getItem(i));
}
console.log(performance.now() - t5);
console.log(ranges3);
