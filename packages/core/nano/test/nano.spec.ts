import { parseFormula } from "../src/ast";
import { createDiagnosticErrorHandler, createParser, SyntaxKind, ExpAlgebra } from "../src/parser";
import { compile } from "../src/compiler";
import { interpret } from "../src/interpreter";
import {
    CalcValue,
    CalcObj,
    CalcFun,
    ComparableType,
    errors,
    makeError,
    NumericType,
    Pending,
    Primitive,
    TypeMap,
    TypeName
} from "../src/index";
import * as assert from "assert";
import "mocha";

const astSink: ExpAlgebra<object> = {
    lit(value: number | string | boolean, start: number, end: number) {
        return { start, end, value };
    },
    ident(id: string, _kind: unknown, _fieldAccess: boolean, start: number, end: number) {
        return { start, end, id };
    },
    paren(expr: object, start: number, end: number) {
        return { start, end, expr };
    },
    app(head: object, args: object[], start: number, end: number) {
        return { start, end, head, args }
    },
    dot(left: object, right: object, start: number, end: number) {
        return { start, end, left, right }
    },
    binOp(op: SyntaxKind, left: object, right: object, start: number, end: number) {
        return { start, end, op, left, right }
    },
    unaryOp(op: SyntaxKind, expr: object, start: number, end: number) {
        return { start, end, op, expr }
    },
    missing(pos: number) {
        return { pos }
    }
};

export const astParse = createParser(astSink, createDiagnosticErrorHandler());

const sum: CalcFun<unknown> = <O>(_rt: any, _origin: O, args: any[]) => args.reduce((prev, now) => prev + now, 0);
const prod: CalcFun<unknown> = <O>(_rt: any, _origin: O, args: any[]) => args.reduce((prev, now) => prev * now, 1);

function createRefMap(value: CalcValue<unknown>): TypeMap<CalcObj<unknown>, unknown> {
    return { [TypeName.Reference]: { dereference: () => value } }
}

function createReadMap(read: (prop: string) => CalcValue<unknown> | Pending<CalcValue<unknown>>): TypeMap<CalcObj<unknown>, unknown> {
    return { [TypeName.Readable]: { read: (_v, p, _c) => read(p) } }
}

function createObjFromMap(map: TypeMap<CalcObj<unknown>, unknown>): CalcObj<unknown> {
    return { typeMap: () => map, serialise: () => "TODO" }
}

const currencyCompare: ComparableType<Currency, unknown> = {
    compare(pattern: -1 | 0 | 1, l: Primitive | Currency, r: Primitive | Currency): number | CalcObj<unknown> {
        switch (pattern) {
            case -1:
            case 1:
                return errors.typeError;
            case 0:
                return (<Currency>l).value - (<Currency>r).value;
        }
    }
}

class Currency implements CalcObj<unknown>, NumericType<Currency, unknown> {
    constructor(public readonly value: number, public readonly currency: string) { }

    serialise() {
        return `${this.currency}${this.value.toString()}`;
    }

    typeMap(): TypeMap<this, unknown> {
        return {
            [TypeName.Numeric]: this,
            [TypeName.Comparable]: currencyCompare
        }
    }

    plus(pattern: -1 | 0 | 1, l: number | Currency, r: number | Currency): number | CalcObj<unknown> {
        switch (pattern) {
            case -1:
                return new Currency((<Currency>l).value + <number>r, (<Currency>l).currency);

            case 1:
                return new Currency(<number>l + (<Currency>r).value, (<Currency>r).currency);

            case 0:
                if ((<Currency>l).currency === (<Currency>r).currency) {
                    return new Currency((<Currency>l).value + (<Currency>r).value, (<Currency>l).currency);
                }
                return makeError("Incorrect currency addition!");

        }
    }

    minus(pattern: -1 | 0 | 1, l: number | Currency, r: number | Currency): number | CalcObj<unknown> {
        switch (pattern) {
            case -1:
                return new Currency((<Currency>l).value - <number>r, (<Currency>l).currency);

            case 1:
                return new Currency(<number>l - (<Currency>r).value, (<Currency>r).currency);

            case 0:
                if ((<Currency>l).currency === (<Currency>r).currency) {
                    return new Currency((<Currency>l).value - (<Currency>r).value, (<Currency>l).currency);
                }
                return makeError("Incorrect currency addition!");

        }
    }

    mult(pattern: -1 | 0 | 1, l: number | Currency, r: number | Currency): number | CalcObj<unknown> {
        switch (pattern) {
            case -1:
                return new Currency((<Currency>l).value * <number>r, (<Currency>l).currency);
            case 1:
                return new Currency(<number>l * (<Currency>r).value, (<Currency>r).currency);
            case 0:
                return new Currency((<Currency>l).value * (<Currency>r).value, (<Currency>l).currency);
        }
    }

    div(pattern: -1 | 0 | 1, l: number | Currency, r: number | Currency): number | CalcObj<unknown> {
        switch (pattern) {
            case -1:
                return new Currency((<Currency>l).value / <number>r, (<Currency>l).currency);
            case 1:
                return new Currency(<number>l / (<Currency>r).value, (<Currency>r).currency);
            case 0:
                if ((<Currency>l).currency === (<Currency>r).currency) {
                    return (<Currency>l).value / (<Currency>r).value;
                }
                return makeError("Incorrect currency addition!");
        }
    }

    negate(value: Currency): CalcObj<unknown> {
        return new Currency(-value.value, value.currency);
    }

}

const a1 = createObjFromMap(Object.assign(createReadMap(_ => 0), createRefMap(sum)));
const something = createObjFromMap(createReadMap(prop => prop === "Property A" ? "A" : "B"));
const testContext = createObjFromMap(createReadMap(
    (message: string) => {
        switch (message) {
            case "Foo": return 3;
            case "I'm a property with a # of characters": return 100;
            case "Bar": return 5;
            case "Baz": return { kind: "Pending" as const };
            case "Qux": return { kind: "Pending" as const };
            case "A1": return a1;
            case "Something": return something;
            case "Sum": return sum;
            case "Product": return prod;
            case "$100": return new Currency(100, "$");
            case "$200": return new Currency(200, "$");
            case "300 GBP": return new Currency(300, "GBP");
            default: return 0;
        }
    }));


describe("nano", () => {
    function parseTest(expression: string, expected: object, errorCount: number) {
        it(`Parse: ${expression}`, () => {
            const [errors, ast] = astParse(expression);
            assert.deepEqual(ast, expected);
            assert.strictEqual(errors.length, errorCount);
        });
    }

    function evalTest(expression: string, expected: CalcValue<any>, serialise: boolean | undefined) {
        it(`Eval: ${expression}`, () => {
            const f = compile(expression);
            assert.notEqual(f, undefined)
            const [pending, actual] = f!(undefined, testContext);
            assert.deepEqual(pending, []);
            if (serialise) {
                if (typeof actual === "object") {
                    assert.strictEqual((actual as CalcObj<void>).serialise(), expected);
                }
                else {
                    assert.strictEqual(actual.toString(), expected);
                }
            }
            else {
                assert.strictEqual(actual, expected);
            }
        });
    }

    function interpretTest(expression: string, expected: CalcValue<any>, serialise: boolean | undefined) {
        it(`Interpret: ${expression}`, () => {
            const [errors, formula] = parseFormula(expression);
            assert.strictEqual(errors, false);
            const [pending, actual] = interpret(undefined, testContext, formula);
            assert.deepEqual(pending, []);
            if (serialise) {
                if (typeof actual === "object") {
                    assert.strictEqual((actual as CalcObj<void>).serialise(), expected);
                }
                else {
                    assert.strictEqual(actual.toString(), expected);
                }
            }
            else {
                assert.strictEqual(actual, expected);
            }
        });
    }

    function compilationFailureTest(expression: string) {
        it(`Compilation Failure: ${expression}`, () => {
            const f = compile(expression);
            assert.strictEqual(f, undefined);
        });
    }

    const parseCases = [
        {
            expression: "{hello world}",
            expected: {
                "start": 0,
                "end": 13,
                "id": "hello world"
            },
            errorCount: 0,
        },
        {
            expression: "{hello world",
            expected: {
                "start": 0,
                "end": 12,
                "id": "hello world"
            },
            errorCount: 1,
        },
        {
            expression: "'hello world",
            expected: {
                "start": 0,
                "end": 12,
                "value": "hello world"
            },
            errorCount: 1,
        },
        {
            expression: "'hello world'",
            expected: {
                "start": 0,
                "end": 13,
                "value": "hello world"
            },
            errorCount: 0,
        },
        {
            expression: '"hello } world"',
            expected: {
                "start": 0,
                "end": 15,
                "value": "hello } world"
            },
            errorCount: 0,
        },
        {
            expression: "{Hello \\} world!!}",
            expected: {
                "start": 0,
                "end": 18,
                "id": "Hello } world!!"
            },
            errorCount: 0,
        },
        {
            expression: "+foo.hello(world)",
            expected: {
                "start": 0,
                "end": 17,
                "op": 9,
                "expr": {
                    "start": 1,
                    "end": 17,
                    "head": {
                        "start": 1,
                        "end": 10,
                        "left": {
                            "start": 1,
                            "end": 4,
                            "id": "foo"
                        },
                        "right": {
                            "start": 5,
                            "end": 10,
                            "id": "hello"
                        }
                    },
                    "args": [
                        {
                            "start": 11,
                            "end": 16,
                            "id": "world"
                        }
                    ]
                }
            },
            errorCount: 0,
        },
        {
            expression: "+foo(hello).world",
            expected: {
                "start": 0,
                "end": 17,
                "op": 9,
                "expr": {
                    "start": 1,
                    "end": 17,
                    "left": {
                        "start": 1,
                        "end": 11,
                        "head": {
                            "start": 1,
                            "end": 4,
                            "id": "foo"
                        },
                        "args": [
                            {
                                "start": 5,
                                "end": 10,
                                "id": "hello"
                            }
                        ]
                    },
                    "right": {
                        "start": 12,
                        "end": 17,
                        "id": "world"
                    }
                }
            },
            errorCount: 0,
        },
        {
            expression: "+foo.hello",
            expected: {
                "start": 0,
                "end": 10,
                "op": 9,
                "expr": {
                    "start": 1,
                    "end": 10,
                    "left": {
                        "start": 1,
                        "end": 4,
                        "id": "foo"
                    },
                    "right": {
                        "start": 5,
                        "end": 10,
                        "id": "hello"
                    }
                }
            },
            errorCount: 0
        },
        {
            expression: "+.",
            expected: {
                "start": 0,
                "end": 2,
                "op": 9,
                "expr": {
                    "start": 1,
                    "end": 2,
                    "left": {
                        "pos": 1
                    },
                    "right": {
                        "pos": 2
                    }
                }
            },
            errorCount: 0
        },
        {
            expression: "+.hello",
            expected: {
                "start": 0,
                "end": 7,
                "op": 9,
                "expr": {
                    "start": 1,
                    "end": 7,
                    "left": {
                        "pos": 1
                    },
                    "right": {
                        "start": 2,
                        "end": 7,
                        "id": "hello"
                    }
                }
            },
            errorCount: 0
        },
        {
            expression: "+foo.",
            expected: {
                "start": 0,
                "end": 5,
                "op": 9,
                "expr": {
                    "start": 1,
                    "end": 5,
                    "left": {
                        "start": 1,
                        "end": 4,
                        "id": "foo"
                    },
                    "right": {
                        "pos": 5
                    }
                }
            },
            errorCount: 0
        },
        {
            expression: "FOO(A.    , , ###)",
            expected: {
                "start": 0,
                "end": 18,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "start": 4,
                        "end": 6,
                        "left": {
                            "start": 4,
                            "end": 5,
                            "id": "A"
                        },
                        "right": {
                            "pos": 6
                        }
                    },
                    {
                        "pos": 11
                    },
                    {
                        "pos": 13
                    }
                ]
            },
            errorCount: 3
        },
        {
            expression: "FOO( +  , BAR(,  ##3,   A.    , , ###)",
            expected: {
                "start": 0,
                "end": 38,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "start": 4,
                        "end": 6,
                        "op": 9,
                        "expr": {
                            "pos": 6
                        }
                    },
                    {
                        "start": 9,
                        "end": 38,
                        "head": {
                            "start": 9,
                            "end": 13,
                            "id": "BAR"
                        },
                        "args": [
                            {
                                "pos": 14
                            },
                            {
                                "start": 19,
                                "end": 20,
                                "value": 3
                            },
                            {
                                "start": 21,
                                "end": 26,
                                "left": {
                                    "start": 21,
                                    "end": 25,
                                    "id": "A"
                                },
                                "right": {
                                    "pos": 26
                                }
                            },
                            {
                                "pos": 31
                            },
                            {
                                "pos": 33
                            }
                        ]
                    }
                ]
            },
            errorCount: 6
        },
        {
            expression: "FOO(#3#)",
            expected: {
                "start": 0,
                "end": 8,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "start": 5,
                        "end": 6,
                        "value": 3
                    }
                ]
            },
            errorCount: 2
        },
        {
            expression: "FOO(    ####, #    )",
            expected: {
                "start": 0,
                "end": 20,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "pos": 4
                    },
                    {
                        "pos": 13
                    }
                ]
            },
            errorCount: 5
        },
        {
            expression: "FOO(#3)",
            expected: {
                "start": 0,
                "end": 7,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "start": 5,
                        "end": 6,
                        "value": 3
                    }
                ]
            },
            errorCount: 1
        },
        {
            expression: "FOO(3#3)",
            expected: {
                "start": 0,
                "end": 8,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "start": 4,
                        "end": 5,
                        "value": 3
                    },
                    {
                        "start": 6,
                        "end": 7,
                        "value": 3
                    }
                ]
            },
            errorCount: 2
        },
        {
            expression: "FOO(  ,  ,     ,)",
            expected: {
                "start": 0,
                "end": 17,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "pos": 4
                    },
                    {
                        "pos": 7
                    },
                    {
                        "pos": 10
                    },
                    {
                        "pos": 16
                    }
                ]
            },
            errorCount: 0
        },
        {
            expression: "FOO(#  ,  # , ##  3  ##, # ##     ",
            expected: {
                "start": 0,
                "end": 29,
                "head": {
                    "start": 0,
                    "end": 3,
                    "id": "FOO"
                },
                "args": [
                    {
                        "pos": 4
                    },
                    {
                        "pos": 8
                    },
                    {
                        "start": 16,
                        "end": 19,
                        "value": 3
                    },
                    {
                        "pos": 24
                    }
                ]
            },
            errorCount: 10
        },
        {
            expression: "(3433.454+(33.34)",
            expected: {
                "start": 0,
                "end": 17,
                "expr": {
                    "start": 1,
                    "end": 17,
                    "op": 9,
                    "left": {
                        "start": 1,
                        "end": 9,
                        "value": 3433.454
                    },
                    "right": {
                        "start": 10,
                        "end": 17,
                        "expr": {
                            "start": 11,
                            "end": 16,
                            "value": 33.34
                        }
                    }
                }
            },
            errorCount: 1
        },
        {
            expression: "A.B..C..D + 3 *",
            expected: {
                "start": 0,
                "end": 15,
                "op": 9,
                "left": {
                    "start": 0,
                    "end": 9,
                    "left": {
                        "start": 0,
                        "end": 7,
                        "left": {
                            "start": 0,
                            "end": 6,
                            "left": {
                                "start": 0,
                                "end": 4,
                                "left": {
                                    "start": 0,
                                    "end": 3,
                                    "left": {
                                        "start": 0,
                                        "end": 1,
                                        "id": "A"
                                    },
                                    "right": {
                                        "start": 2,
                                        "end": 3,
                                        "id": "B"
                                    }
                                },
                                "right": {
                                    "pos": 4
                                }
                            },
                            "right": {
                                "start": 5,
                                "end": 6,
                                "id": "C"
                            }
                        },
                        "right": {
                            "pos": 7
                        }
                    },
                    "right": {
                        "start": 8,
                        "end": 9,
                        "id": "D"
                    }
                },
                "right": {
                    "start": 11,
                    "end": 15,
                    "op": 7,
                    "left": {
                        "start": 11,
                        "end": 13,
                        "value": 3
                    },
                    "right": {
                        "pos": 15
                    }
                }
            },
            errorCount: 0
        },
        {
            expression: "Math(33).max(33) + 41(34)",
            expected: {
                "start": 0,
                "end": 25,
                "op": 9,
                "left": {
                    "start": 0,
                    "end": 16,
                    "head": {
                        "start": 0,
                        "end": 12,
                        "left": {
                            "start": 0,
                            "end": 8,
                            "head": {
                                "start": 0,
                                "end": 4,
                                "id": "Math"
                            },
                            "args": [
                                {
                                    "start": 5,
                                    "end": 7,
                                    "value": 33
                                }
                            ]
                        },
                        "right": {
                            "start": 9,
                            "end": 12,
                            "id": "max"
                        }
                    },
                    "args": [
                        {
                            "start": 13,
                            "end": 15,
                            "value": 33
                        }
                    ]
                },
                "right": {
                    "start": 18,
                    "end": 25,
                    "head": {
                        "start": 18,
                        "end": 21,
                        "value": 41
                    },
                    "args": [
                        {
                            "start": 22,
                            "end": 24,
                            "value": 34
                        }
                    ]
                }
            },
            errorCount: 0
        },
        {
            expression: "Foo.Bar. + A.B..C. -",
            expected: {
                "start": 0,
                "end": 20,
                "op": 10,
                "left": {
                    "start": 0,
                    "end": 18,
                    "op": 9,
                    "left": {
                        "start": 0,
                        "end": 8,
                        "left": {
                            "start": 0,
                            "end": 7,
                            "left": {
                                "start": 0,
                                "end": 3,
                                "id": "Foo"
                            },
                            "right": {
                                "start": 4,
                                "end": 7,
                                "id": "Bar"
                            }
                        },
                        "right": {
                            "pos": 8
                        }
                    },
                    "right": {
                        "start": 10,
                        "end": 18,
                        "left": {
                            "start": 10,
                            "end": 17,
                            "left": {
                                "start": 10,
                                "end": 15,
                                "left": {
                                    "start": 10,
                                    "end": 14,
                                    "left": {
                                        "start": 10,
                                        "end": 12,
                                        "id": "A"
                                    },
                                    "right": {
                                        "start": 13,
                                        "end": 14,
                                        "id": "B"
                                    }
                                },
                                "right": {
                                    "pos": 15
                                }
                            },
                            "right": {
                                "start": 16,
                                "end": 17,
                                "id": "C"
                            }
                        },
                        "right": {
                            "pos": 18
                        }
                    }
                },
                "right": {
                    "pos": 20
                }
            },
            errorCount: 0
        },
        {
            expression: "10 + 42.Foobar + 3",
            expected: {
                "start": 0,
                "end": 8,
                "op": 9,
                "left": {
                    "start": 0,
                    "end": 2,
                    "value": 10
                },
                "right": {
                    "start": 4,
                    "end": 8,
                    "value": 42
                }
            },
            errorCount: 1
        },
        {
            expression: "Function(10, 42.Foobar, 5)",
            expected: {
                "start": 0,
                "end": 26,
                "head": {
                    "start": 0,
                    "end": 8,
                    "id": "Function"
                },
                "args": [
                    {
                        "start": 9,
                        "end": 11,
                        "value": 10
                    },
                    {
                        "start": 12,
                        "end": 16,
                        "value": 42
                    },
                    {
                        "start": 16,
                        "end": 22,
                        "id": "Foobar"
                    },
                    {
                        "start": 23,
                        "end": 25,
                        "value": 5
                    }
                ]
            },
            errorCount: 1
        },
        {
            expression: "----4",
            expected: {
                "start": 0,
                "end": 5,
                "op": 10,
                "expr": {
                    "start": 1,
                    "end": 5,
                    "op": 10,
                    "expr": {
                        "start": 2,
                        "end": 5,
                        "op": 10,
                        "expr": {
                            "start": 3,
                            "end": 5,
                            "op": 10,
                            "expr": {
                                "start": 4,
                                "end": 5,
                                "value": 4
                            }
                        }
                    }
                }
            },
            errorCount: 0
        },
        {
            expression: "-4+-4+",
            expected: {
                "start": 0,
                "end": 6,
                "op": 9,
                "left": {
                    "start": 0,
                    "end": 5,
                    "op": 9,
                    "left": {
                        "start": 0,
                        "end": 2,
                        "op": 10,
                        "expr": {
                            "start": 1,
                            "end": 2,
                            "value": 4
                        }
                    },
                    "right": {
                        "start": 3,
                        "end": 5,
                        "op": 10,
                        "expr": {
                            "start": 4,
                            "end": 5,
                            "value": 4
                        }
                    }
                },
                "right": {
                    "pos": 6
                }
            },
            errorCount: 0
        },
    ];

    const evalCases = [
        { expression: "{I'm a property with a # of characters}", expected: 100 },
        { expression: "{I'm a property with a # of characters}*10", expected: 1000 },
        { expression: "Something.{Property A}", expected: "A" },
        { expression: "Something.{Property B}", expected: "B" },
        { expression: "----4", expected: 4 },
        { expression: "-4+-4", expected: -8 },
        { expression: "-4++-4", expected: -8 },
        { expression: "-4--4", expected: 0 },
        { expression: "Sum(Foo + Bar, Bar * Foo, 3, IF(Foo < 0, 10, 100))", expected: 126 },
        {
            expression: `Sum(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Sum(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Product(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Sum(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Product(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Sum(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Product(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)`, expected: 259
        },
        { expression: "IF", expected: 0 },
        { expression: "FUN", expected: 0 },
        { expression: "IF(true)", expected: true },
        { expression: "IF(Foo > 2, Foo + Bar, Bar * Foo)", expected: 8 },
        { expression: "1.3333 + 2.2222", expected: 3.5555 },
        { expression: "1 + 2    + 3 + 4 =   10 - 10 + 10", expected: true },
        { expression: "IF(1*2*3*4<>8, 'hello' + 'world', 10 / 2)", expected: "helloworld" },
        { expression: "IF(1*2*3*4<>24, 'hello' + 'world', 10 / 2)", expected: 5 },
        { expression: "IF(1*2*3*4<>24, 'hello' + 'world')", expected: false },
        { expression: "1*2+3*4", expected: 14 },
        { expression: "4*1*2+3*4", expected: 20 },
        { expression: "4*1*(2+3)*4", expected: 80 },
        { expression: "Foo + Bar", expected: 8 },
        { expression: "IF(Foo * Bar > 10000, 'left', 'right')", expected: "right" },
        { expression: "4(3,2)", expected: "The target of an application must be a calc function.", serialise: true },
        {
            expression: "(Sum + 3)",
            expected: "#TYPE!",
            serialise: true
        },
        { expression: "42.", expected: 42 },
        { expression: "42.01", expected: 42.01 },
        { expression: "1/1", expected: 1 },
        { expression: "1/0", expected: errors.div0 },
        { expression: "(1/0)", expected: "#DIV/0!", serialise: true },
        { expression: "FUN(42)()", expected: 42 },
        { expression: "A1(1, 2, 3, FUN(42)())", expected: 48 },
        { expression: "FUN(x, y, x + y)(1)", expected: "#ARITY!", serialise: true },
        { expression: "FUN(x, y, z, x + y + z)(1, 2, 3) + FUN(x, y, z, x + y + z)(4, 5, 6) + FUN(x, y, z, x + y + z)(7, 8, 9) + FUN(x, y, z, x + y + z)(10, 11, 12)", expected: 78 },
        { expression: "FUN(f, f(1, 2, 3) + f(4, 5, 6) + f(7, 8, 9) + f(10, 11, 12))(FUN(x, y, z, x + y + z))", expected: 78 },
        { expression: "FUN(x, y, z, x + FUN(x, x*x)(y) + z)(2, 3, 4)", expected: 15 },
        { expression: "FUN(g, f, FUN(x, g(f(x))))(FUN(x, x + 1), FUN(x, x - 1))(10)=10", expected: true },
        { expression: "{$200} + {$200} + {$200} + {$200} + {$200}", expected: "$1000", serialise: true },
        { expression: "{$100} + {$100} + {$100} + {$100} + {$100}", expected: "$500", serialise: true },
        { expression: "{$100} + {300 GBP}", expected: "Incorrect currency addition!", serialise: true },
        { expression: "{300 GBP} / {300 GBP}", expected: 1 },
        { expression: "10 * {300 GBP}", expected: "GBP3000", serialise: true },
        { expression: "{300 GBP} = {300 GBP}", expected: "true", serialise: true },
        { expression: "{$100} < {$200}", expected: "true", serialise: true },
        { expression: "{$100} > {$200}", expected: "false", serialise: true },
    ];

    const interpretCases = [
        { expression: "{I'm a property with a # of characters}", expected: 100 },
        { expression: "{I'm a property with a # of characters}*10", expected: 1000 },
        { expression: "Something.{Property A}", expected: "A" },
        { expression: "Something.{Property B}", expected: "B" },
        { expression: "----4", expected: 4 },
        { expression: "-4+-4", expected: -8 },
        { expression: "-4++-4", expected: -8 },
        { expression: "-4--4", expected: 0 },
        { expression: "Sum(Foo + Bar, Bar * Foo, 3, IF(Foo < 0, 10, 100))", expected: 126 },
        {
            expression: `Sum(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Sum(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Product(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Sum(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Product(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Sum(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)+
Product(1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1)`, expected: 259
        },
        { expression: "IF", expected: 0 },
        { expression: "FUN", expected: 0 },
        { expression: "IF(true)", expected: true },
        { expression: "IF(Foo > 2, Foo + Bar, Bar * Foo)", expected: 8 },
        { expression: "1.3333 + 2.2222", expected: 3.5555 },
        { expression: "1 + 2    + 3 + 4 =   10 - 10 + 10", expected: true },
        { expression: "IF(1*2*3*4<>8, 'hello' + 'world', 10 / 2)", expected: "helloworld" },
        { expression: "IF(1*2*3*4<>24, 'hello' + 'world', 10 / 2)", expected: 5 },
        { expression: "IF(1*2*3*4<>24, 'hello' + 'world')", expected: false },
        { expression: "1*2+3*4", expected: 14 },
        { expression: "4*1*2+3*4", expected: 20 },
        { expression: "4*1*(2+3)*4", expected: 80 },
        { expression: "Foo + Bar", expected: 8 },
        { expression: "IF(Foo * Bar > 10000, 'left', 'right')", expected: "right" },
        { expression: "4(3,2)", expected: "The target of an application must be a calc function.", serialise: true },
        {
            expression: "(Sum + 3)",
            expected: "#TYPE!",
            serialise: true
        },
        { expression: "42.", expected: 42 },
        { expression: "42.01", expected: 42.01 },
        { expression: "1/1", expected: 1 },
        { expression: "1/0", expected: errors.div0 },
        { expression: "(1/0)", expected: "#DIV/0!", serialise: true },
        { expression: "{$200} + {$200} + {$200} + {$200} + {$200}", expected: "$1000", serialise: true },
        { expression: "{$100} + {$100} + {$100} + {$100} + {$100}", expected: "$500", serialise: true },
        { expression: "{$100} + {300 GBP}", expected: "Incorrect currency addition!", serialise: true },
        { expression: "{300 GBP} / {300 GBP}", expected: 1 },
        { expression: "{300 GBP} = {300 GBP}", expected: "true", serialise: true },
        { expression: "{$100} < {$200}", expected: "true", serialise: true },
        { expression: "{$100} > {$200}", expected: "false", serialise: true },
        { expression: "10 * {300 GBP}", expected: "GBP3000", serialise: true }
    ];

    const compilationFailureCases = [
        { expression: "4+" },
        { expression: "+" },
        { expression: "FUN()" },
        { expression: "FUN(4,4,4+4)" },
        { expression: "IF()" },
    ];

    for (const { expression, expected, errorCount } of parseCases) {
        parseTest(expression, expected, errorCount);
    }

    for (const { expression, expected, serialise } of evalCases) {
        evalTest(expression, expected, serialise);
    }

    for (const { expression } of compilationFailureCases) {
        compilationFailureTest(expression);
    }

    for (const { expression, expected, serialise } of interpretCases) {
        interpretTest(expression, expected, serialise);
    }
});
