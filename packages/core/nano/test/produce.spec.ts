import "mocha";
import { strict as assert } from "assert";
import { produce } from "../src/produce";
import { nullConsumer } from "./util";
import { IProducer } from "../src/types";

describe("produce()", () => {
    describe("object", () => {
        it("supports open(), but not openVector()", () => {
            const p = produce({ a: 1 });
            assert.equal("openVector" in p, false);
            const r = p.open(nullConsumer);
            assert.equal(r.get("a"), 1);
            assert.equal(r.get("b" as any), undefined);
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
        });
    });

    describe("array", () => {
        it("supports open() and openVector()", () => {
            const p = produce([0]);
            const r = p.open(nullConsumer);
            assert.equal(r.get("length"), 1);
            assert.equal(r.get("0" as any), 0);
            assert.equal(r.get("1" as any), undefined);

            const v = p.openVector(nullConsumer);
            assert.equal(v.length, 1);
            assert.equal(v.getItem(0), 0);
            assert.equal(v.getItem(1), undefined);
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
        });
    });
});
