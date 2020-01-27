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
    send(message) {
        if (cache[message] !== undefined) {
            return cache[message];
        }

        let time: number;
        let val: Primitive;

        switch (message) {
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
            promise: createTimeoutPromise(time, val, x => cache[message] = x)
        }
        return cache[message] = pending;
    }
}

const f = compile("{a number} + IF({a number} > 10, {other}, {other}) + {a number} + \" \" + {a string} + \" \" + {a bool}");

/**
 * Care needs to be taken when using promise loops as they have a
 * tendency to leak memory.
 */
async function runFormula(f: Formula, attempts: number): Promise<CalcValue<undefined>> {
    let [pendings, value] = f(undefined, delayedCalcValue);
    while (isDelayed(value)) {
        if (attempts > 0) {
            await Promise.all(pendings.map((p: any) => p.promise));
            [pendings, value] = f(undefined, delayedCalcValue);
            attempts--;
            continue;
        }
        throw "Exhausted attempts!";
    }
    return value;
}

if (f) {
    console.time('go');
    const cb = (x: CalcValue<undefined>) => { console.timeEnd('go'); console.log(x) };
    runFormula(f, 5).then(cb).catch(cb);
}
