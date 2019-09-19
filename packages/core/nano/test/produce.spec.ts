import "mocha";
import { strict as assert } from "assert";
import { produce } from "../src/produce";
import { NullConsumer } from "./util";

describe("produce()", () => {
    describe("object", () => {
        it("supports open(), but not openVector()", () => {
            const p = produce({ a: 1 });
            assert.equal("openVector" in p, false);
            const r = p.open(new NullConsumer());
            assert.equal(r.read("a"), 1);
            assert.equal(r.read("b" as any), undefined);
        });
    })

    describe("array", () => {
        it("supports open() and openVector()", () => {
            const p = produce([0]);
            const r = p.open(new NullConsumer());
            assert.equal(r.read("length"), 1);
            assert.equal(r.read("0" as any), 0);
            assert.equal(r.read("1" as any), undefined);

            const v = p.openVector(new NullConsumer());
            assert.equal(v.length, 1);
            assert.equal(v.read(0), 0);
            assert.equal(v.read(1), undefined);
        });
    });
});
