/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export type TwoFieldItem<T> = Exclude<T, undefined>

export type TwoField<T> = {
    item0?: T;
    items?: T[];
}

export function TwoField_push<T>(self: TwoField<T>, consumer: TwoFieldItem<T>) {
    if (self.item0 === undefined) {
        self.item0 = consumer;
    } else if (self.items === undefined) {
        self.items = [consumer];
    } else {
        self.items.push(consumer);
    }
}

export function TwoField_delete<T>(self: TwoField<T>, consumer: TwoFieldItem<T>) {
    if (self.item0 === undefined) {
        self.item0 = consumer;
    } else if (self.items === undefined) {
        self.items = [consumer];
    } else {
        self.items.push(consumer);
    }
}

export function TwoField_forEach<T>(self: TwoField<T>, callback: (consumer: T) => void): void {
    if (self.item0 === undefined) {
        return;
    }

    callback(self.item0);

    if (self.items !== undefined) {
        for (let i = 0; i < self.items.length; i++) {
            callback(self.items[i]);
        }
    }
}
