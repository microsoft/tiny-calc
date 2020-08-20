export type ConsumerSet<T> = undefined | T | Array<{ value: T, count: number }>

export function addConsumer<T>(self: ConsumerSet<T>, value: T): ConsumerSet<T> {
    if (self === undefined) {
        return value;
    }

    if (self === value) {
        return [{ value, count: 2 }];
    }

    if (Array.isArray(self)) {
        for (const i of self) {
            if (i.value === value) {
                i.count++;
                return self;
            }
        }

        self.push({ value: value, count: 1 });
        return self;
    } else {
        return [{ value: self, count: 1 }, { value, count: 1 }];
    }
}

export function removeConsumer<T>(self: ConsumerSet<T>, value: T): ConsumerSet<T> {
    if (self === value) {
        return undefined;
    }

    if (Array.isArray(self)) {
        for (let i = 0; i < self.length; i++) {
            const item = self[i];
            if (item.value === value) {
                item.count--;

                if (item.count === 0) {
                    self.splice(/* start: */ i, /* deleteCount: */ 1);
                    i--;
                }

                return self.length === 0
                    ? undefined
                    : self;
            }
        }
    }

    return self;
}

export function forEachConsumer<T>(self: ConsumerSet<T>, callback: (consumer: T, count: number) => void) {
    if (self === undefined) {
        return;
    }

    if (Array.isArray(self)) {
        for (const { value, count } of self) {
            callback(value, count);
        }
    } else {
        callback(/* value: */ self, /* count: */ 1);
    }
}
