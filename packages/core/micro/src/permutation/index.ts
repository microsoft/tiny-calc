import { AdjustTree, createTree, SegmentRange, TreeConfiguration, loadTree, forEachInSegmentRange } from "../adjust-tree/index";
import { LeafFocus } from "../adjust-tree/types";

const enum PermutationKind {
    Empty,
    Direct,
    RunLength,
}

const UNALLOCATED = -1;

type EmptySegment = { kind: PermutationKind.Empty };
type DirectSegment = { kind: PermutationKind.Direct; content: number[] };
type RunLengthSegment = { kind: PermutationKind.RunLength; content: number[] };
type PermutationSegment = | EmptySegment | DirectSegment | RunLengthSegment;

const empty = { kind: PermutationKind.Empty } as const;
const emptyPair: { retained: PermutationSegment; removed: PermutationSegment } = { retained: empty, removed: empty };

function getItemFromRL(segment: RunLengthSegment, offset: number, fresh?: () => number) {
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
    const base = content[startIndex + 1];
    if (base === UNALLOCATED) {
        if (fresh === undefined) {
            return UNALLOCATED;
        }
        const n = fresh();
        const run = content[startIndex];
        if (end === 0) {
            if (run === 1) {
                content[startIndex + 1] = n;
            }
            else {
                content[startIndex]--;
                content.splice(startIndex, 0, 1, n);
            }
        }
        else {
            // can offset === run?
            content[startIndex] -= end;
            content.splice(startIndex, 0, end, UNALLOCATED, 1, n);
        }
        return n;
    }
    return end + content[startIndex + 1];
}

const SINGLETON_DIRECT_THRESHOLD = 256;

function singleton(offset: number, length: number, fresh: number)  {
    if (length <= SINGLETON_DIRECT_THRESHOLD) {
        const content = new Array(length).fill(UNALLOCATED);
        content[offset] = fresh;
        return { kind: PermutationKind.Direct, content };
    }
    let content: number[];
    if (offset === length - 1) {
        content = offset === 0 ? [1, fresh] : [offset, UNALLOCATED, 1, fresh];
    }
    else {
        content = offset === 0 ?
            [1, fresh, length - offset - 1, UNALLOCATED] :
            [offset, UNALLOCATED, 1, fresh, length - offset - 1, UNALLOCATED];
    }
    return { kind: PermutationKind.RunLength, content }
}

function extractSegmentRange(segment: PermutationSegment, start: number, length: number) {
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
                const result = {
                    retained: segment,
                    removed: { kind: PermutationKind.RunLength, content: [len, base + startPos] }
                };
                if (startPos === 0) {
                    content[startIndex] = len - endPos;
                    content[startIndex + 1] = base + endPos;
                    return result;
                }
                if (endPos > 0) {
                    content.splice(startIndex, 2, startPos, base, len - endPos, base + endPos);
                } else {
                    content[startIndex] = startPos;
                }
                return result
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
}

const permutationConfig: TreeConfiguration<PermutationSegment> = { order: 16, emptySegment: empty, extractSegmentRange };

export class IdentityVector {
    permutationTree: AdjustTree<PermutationSegment> = createTree(permutationConfig);
    next: number = 0;

    getItem(position: number) {
        const { offset, segment } = this.permutationTree.getItem(position);
        switch (segment.kind) {
            case PermutationKind.Empty:
                return UNALLOCATED;

            case PermutationKind.Direct:
                return segment.content[offset];

            case PermutationKind.RunLength:
                return getItemFromRL(segment, offset);
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

export interface RecycledPermutations {
    remaining: number;
    direct: number[] | undefined;
    runlength: number[] | undefined;
    runlengthCount: number;
}

export class Recycler {

    constructor(readonly permutations: number[] = [], readonly permutationsRL: number[] = []) { }

    add(range: SegmentRange<PermutationSegment>) {
        let freed: SegmentRange<PermutationSegment> | undefined = range;
        while (freed) {
            const segments = freed.segments;
            for (let i = 0; i < freed.size; i++) {
                const s = segments[i];
                switch (s.kind) {
                    case PermutationKind.Direct:
                        const content = s.content;
                        for (let i = 0; i < content.length; i++) {
                            const n = content[i];
                            if (n !== UNALLOCATED) {
                                this.permutations.push(n);
                            }
                        }
                        break;

                    case PermutationKind.RunLength:
                        const contentRL = s.content;
                        for (let i = 0; i < contentRL.length; i += 2) {
                            const n = contentRL[i + 1];
                            if (n !== UNALLOCATED) {
                                this.permutationsRL.push(contentRL[i]);
                                this.permutationsRL.push(n);
                            }
                        }
                        break;
                }
            }
            freed = freed.next;
        }
    }

    recycleOne() {
        let n = this.permutations.pop();
        if (n !== undefined) {
            return n;
        }
        const end = this.permutationsRL.length;
        if (end > 0) {
            const remaining = --this.permutationsRL[end - 2];
            n = this.permutationsRL[end - 1]++;
            if (remaining < 1) {
                this.permutationsRL.pop();
                this.permutationsRL.pop();
            }
            return n;
        }
        return undefined;
    }

    recyle(count: number): RecycledPermutations {
        let toAlloc = count;
        let direct: number[] | undefined;
        let rl: number[] | undefined;
        let runlengthCount = 0;

        while (toAlloc > 0 && this.permutationsRL.length > 0) {
            const end = this.permutationsRL.length;
            const remaining = this.permutationsRL[end - 2];
            if (rl === undefined) {
                rl = [];
            }
            if (remaining <= toAlloc) {
                runlengthCount += remaining;
                rl.push(remaining)
                rl.push(this.permutationsRL.pop()!)
                this.permutationsRL.pop();
                toAlloc -= remaining;
                continue;
            }
            runlengthCount += toAlloc;
            rl.push(toAlloc)
            rl.push(this.permutationsRL[end - 1])
            this.permutationsRL[end - 2] -= toAlloc;
            this.permutationsRL[end - 1] += toAlloc;
            toAlloc = 0;
        }

        if (toAlloc > 0) {
            while (toAlloc > 0 && this.permutations.length > 0) {
                if (direct === undefined) {
                    direct = [];
                }
                direct.push(this.permutations.pop()!);
            }
        }

        return { remaining: toAlloc, direct, runlength: rl, runlengthCount, };
    }

    snapshot() {
        return { permutations: this.permutations, permutationsRL: this.permutationsRL };
    }

}

export interface PermutationSequenceSnapshot {
    next: number;
    tree: (number | PermutationSegment)[];
    free: {
        permutations: number[];
        permutationsRL: number[];
    }
}

export class PermutationSequence {
    permutationTree: AdjustTree<PermutationSegment>;
    next: number;
    recycler: Recycler;
    focus: LeafFocus<PermutationSegment> | undefined;

    constructor(snapshot?: PermutationSequenceSnapshot) {
        if (snapshot) {
            this.permutationTree = loadTree(permutationConfig, x => x, snapshot.tree);
            this.next = snapshot.next;
            this.recycler = new Recycler(snapshot.free.permutations, snapshot.free.permutationsRL);
        }
        else {
            this.permutationTree = createTree(permutationConfig);
            this.next = 1;
            this.recycler = new Recycler();
        }
    }

    getLength() {
        return this.permutationTree.getLength();
    }

    freshPermutation = () => {
        let fresh = this.recycler.recycleOne();
        if (fresh === undefined) {
            fresh = this.next++;
        }
        return fresh;
    }

    getPermutation(position: number) {
        if (position < 0 || position >= this.permutationTree.getLength()) {
            return undefined;
        }
        const focus = this.permutationTree.zoom(position);
        const { offset, index, leaf } = focus
        const segment = leaf.segments[index];
        switch (segment.kind) {
            case PermutationKind.Empty:
                const fresh = this.freshPermutation();
                const len = leaf.lengths[index];
                leaf.segments[index] = singleton(offset, len, fresh);
                return fresh;

            case PermutationKind.Direct:
                const permutation = segment.content[offset];
                if (permutation === UNALLOCATED) {
                    return segment.content[offset] = this.freshPermutation();
                }
                return permutation;

            case PermutationKind.RunLength:
                return getItemFromRL(segment, offset, this.freshPermutation);
        }
    }

    getItem(position: number) {
        if (position < 0 || position >= this.permutationTree.getLength()) {
            return undefined;
        }
        const { offset, segment } = this.permutationTree.getItem(position);
        switch (segment.kind) {
            case PermutationKind.Empty:
                return UNALLOCATED;

            case PermutationKind.Direct:
                return segment.content[offset];

            case PermutationKind.RunLength:
                return getItemFromRL(segment, offset);
        }
    }

    insertRange(position: number, length: number) {
        this.permutationTree.insertRange(position, length, empty);
    }

    insertFilledRange(position: number, length: number) {
        let pos = position;
        const { remaining, direct, runlength, runlengthCount } = this.recycler.recyle(length);
        if (runlength) {
            this.permutationTree.insertRange(pos, runlengthCount, { kind: PermutationKind.RunLength, content: runlength });
            pos += runlengthCount;
        }
        if (direct) {
            this.permutationTree.insertRange(pos, direct.length, { kind: PermutationKind.Direct, content: direct });
            pos += direct.length;
        }
        if (remaining > 0) {
            this.permutationTree.insertRange(pos, remaining, { kind: PermutationKind.RunLength, content: [remaining, this.next] });
            this.next += remaining;
        }
    }

    map<T>(cb: (pos: number, perm: number) => T): T[] {
        const result: T[] = [];
        const start = this.permutationTree.zoom(0).leaf;
        let pos = 0;
        forEachInSegmentRange(start, (len, entry) => {
            switch (entry.kind) {
                case PermutationKind.Empty:
                    for (let i = 0; i < len; i++) {
                        result.push(cb(pos + i, UNALLOCATED));
                    }
                    break;
                    
                case PermutationKind.Direct:
                    entry.content.forEach((v, i) => {
                        result.push(cb(pos + i, v));
                    })
                    break;
                    
                case PermutationKind.RunLength: {
                    const content = entry.content;
                    let internalLen = pos;
                    for (let i = 0; i < content.length; i += 2) {
                        const count = content[i];
                        const p = content[i+1];
                        for (let j = 0; j < count; j++) {
                            if (p === UNALLOCATED) {
                                result.push(cb(internalLen + j, UNALLOCATED));
                            }
                            else {
                                result.push(cb(internalLen + j, p + j));
                            }
                        }
                        internalLen += count;
                    }
                    break;
                }
            }
            pos += len;
            return true;
        });
        
        return result;
    }

    indexOf(permutation: number) {
        const start = this.permutationTree.zoom(0).leaf;
        let pos = 0;
        let final = -1;
        forEachInSegmentRange(start, (len, entry) => {
            switch (entry.kind) {
                case PermutationKind.Empty:
                    pos += len;
                    return true;
                    
                case PermutationKind.Direct:
                    const n = entry.content.indexOf(permutation);
                    if (n > -1) {
                        pos += n
                        final = pos;
                        return false;
                    }
                    pos += len;
                    return true;
                    
                case PermutationKind.RunLength: {
                    const content = entry.content;
                    for (let i = 0; i < content.length; i += 2) {
                        const count = content[i];
                        const p = content[i+1];
                        if (p !== UNALLOCATED && permutation >= p && permutation < (p + count)) {
                            pos += permutation - p;
                            final = pos;
                            return false;
                        }
                        pos += count;
                    }
                    return true;
                }
            }
        });
        return final;
    }

    free(freed: SegmentRange<PermutationSegment>) {
        this.recycler.add(freed);
    }

    deleteRange(position: number, length: number) {
        return this.permutationTree.deleteRange(position, length);
    }

    snapshot(): PermutationSequenceSnapshot {
        const tree = this.permutationTree.snapshot(x => x);
        const free = this.recycler.snapshot();
        return { next: this.next, tree, free };
    }
}

export function forEachPermutation(range: SegmentRange<PermutationSegment>, cb: (n: number) => void) {
    forEachInSegmentRange(range, (_, segment) => {
        switch (segment.kind) {
            case PermutationKind.Direct:
                segment.content.forEach(cb);
                break;
            case PermutationKind.RunLength: {
                const content = segment.content;
                for (let i = 0; i < content.length; i += 2) {
                    const count = content[i];
                    const pos = content[i+1];
                    if (pos !== UNALLOCATED) {
                        for (let delta = 0; delta < count; delta++) {
                            cb(pos + delta);
                        }
                    }
                }
            }
        }
        return true;
    })
}
