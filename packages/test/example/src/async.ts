import {
    Pending,
    Formula,
    Primitive,
    ReadableTrait,
    PrimordialTrait,
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

function createReadable(read: (prop: string) => Pending<CalcValue<unknown>> | CalcValue<unknown>): CalcObj<unknown> & ReadableTrait<unknown> {
    const val: CalcObj<unknown> & ReadableTrait<unknown> = {
        acquire: t => (t === PrimordialTrait.Readable ? val : undefined) as any,
        serialise: () => "TODO",
        read
    }
    return val;
}

const read = (prop: string) => {
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

const delayedCalcValue: CalcObj<unknown> = createReadable(read);


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
