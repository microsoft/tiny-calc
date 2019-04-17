export type Primitive = number | string | boolean;
export type CalcValue = Primitive | Resource;

export interface CalcHost {
    notify: (resource: Resource, property: string, value: CalcValue) => void;
}

export interface Resource<E = unknown> {
    unsubscribe: (origin: CalcHost) => void;
    isProperty: (property: string) => boolean;
    request: <R>(
        origin: CalcHost,
        property: string,
        cont: (v: CalcValue) => R,
        reject: (err?: E) => R,
        ...args: any[]
    ) => R;
}
