/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import "mocha";
import { strict as assert } from "assert";

import { produce } from "../src/produce";
import { nullConsumer } from "@tiny-calc-test/type-utils";
import { IProducer } from "@tiny-calc/types";

describe("produce()", () => {
    describe("object", () => {
        it("implements IProducer, but not IVectorProducer", () => {
            const producer = produce({ a: 1 });

            // Must not implement IVectorProducer
            assert.equal("openVector" in producer, false);
            assert.equal("closeVector" in producer, false);

            // Reading a valid key must return the expected value.
            const reader = producer.open(nullConsumer);
            assert.equal(reader.get("a"), 1);

            // Reading a non-existent key must return undefined.
            assert.equal(reader.get("b" as any), undefined);

            // Because the producer is immutable, 'reader.producer' should be undefined.
            assert.equal(reader.producer, undefined);

            // However, the IProducer itself must still expose close.
            producer.close(nullConsumer);
        });

        it("implements IShapeProducer", () => {
            const producer = produce({ a: 1 });

            // Shape reader must return expected values.
            const reader = producer.open(nullConsumer);
            assert.equal(reader.size, 1);
            assert.equal(reader.has("a"), true);
            assert.equal(reader.has("b" as any), false);
            assert.deepEqual([...reader.keys()], ["a"]);

            // Close our reader
            producer.close(nullConsumer);
        });

        it("handles cycles", () => {
            // Create a simple cyclic graph
            const root = { child: undefined };
            const child = { parent: root };
            root.child = child as any;
            const producer = produce(root);

            // Ensure that the cycle was reproduced
            const reader = producer.open(nullConsumer);
            const childProducer = reader.get("child") as unknown as IProducer<any>;
            const childReader = childProducer.open(nullConsumer);
            assert.equal(childReader.get("parent"), producer);

            // Close our readers
            childProducer.close(nullConsumer);
            producer.close(nullConsumer);
        });
    });

    describe("array", () => {
        it("supports both open()/producer and openVector()/vectorProducer", () => {
            const p = produce([0]);
            const r = p.open(nullConsumer);
            assert.equal(r.get("length"), 1);
            assert.equal(r.get("0" as any), 0);
            assert.equal(r.get("1" as any), undefined);
            r.producer?.close(nullConsumer);

            const v = p.openVector(nullConsumer);
            assert.equal(v.length, 1);
            assert.equal(v.getItem(0), 0);
            assert.equal(v.getItem(1), undefined);
            v.vectorProducer?.closeVector(nullConsumer);
        });

        it("handles cycles", () => {
            const root: any[] = [];
            const child = [ root ];
            root.push(child);

            const p = produce(root);
            const r = p.openVector(nullConsumer);
            const childProducer = r.getItem(0);
            const childReader = childProducer.open(nullConsumer);
            assert.equal(childReader.getItem(0), p);
            p.closeVector(nullConsumer);
        });
    });
});
