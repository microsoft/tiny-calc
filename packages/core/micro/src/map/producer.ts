import { IProducer, IReader, IConsumer } from "@tiny-calc/nano";
import { ConsumerSet, addConsumer, removeConsumer, forEachConsumer } from "../consumerset";

export abstract class Producer<TMap> implements IProducer<TMap>, IReader<TMap> {
    private consumers?: ConsumerSet<IConsumer<TMap>>;

    //#region IProducer

    open(consumer: IConsumer<TMap>): IReader<TMap> {
        this.consumers = addConsumer(this.consumers, consumer);
        return this;
    }

    close(consumer: IConsumer<TMap>): void {
        this.consumers = removeConsumer(this.consumers, consumer);
    }

    //#endregion IProducer

    //#region IReader

    public abstract get<K extends keyof TMap>(property: K): TMap[K];

    public get producer() { return this; }

    //#endregion IReader

    protected invalidateValue<K extends keyof TMap>(property: K): void {
        forEachConsumer(this.consumers, (consumer) => {
            consumer.valueChanged(property, this);
        });
    }
}
