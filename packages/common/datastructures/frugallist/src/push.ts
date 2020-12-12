/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FrugalList, FrugalListItem } from "./types";

export function FrugalList_push<T>(self: FrugalList<T>, value: FrugalListItem<T>): FrugalList<T> {
    if (self === undefined) {
        return value;
    }

    if (Array.isArray(self)) {
        self.push(value);
        return self;
    } else {
        return [self, value];
    }
}
