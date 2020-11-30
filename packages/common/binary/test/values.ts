import { INumericType } from "./types";

const special = [undefined, null, true, false, NaN, -Infinity, -0, +0, 0.5, "1", +Infinity];

export function getTestValues(type: INumericType): any[] {
    return special.concat([ type.min - 1, type.min, type.max, type.max + 1 ]);
}
