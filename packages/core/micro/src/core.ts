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
    CalcFlags,
    Fiber,
    FormulaCell,
    FunctionFiber,
    FunctionRunner,
    FunctionSkolem,
    FunctionTask,
    PendingTask,
    Range,
    RangeContext,
} from "./types";

export function makePendingFunction<V>(
    state: FunctionTask, range: Range, context: RangeContext, row: number, column: number, runner: FunctionRunner<FunctionSkolem, V>
): FunctionFiber<V> {
    return { state, range, context, flags: CalcFlags.None, row, column, runner };
}

export function isPending(content: any): content is Pending<unknown> {
    return typeof content === "object" && "kind" in content && content.kind === "Pending";
}

export function isPendingTask(content: any): content is PendingTask<any> {
    return isPending(content) && "fiber" in content;
}

export function isFormulaFiber<T>(fiber: Fiber<T>): fiber is FormulaCell<T> {
    return typeof fiber.state === "number";
}

/**
 * Basic errors.
 */
export const errors = {
    ...errorsC,
    unknownField: makeError("#UNKNOWN!"),
    calc: makeError("#CALC!"),
    cycle: makeError("#CYCLE!"),
    ref: makeError("#REF!"),
    fallbackCoercion: makeError("#VALUE!"),
    parseFailure: makeError("#PARSE!"),
    evalFailure: makeError("#EVAL!"),
} as const;
