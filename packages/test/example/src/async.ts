import {
    Pending,
    Formula,
    Primitive,
    isDelayed,
    CalcObj,
    CalcValue,
    compile
} from "@tiny-calc/nano";

function createTimeoutPromise<T>(ms: number, value: T, cb: (x: T) => void): Promise<void> {
    return new Promise(resolve => setTimeout(() => { cb(value); resolve() }, ms));
}

const cache: Record<string, Primitive | PendingPromise> = {};

interface PendingPromise extends Pending<CalcObj<unknown>> {
    promise: Promise<void>;
}

const delayedCalcValue: CalcObj<unknown> = {
    read(prop) {
        if (cache[prop] !== undefined) {
            return cache[prop];
        }

        let time: number;
        let val: Primitive;

        switch (prop) {
            case "a string":
                time = 100;
                val = "hello world";
                break;
            case "a bool":
                time = 400;
                val = true;
                break;
            default:
                time = 600;
                val = 42;
                break;
        }
        const pending: PendingPromise = {
            kind: "Pending",
            promise: createTimeoutPromise(time, val, x => cache[prop] = x)
        }
        return cache[prop] = pending;
    }
}

const f = compile("{a number} + 10 + {a number} + \" \" + {a string} + \" \" + {a bool}");

function runFormula(f: Formula, attempts: number): Promise<CalcValue<undefined>> {
    console.time('singleEval')
    const [pendings, value] = f(undefined, delayedCalcValue);
    console.timeEnd('singleEval')
    if (isDelayed(value)) {
        if (attempts === 0) {
            return Promise.reject("Exhausted attempts!");
        }
        return Promise.all(
            pendings.map((p: any) => p.promise)
        ).then(() => runFormula(f, attempts--));
    }
    return Promise.resolve(value);
}

if (f) {
    console.time('go');
    const cb = (x: CalcValue<undefined>) => { console.timeEnd('go'); console.log(x) };
    runFormula(f, 1).then(cb).catch(cb);
}
