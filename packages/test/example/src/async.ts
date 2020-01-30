const fetch = require("node-fetch");

import {
    Pending,
    Formula,
    ReadableTrait,
    PrimordialTrait,
    isDelayed,
    CalcObj,
    CalcValue,
    compile
} from "@tiny-calc/nano";

const cache: Record<string, CalcObj<unknown> & ReadableTrait<unknown> | PendingPromise> = {};

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

function createReadableFromDict(dict: Record<string, any>): CalcObj<unknown> & ReadableTrait<unknown> {
    const val: CalcObj<unknown> & ReadableTrait<unknown> = {
        acquire: t => (t === PrimordialTrait.Readable ? val : undefined) as any,
        serialise: () => "TODO",
        read: prop => {
            const val = dict[prop];
            if (val === undefined) {
                return "#MISSING!";
            }
            switch (typeof val) {
                case "object": return createReadableFromDict(val);
                default: return val;
            }
        }
    }
    return val;
}


function queryWiki(id: string): Promise<Record<string, any>>  {
    const headers = { Accept: "application/json" };
    const json = fetch(`http://www.wikidata.org/entity/${id}`, { headers }).then((body: any) => body.json());
    return json.then((d: any) => d.entities[id]);
}

const read = (prop: string) => {
    if (cache[prop] !== undefined) {
        return cache[prop];
    }
    const pending: PendingPromise = {
        kind: "Pending",
        promise: queryWiki(prop).then(data => {
            cache[prop] = createReadableFromDict(data);
            return;
        })
    }
    return cache[prop] = pending;
}

const delayedCalcValue: CalcObj<unknown> = createReadable(read);


const f = compile(`Q978185.labels.en.value + ' was last modified ' + Q978185.modified + '. ' +
Q2005.labels.en.value + ' was last modified ' + Q2005.modified
`);

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
