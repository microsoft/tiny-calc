/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { FrugalList, FrugalListItem } from "./types";

export function FrugalList_forEach<T>(self: FrugalList<T>, callback: (value: FrugalListItem<T>) => void): void {
    if (self !== undefined) {
        if (Array.isArray(self)) {
            for (let index = 0; index < self.length; index++) {
                callback(self[index]);
            }
        } else {
            callback(/* value: */ self);
        }
    }
}
