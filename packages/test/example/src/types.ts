import {
    Pending,
    IConsumer,
    IProducer,
    Formula,
    Primitive,
    CalcFun,
    CalcObj,
    CalcValue,
    compile
} from "@tiny-calc/nano";


interface Producer extends IProducer<Record<string, Value>> { }
type Value = Producer | CalcFun<unknown> | Primitive;
// type CalcRecord = Record<string, Value>;

export class Context implements Producer {
    constructor(private fields: Record<string, Value>) { }

    id = "context";

    removeConsumer() { }

    open() {
        return { read: (key: string) => this.fields[key] };
    }
}

export class TimeProducer implements Producer {
    constructor() { }

    id = "Time";

    removeConsumer() { }

    open() {
        const time = Date.now();
        const reader = { read: () => time };
        return reader;
    }
}

type FormulaHost = IConsumer<Record<string, Value>>;

function createPending(v: Pending<Value>): Pending<CalcValue<FormulaHost>> {
    if (v.estimate === undefined) {
        return { kind: "Pending" };
    }
    if (typeof v.estimate === "object") {
        return { kind: "Pending", estimate: createCalcValue(v.estimate) };
    }
    return { kind: "Pending", estimate: v.estimate }
}

function createCalcValue(v: Producer): CalcObj<FormulaHost> {
    const cache: Record<string, CalcValue<FormulaHost>> = {};
    return {
        send: (message: string, consumer: IConsumer<Record<string, Value>>) => {
            if (cache[message] !== undefined) {
                return cache[message];
            }
            const value = v.open(consumer).read(message);
            switch (typeof value) {
                case "string":
                case "number":
                case "boolean":
                case "function":
                    return cache[message] = value;
                default:
                    if ("kind" in value) {
                        return createPending(value);
                    }
                    return cache[message] = createCalcValue(value);
            }
        }
    }
}

export class ListFormula implements FormulaHost {
    private formulas: Formula[];
    constructor(
        private scope: Producer,
        private formulaText: string,
        private withValue: (v: any[]) => void
    ) {
        this.formulas = [];
        const f = compile(this.formulaText);
        if (f !== undefined) {
            for (let i = 0; i < 1000000; i += 1) {
                this.formulas.push(f);
            }
        }
    }

    valueChanged() {
        console.time("recalc");
        const scope = createCalcValue(this.scope);
        const values = [];
        for (let i = 0; i < 1000000; i += 1) {
            values.push(this.formulas[i](this, scope));
        }
        console.timeEnd("recalc");
        // TODO: export delayed type
        this.withValue(values.map(([_, v]) => v));
    }
}

export class MathProducer implements Producer {
    static max = <O>(_t: any, _o: O, [x, y]: any[]) => y > x ? y : x;
    static min = <O>(_t: any, _o: O, [x, y]: any[]) => y < x ? y : x;

    constructor() { }

    id = "Math";

    removeConsumer() { }

    open() {
        return {
            read: (property: string) => {
                switch (property) {
                    case "Max": return MathProducer.max;
                    case "Min": return MathProducer.min;
                    default: return Math.PI; // a stupid default;
                }
            },
        };
    }
}

export const context = new Context({ Time: new TimeProducer(), Math: new MathProducer() });
