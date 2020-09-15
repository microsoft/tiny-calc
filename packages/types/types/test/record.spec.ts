/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import { IReader, IWriter, IShapeReader, IShapeWriter } from "../src";

describe("Record", () => {
    describe("must be compatible with ES6 map", () => {
        let map: Map<string, number>;
        let shapeReader: IShapeReader<string>;
        let shapeWriter: IShapeWriter<string>;
        let reader: IReader<Record<string, number | undefined>>;
        let writer: IWriter<Record<string, number>>;

        beforeEach(() => {
            map = new Map<string, number>();
            shapeReader = map;
            shapeWriter = map;
            reader = map;
            writer = map;
        });

        it("ES6 map must satisfy IReader", () => {
            map.set("0", 0);
            assert.equal(reader.get("0"), 0);
        });

        it("ES6 map must satisfy IWriter", () => {
            writer.set("0", 0);
            assert.equal(map.get("0"), 0);
        });

        it("ES6 map must satisfy IShapeReader", () => {
            assert.deepEqual([...shapeReader.keys()], []);

            const keys = ["a", "b", "c"];
            for (const key of keys) {
                assert.equal(shapeReader.has(key), false);
                map.set(key, key.charCodeAt(0));
                assert.equal(shapeReader.has(key), true);
            }

            assert.deepEqual([...shapeReader.keys()], keys);
        });

        it("ES6 map must satisfy IShapeWriter", () => {
            const keys = ["a", "b", "c"];
            for (const key of keys) {
                assert.equal(shapeReader.has(key), false);
                assert.equal(shapeWriter.delete(key), false);

                map.set(key, key.charCodeAt(0));

                assert.equal(shapeReader.has(key), true);
                assert.equal(shapeWriter.delete(key), true);
                assert.equal(shapeReader.has(key), false);
            }
        });

        it("Must support key constraints", () => {
            const map = new Map<"0" | "1", number>([
                ["0", 0],
                ["1", 1],
            ]);

            const reader: IReader<{
                "0": number | undefined,
                "1": number | undefined,
            }> = map;

            assert.equal(reader.get("0"), 0);
            assert.equal(reader.get("1"), 1);

            const writer: IWriter<{
                "0": number | undefined,
                "1": number | undefined,
            }> = map;

            writer.set("0", 0);
            writer.set("1", 1);
        });
    });
});
