export type Primitive = number | string | boolean;
export type CalcValue = Primitive | Producer;

export interface Consumer {
    notify: (producer: Producer, property: string, value: CalcValue) => void;
}

export interface Producer<E = unknown> {
    unsubscribe: (origin: Consumer) => void;
    isProperty: (property: string) => boolean;
    request: <R>(
        origin: Consumer,
        property: string,
        cont: (v: CalcValue) => R,
        reject: (err?: E) => R,
        ...args: any[]
    ) => R;
}
