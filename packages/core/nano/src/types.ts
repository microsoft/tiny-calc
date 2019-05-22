// export type Primitive = number | string | boolean;
// export type CalcValue = Primitive | Producer;

export interface Consumer<T> {
    notify: <K extends keyof T>(property: K, value: T[K]) => void;
    notifyMany: <K extends keyof T>(values: Pick<T, K>) => void;
}

export interface Pending<T> {
    kind: "Pending";
    estimate?: T;
}

export type PickPending<T, K extends keyof T> = { [Key in K]: T[K] | Pending<T[K]> };

export interface Producer<T> {
    id: string;
    unsubscribe: (origin: Consumer<T>) => void;
    
    now: <K extends keyof T>(property: K, ...args: any[]) => T[K] | undefined;
    nowMany: <K extends keyof T>(properties: Record<K, undefined | any[]>) => Partial<Pick<T, K>>;
    
    request: <K extends keyof T>(origin: Consumer<T>, property: K, ...args: any[]) => T[K] | Pending<T[K]>;
    requestMany: <K extends keyof T>(origin: Consumer<T>, properties: Record<K, undefined | any[]>) => PickPending<T,K>;
}
