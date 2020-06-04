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
