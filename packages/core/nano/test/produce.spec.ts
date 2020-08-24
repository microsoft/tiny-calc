import "mocha";
import { strict as assert } from "assert";

import { produce } from "../src/produce";
import { nullConsumer } from "./util";
import { IProducer } from "@tiny-calc/types";

describe("produce()", () => {
    describe("object", () => {
        it("supports open()/producer, but not openVector()/vectorProducer", () => {
            const p = produce({ a: 1 });
            assert.equal("openVector" in p, false);
            assert.equal("vectorProducer" in p, false);
            const r = p.open(nullConsumer);
            assert.equal(r.get("a"), 1);
            assert.equal(r.get("b" as any), undefined);
            r.producer?.close(nullConsumer);
        });

        it("handles cycles", () => {
            const root = { child: undefined };
            const child = { parent: root };
            root.child = child as any;

            const p = produce(root);
            const r = p.open(nullConsumer);
            const childProducer = r.get("child") as unknown as IProducer<any>;
            const childReader = childProducer.open(nullConsumer);
            assert.equal(childReader.get("parent"), p);
            p.close(nullConsumer);
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
            v.vectorProducer.closeVector(nullConsumer);
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
