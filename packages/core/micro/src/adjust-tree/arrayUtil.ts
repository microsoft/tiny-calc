export function initArray<T>(size: number, element: T): T[] {
    const array = [];
    for (let i = 0; i < size; i++) {
        array.push(element);
    }
    return array;
}

/**
 * Move the contents of arr from range `start` to `end` to the right by
 * `delta places`. Assumes that the caller knows the correct bounds.
 *
 * @param arr
 * @param start
 * @param end
 * @param delta
 */
export function shiftR(arr: unknown[], start: number, end: number, delta: number): void {
    for (let i = end + delta; i >= start + delta; i--) {
        arr[i] = arr[i - delta];
    }
}

export function deleteAndShift<T>(arr: T[], start: number, count: number, arrLength: number, empty: T): T[] {
    const out: T[] = [];
    for (let i = start; i < arrLength; i++) {
        const readingIdx = i + count;
        out.push(arr[i]);
        arr[i] = readingIdx < arrLength ? arr[readingIdx] : empty;
    }
    return out;
}

export function deleteAndShiftLossy<T>(arr: T[], start: number, count: number, arrLength: number, empty: T): void {
    for (let i = start; i < arrLength; i++) {
        const readingIdx = i + count;
        arr[i] = readingIdx < arrLength ? arr[readingIdx] : empty;
    }
}

export function clearR<T>(arr: T[], start: number, arrLength: number, empty: T): void {
    for (let i = start; i < arrLength; i++) {
        arr[i] = empty;
    }
}
