/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

 import "mocha";
import { strict as assert } from "assert";
import { Random } from "best-random";
import { IVectorConsumer, IVectorReader, IVectorProducer, IVectorWriter, IVectorShapeWriter } from "@tiny-calc/types";
import { DenseVector } from "../src";

export class TestVector<T> implements IVectorConsumer<T> {
    private readonly actual: IVectorReader<T>;
    private readonly consumed: T[] = [];
    private readonly expected: T[] = [];

    public constructor(producer: IVectorProducer<T>, private readonly writer: IVectorWriter<T> & IVectorShapeWriter) {
        this.actual = producer.openVector(this);

        for (let i = 0; i < this.actual.length; i++) {
            this.expected.push(this.actual.getItem(i));
        }

        this.consumed = this.expected.slice(0);
    }

    public splice(start: number, deletedCount: number, ...items: T[]): void {
        this.expected.splice(start, deletedCount, ...items);
        this.writer.splice(start, deletedCount, items.length);
        for (const value of items) {
            this.writer.setItem(start++, value);
        }
        this.check();
    }

    public setItem(index: number, value: T): void {
        this.expected[index] = value;
        this.writer.setItem(index, value);
        this.check();
    }

    public itemsChanged(start: number, removedCount: number, insertedCount: number, producer: IVectorProducer<T>): void {
        const inserted = [];

        for (let i = start; insertedCount > 0; i++, insertedCount--) {
            inserted.push(this.actual.getItem(i));
        }

        this.consumed.splice(start, removedCount, ...inserted);
    }

    public check(): void {
        assert.equal(this.actual.length, this.expected.length);
        assert.equal(this.consumed.length, this.expected.length);

        for (let i = 0; i < this.actual.length; i++) {
            assert.equal(this.actual.getItem(i), this.expected[i]);
            assert.equal(this.consumed[i], this.expected[i]);
        }
    }

    public expect(expected: T[]): void {
        this.check();

        assert.equal(this.actual.length, expected.length);
        for (let i = 0; i < this.actual.length; i++) {
            assert.equal(this.actual.getItem(i), expected[i]);
        }
    }

    public get length(): number { return this.actual.length; }

    public toString(): string {
        this.check();
        return JSON.stringify(this.expected);
    }
}

describe("Vector", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let v: TestVector<any>;

    beforeEach(() => {
        const actual = new DenseVector();
        v = new TestVector(actual, actual);
    });

    afterEach(() => {
        v.check();
    });

    it("insert 1", () => {
        v.splice(/* start: */ 0, /* deleteCount: */ 0, /* items: */ undefined);
        v.expect([ undefined ]);
    });

    it("set 1", () => {
        v.splice(/* start: */ 0, /* deleteCount: */ 0, /* items: */ undefined);
        v.setItem(/* index: */ 0, /* item: */ 1);
        v.expect([ 1 ]);
    });

    it("remove 1", () => {
        v.splice(/* start: */ 0, /* deleteCount: */ 0, /* items: */ 1);
        v.splice(/* start: */ 0, /* deleteCount: */ 1);
        v.expect([]);
    });

    it("stress", () => {
        // Initialize PRNG with given seed.
        const float64 = new Random(42).float64;

        // Returns a pseudorandom 32b integer in the range [0 .. max].
        // eslint-disable-next-line no-bitwise
        const int32 = (max = 0x7FFFFFFF) => (float64() * (max + 1)) | 0;

        // Returns an array with 'n' random values, each in the range [0 .. 99].
        const values = (n: number) => new Array(n)
            .fill(0)
            .map(() => int32(99));

        for (let i = 0; i < 100000; i++) {
            switch (int32(1)) {
                case 0:
                    if (v.length > 0) {
                        const index = int32(v.length);
                        v.setItem(index, int32());
                    }
                    break;
                default:
                    const toRemove = int32(v.length);
                    const start = int32(v.length - toRemove);
                    const toInsert = values(int32(5));

                    v.splice(start, toRemove, toInsert);
                    break;
            }
        }
    });
});
