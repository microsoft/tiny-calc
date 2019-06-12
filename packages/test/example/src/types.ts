import { Formula, Producer, Consumer, Primitive, CalcFun, compile } from "@tiny-calc/nano";

/**
 * CalcValues as Producers
 *
 * Obj is morally equivalent to CalcObj<Consumer<CalcRecord>>.
 */

interface Obj extends Producer<CalcRecord> { }
type Value = CalcFun | Obj | Primitive;
type CalcRecord = Record<string, Value>;

export class Context implements Producer<CalcRecord> {
    constructor(private fields: CalcRecord) { }

    id = "context";

    unsubscribe() { }

    now(property: string) {
        return this.fields[property];
    }

    nowMany<K extends string>(properties: Record<K, unknown>) {
        const result: Partial<Pick<CalcRecord, K>> = {} as any;
        for (const p in properties) {
            result[p] = this.now(p);
        }
        return result;
    }

    request(origin: Consumer<CalcRecord>, property: string) {
        const v = this.now(property);
        return v === undefined ? { kind: "Pending" } as const : v;
    }

    requestMany<K extends string>(origin: Consumer<CalcRecord>, properties: Record<K, unknown>) {
        const result: Pick<CalcRecord, K> = {} as any;
        for (const p in properties) {
            // TODO: export pick pending
            result[p] = this.request(origin, p) as any;
        }
        return result;
    }
}

export class ListFormula implements Consumer<CalcRecord> {
    private formulas: Formula[];
    constructor(private scope: Producer<CalcRecord>, private formulaText: string, private withValue: (v: any[]) => void) {
        this.formulas = [];
        const f = compile(this.formulaText);
        if (f !== undefined) {
            for (let i = 0; i < 1000000; i += 1) {
                this.formulas.push(f);
            }
        }
    }

    notify() {
        console.time("recalc");
        const scope = new MemoProducer(this.scope);
        const values = [];
        for (let i = 0; i < 1000000; i += 1) {
            values.push(this.formulas[i](this, scope));
        }
        console.timeEnd("recalc");
        // TODO: export delayed type
        this.withValue(values.map(([_, v]) => v));
    }

    notifyMany() {
        this.notifyMany();
    }
}

export class MemoProducer implements Producer<CalcRecord> {
    private cache: CalcRecord
    constructor(private readonly source: Producer<CalcRecord>) {
        this.cache = {};
    }

    id = "memo"

    unsubscribe() { }

    now(property: string) {
        if (this.cache[property] !== undefined) {
            return this.cache[property];
        }
        const v = this.source.now(property);
        if (v === undefined) return v;
        if (typeof v === "object") {
            this.cache[property] = new MemoProducer(v);
            return this.cache[property];
        }
        this.cache[property] = v;
        return v;
    }

    nowMany<K extends string>(properties: Record<K, unknown>) {
        const result: Partial<Pick<CalcRecord, K>> = {} as any;
        for (const p in properties) {
            result[p] = this.now(p);
        }
        return result;
    }

    request(origin: Consumer<CalcRecord>, property: string) {
        const v = this.now(property);
        return v === undefined ? { kind: "Pending" } as const : v;
    }

    requestMany<K extends string>(origin: Consumer<CalcRecord>, properties: Record<K, unknown>) {
        const result: Pick<CalcRecord, K> = {} as any;
        for (const p in properties) {
            // TODO: export pick pending
            result[p] = this.request(origin, p) as any;
        }
        return result;
    }
}

export class TimeProducer implements Producer<CalcRecord> {
    constructor() { }

    id = "Time"

    unsubscribe() { }

    now() { return Date.now(); }

    nowMany() { return { Now: this.now() } as any }

    request(origin: Consumer<CalcRecord>, property: string) {
        return this.now();
    }

    requestMany(origin: Consumer<CalcRecord>, properties: Record<string, unknown>) {
        return { Now: this.now() } as any;
    }
}

export class MathProducer implements Producer<CalcRecord> {
    constructor() { }

    id = "Math"

    unsubscribe() { }

    static max = <O>(_t: any, _o: O, [x, y]: any[]) => y > x ? y : x;
    static min = <O>(_t: any, _o: O, [x, y]: any[]) => y < x ? y : x;

    now(property: string) {
        switch (property) {
            case "Max": return MathProducer.max;
            case "Min": return MathProducer.min;
            default: return undefined;
        }
    }

    nowMany() { return { Max: MathProducer.max, Min: MathProducer.min } as any }

    request(origin: Consumer<CalcRecord>, property: string) {
        return this.now(property)!;
    }

    requestMany() {
        return this.nowMany()
    }
}

export const context = new Context({ Time: new TimeProducer(), Math: new MathProducer() });
