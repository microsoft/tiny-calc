/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    errors as errorsC,
    makeError,
    Pending,
} from "@tiny-calc/nano";

import {
    FunctionFiber,
    FunctionTask,
    PendingValue,
    Range,
} from "./types";

export function makePendingFunction<V>(name: FunctionTask, range: Range, row: number, column: number, current: V): FunctionFiber<V> {
    return { flag: name, range, row, column, current };
}

export function isPending(content: any): content is Pending<unknown> {
    return typeof content === "object" && "kind" in content && content.kind === "Pending";
}

export function isPendingFiber(content: any): content is PendingValue {
    return isPending(content) && "fiber" in content;
}

/**
 * Basic errors.
 */
export const errors = {
    ...errorsC,
    unknownField: makeError("#UNKNOWN!"),
    cycle: makeError("#CYCLE!"),
    ref: makeError("#REF!"),
    fallbackCoercion: makeError("#VALUE!"),
    compileFailure: makeError("#COMPILE!"),
    evalFailure: makeError("#EVAL!"),
} as const;
