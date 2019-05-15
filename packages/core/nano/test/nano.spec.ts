import { SyntaxKind, ParserSink, createParser } from "../src/parser";
import { compile } from "../src/compiler";
import * as types from "../src/types";
import * as assert from "assert";
import "mocha";

const astSink: ParserSink<object> = {
    lit(value: number | string | boolean, start: number, end: number) {
        return { start, end, value };
    },
    ident(id: string, start: number, end: number) {
        return { start, end, id };
    },
    field(label: string, start: number, end: number) {
        return { start, end, label };
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
    missing(pos: number) {
        return { pos }
    }
};
export const astParse = createParser(astSink);

describe("nano", () => {
    function parseTest(expression: string, expected: object, errorCount: number) {
        it(`Parse: ${expression}`, () => {
            const [errors, ast] = astParse(expression);
            assert.deepEqual(ast, expected);
            assert.strictEqual(errors.length, errorCount);
        });
    }

    function evalTest(expression: string, expected: types.CalcValue) {
        it(`Eval: ${expression}`, () => {
            const f = compile(expression);
            const actual = f(undefined as any, undefined as any);
            assert.strictEqual(actual, expected);
        });
    }

    const parseCases = [
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
                        "left": {
                            "pos": 4
                        },
                        "right": {
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
            errorCount: 1
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
            expression: "FOO(#  ,  # , ##  3  ##, # ##",
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
                                        "label": "B"
                                    }
                                },
                                "right": {
                                    "pos": 4
                                }
                            },
                            "right": {
                                "start": 5,
                                "end": 6,
                                "label": "C"
                            }
                        },
                        "right": {
                            "pos": 7
                        }
                    },
                    "right": {
                        "start": 8,
                        "end": 9,
                        "label": "D"
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
                            "label": "max"
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
                                "label": "Bar"
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
                                        "label": "B"
                                    }
                                },
                                "right": {
                                    "pos": 15
                                }
                            },
                            "right": {
                                "start": 16,
                                "end": 17,
                                "label": "C"
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
    ]

    const evalCases = [
        { expression: "1.3333 + 2.2222", expected: 3.5555 },
        { expression: "1 + 2    + 3 + 4 =   10 - 10 + 10", expected: true },
        { expression: "IF(1*2*3*4<>8, 'hello' + 'world', 10 / 2)", expected: "helloworld" },
        { expression: "IF(1*2*3*4<>24, 'hello' + 'world', 10 / 2)", expected: 5 },
        { expression: "IF(1*2*3*4<>24, 'hello' + 'world')", expected: false },
        { expression: "1*2+3*4", expected: 14 },
        { expression: "4*1*2+3*4", expected: 20 },
        { expression: "4*1*(2+3)*4", expected: 80 },
        {
            expression: `1+1*1+1*1/1+1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1
*1/1+1*1+1*1/1+1+1*1+1*1/1+1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+
1*1+1*1/1+1+1*1+1*1/1+1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1
*1/1+1+1*1+1*1/1+1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+
1+1*1+1*1/1+1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1+1*1
+1*1/1+1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1+1*1+1*1/
1+1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1+1*1+1*1/1`, expected: 112
        }
    ]

    for (const { expression, expected, errorCount } of parseCases) {
        parseTest(expression, expected, errorCount);
    }

    for (const { expression, expected } of evalCases) {
        evalTest(expression, expected);
    }
});
