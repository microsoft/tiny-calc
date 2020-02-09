import "mocha";
import { strict as assert } from "assert";

import { parseFormula } from "../src/ast";
import { CoreRuntime, Delay } from "../src/core";
import { evalContext, evaluate } from "../src/interpreter";
import { TypeMap, CalcObj, TypeName, Pending, CalcValue, Runtime } from "../src/types";



function createRefMap(value: CalcValue<string>): TypeMap<CalcObj<string>, string> {
    return { [TypeName.Reference]: { dereference: (_v, c) => ({ kind: "Pending", message: `Dereferencing from ${c}`, estimate: value }) } }
}

function createReadMap(read: (prop: string, ctx: string) => CalcValue<string> | Pending<CalcValue<string>>): TypeMap<CalcObj<string>, string> {
    return { [TypeName.Readable]: { read: (_v, p, c) => read(p, c) } }
}

function createObjFromMap(map: TypeMap<CalcObj<string>, string>): CalcObj<string> {
    return { typeMap: () => map, serialise: () => "TODO" }
}


const formula = parseFormula("A + B + C");
const cRef = createObjFromMap(createRefMap(30))
const ctx = createObjFromMap(createReadMap((p, c) => {
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
                "Dereferencing from My context",
            ]
        );
    });
})
