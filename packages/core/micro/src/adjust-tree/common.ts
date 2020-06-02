export function assert(message: string, cond: boolean): asserts cond {
    if (!cond) {
        console.log(new Error().stack);
        throw message;
    }
}
