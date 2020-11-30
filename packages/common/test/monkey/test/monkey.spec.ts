/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import "mocha";
import { strict as assert } from "assert";
import { Monkey, IMonkeyOption } from "../src";

describe("Monkey", () => {
    let monkey: Monkey;

    beforeEach(() => {
        monkey = new Monkey();
    });


    for (const { start, end } of [
        { start:  0, end: 1 },
        { start: -1, end: 1 },
        { start: -3, end: 5 },
    ]) {
        describe(`chooseInt(min=${start}, max=${end})`, () => {
            const next = () => {
                const actual = monkey.chooseInt(start, end);
                assert(start <= actual && actual < end,
                    `Expected 'chooseInt(${start}, ${end})' to return a value in the range [${start}..${end}] (inclusive), but got '${actual}'.`);
                return actual;
            }

            it(`must produces values in range [${start}..${end})`, () => {
                for (let i = 100; i >= 0; i--) {
                    next();
                }
            });
            it(`must include start value '${start}'`, () => { while (next() !== start); });
            it(`must include end - 1 value '${end - 1}'`, () => { while (next() !== (end - 1)); });
        });
    }

    describe(`chooseString(length=0)`, () => {
        it(`must return empty string`, () => {
            assert.equal(monkey.chooseString(0), "");
        });
    });

    for (const length of [1, 2, 10]) {
        describe(`chooseString(length=${length})`, () => {
            it(`must return expected length=${length}`, () => {
                assert.equal(monkey.chooseString(length).length, length);
            });
            it(`must randomly choose characters`, () => {
                const init = monkey.chooseString(length);
                while (monkey.chooseString(length) === init);
            });
            it(`must choose characters from alphabet="0"`, () => {
                assert.equal(monkey.chooseString(length, "0"), "0".repeat(length));
            });
        });
    }

    for (let count = 1; count < 4; count++) {
        describe(`choose([options=${count}])`, () => {
            const chosen: number[] = new Array(count).fill(0);
            const options: IMonkeyOption[] = new Array(count).fill(undefined).map((_, index) => ({
                scale: 1,
                action: () => { chosen[index]++; }
            }));

            beforeEach(() => { chosen.fill(0); })

            it("Must choose each option", () => {
                do {
                    monkey.choose(options);
                } while (chosen.reduce<boolean>((accumulator, value) => accumulator || (value === 0), false));
            });
        });
    }
});
