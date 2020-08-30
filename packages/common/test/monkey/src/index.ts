/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Random } from "best-random";

export interface IMonkeyOption {
    scale: number,
    action: () => void,
}

export class Monkey {
    private readonly rng: Random;

    public constructor (seed = (Math.random() * 0x100000000) >>> 0) {
        this.rng = new Random(seed);
    }

    public choose(options: IMonkeyOption[]): void {
        let choice = this.chooseInt(
            /* start: */ 0,
            /* end: */ options.reduce((accumulator, option) => accumulator + option.scale, 0));

        for (const option of options) {
            choice -= option.scale;

            if (choice < 0) {
                option.action();
                return;
            }
        }
    }

    public chooseInt(start: number, end: number): number {
        // eslint-disable-next-line no-bitwise
        return ((this.rng.float64() * (end - start)) | 0) + start;
    }

    public chooseItem<T>(items: T[]): T {
        return items[this.chooseInt(/* start: */ 0, /* end: */ items.length)];
    }

    public chooseString(length: number): string {
        let s = "";
        
        do {
            s += Math.random().toString(36).slice(2);
        } while (s.length < length);

        return s.slice(0, length);
    }
}
