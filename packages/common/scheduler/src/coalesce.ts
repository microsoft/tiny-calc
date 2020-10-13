/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export const done = Promise.resolve();

export function coalesce<T, U>(
    queue: (callback: () => U) => T extends null ? never : T,
    callback: () => U
): () => T {
    /* eslint-disable @rushstack/no-null */
    let pending: T | null = null;

    return () => {
        if (pending === null) {
            pending = queue(() => {
                // Reset `pending` before invoking `callback()` in case `callback()` throws,
                // in which case the returned function would otherwise be permanently stuck
                // in the pending state.
                pending = null;

                return callback();
            });
        }

        return pending;
    }
    /* eslint-enable @rushstack/no-null */
}
