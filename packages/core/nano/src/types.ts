export interface Consumer<V, E = unknown> {
    changed: (producer: Producer<V, E>) => void;
    updates: (producer: Producer<V, E>, newValues: Record<string, V>) => void;
}

export interface CancellationToken {
    isCancellationRequested(): boolean;
}

export enum EnumerationContext {
    Properties,
    Values,
    Both
}

interface EnumerationContextResults<V> {
    [EnumerationContext.Properties]: string;
    [EnumerationContext.Values]: V;
    [EnumerationContext.Both]: { property: string; value: V };
    [custom: string]: any;
}

type EnumerationContextResult<C extends EnumerationContext | string, V> = EnumerationContextResults<V>[C];

export interface Producer<V, E = unknown> {
    id: string;
    
    unsubscribe: (origin: Consumer<V, E>) => void;

    enumerate: <C extends EnumerationContext | string>(
        context: C,
        cancellation: CancellationToken,
        withResults: (results: EnumerationContextResult<C, V>[], done: boolean) => boolean,
        withError: (err?: E) => void
    ) => void;
    
    now: <R>(
        property: string,
        cont: (v: V) => R,
        reject: (err?: E) => R,
        ...args: any[]
    ) => R;
    
    request: <R>(
        origin: Consumer<V, E>,
        property: string,
        cont: (v: V) => R,
        reject: (err?: E) => R,
        ...args: any[]
    ) => R;
}
