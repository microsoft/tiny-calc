import { Consumer, Producer } from "./types";

export const nilConsumer: Consumer<unknown> = {
    changed: () => { },
    updates: () => { }
}

export const nilProducer: Producer<never> = {
    id: "NilProducer",
    unsubscribe: () => { },
    enumerate: () => { },
    now: (_p, _cont, reject) => reject(),
    request: (_o, _p, _cont, reject) => reject(),
}
