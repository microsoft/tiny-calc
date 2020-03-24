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
    FunctionRunner,
    FunctionTask,
    PendingTask,
    Range,
    RangeContext,
} from "./types";

export function makePendingFunction<V>(
    name: FunctionTask, range: Range, context: RangeContext, row: number, column: number, runner: FunctionRunner<V>
): FunctionFiber<V> {
    return { flag: name, range, context, row, column, runner };
}

export function isPending(content: any): content is Pending<unknown> {
    return typeof content === "object" && "kind" in content && content.kind === "Pending";
}

export function isPendingTask(content: any): content is PendingTask<any> {
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
    parseFailure: makeError("#PARSE!"),
    evalFailure: makeError("#EVAL!"),
} as const;
