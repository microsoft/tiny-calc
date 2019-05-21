export function error(message: string): never {
    throw new Error(message);
}

export function assertNever(proof: never, message: string = "assertNever violation"): never {
    return error(message);
}

export function assert(expression: boolean, message = "False expression"): void {
    if (!expression) {
        return error(message);
    }
}
