/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Random } from "best-random";

export interface IMonkeyOption<T = void> {
    scale: number,
    action: () => T,
}

export class Monkey {
    private readonly rng: Random;

    public constructor (seed = (Math.random() * 0x100000000) >>> 0) {
        this.rng = new Random(seed);
    }

    public choose<T = void>(options: IMonkeyOption<T>[]): T {
        let choice = this.chooseInt(
            /* start: */ 0,
            /* end: */ options.reduce((accumulator, option) => accumulator + option.scale, 0));

        for (const option of options) {
            choice -= option.scale;

            if (choice < 0) {
                return option.action();
            }
        }

        throw new Error(`'scale' of all options must sum to exactly 1.0, but got '${
            options.reduce((accum, current) => accum + current.scale, 0)
        }'`);
    }

    public chooseInt(start: number, end: number): number {
        // eslint-disable-next-line no-bitwise
        return ((this.rng.float64() * (end - start)) | 0) + start;
    }

    public chooseItem<T>(items: T[]): T {
        return items[this.chooseInt(/* start: */ 0, /* end: */ items.length)];
    }

    public chooseString(length: number, alphabet = " !\"$%&'()*+,/0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[|]^_`abcdefghijklmnopqrstuvwxyz{}~"): string {
        let s = "";

        do {
            s += alphabet[this.chooseInt(0, alphabet.length)];
        } while (s.length < length);

        return s.slice(0, length);
    }
}
