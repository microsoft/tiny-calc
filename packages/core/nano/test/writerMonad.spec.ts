/**
 * This test illustrates how to use the pending and estimate mechanism
 * to implement a tracing evaluator that records reads and
 * dereferences.
 *
 * Using this mechanism we can reconstruct the dependency graph of the
 * expression after evaluating it.
 */

import "mocha";
import { strict as assert } from "assert";

import { parseFormula } from "../src/ast";
import { CoreRuntime, Delay } from "../src/core";
import { evalContext, evaluate } from "../src/interpreter";
import { TypeMap, CalcObj, TypeName, Pending, CalcValue, Runtime } from "../src/types";
import { createObjFromMap, createReadMap } from "./util/objectTypes";

function createTracingRefMap(value: CalcValue<string>): TypeMap<CalcObj<string>, string> {
    return { [TypeName.Reference]: { dereference: (v, c) => ({ kind: "Pending", message: `Dereferencing ${v.serialise(c)} from ${c}`, estimate: value }) } }
}

const cRef = createObjFromMap("C_ref", createTracingRefMap(30))
const ctx = createObjFromMap("Root", createReadMap((p, c) => {
    const message = `Reading ${p} from ${c}`;
    switch (p) {
        case "A":
            return { kind: "Pending", message, estimate: 10 };
        case "B":
            return { kind: "Pending", message, estimate: 20 };
        case "C":
            return { kind: "Pending", message, estimate: cRef };
        default:
            return "unknown";
    }
}))

interface Effect<T> {
    kind: "Pending";
    estimate: T;
    message: string;
}

export const createTracingRuntime = (): [string[], Runtime<Delay>] => {
    const delay = {} as Delay;
    const data: string[] = [];
    const trace = <T>(value: T | Pending<T>) => {
        if (typeof value === "object" && value && (value as any).kind === "Pending") {
            data.push((value as Effect<T>).message);
            if ((value as any).estimate !== undefined) {
                return (value as any).estimate;
            }
            delay;
        }
        return value as T;
    }
    return [data, new CoreRuntime(trace)];
}


describe("writer monad example", () => {
    const formula = parseFormula("A + B + C");
    const rt = createTracingRuntime();
    const result = evaluate(evalContext, "My context", rt[1], ctx, formula[1])
    it("should return an evaluated result", () => {
        assert.equal(result, 60)
    });

    it("should trace effects", () => {
        assert.deepEqual(
            rt[0],
            [
                "Reading A from My context",
                "Reading B from My context",
                "Reading C from My context",
                "Dereferencing C_ref from My context",
            ]
        );
    });
})
