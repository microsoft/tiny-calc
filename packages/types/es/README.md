# @tiny-calc/types
Efficient interfaces for reading, writing, and observing changes in structured data.

Includes interfaces for:
* Record / Map
* Vector (1D array)
* Matrix (2D array)
* Tree

## About
The @tiny-calc/types are lightweight interfaces that enable interoperation between systems that observe and react to data changes.  The @tiny-calc/types interfaces are designed to support efficient [incremental computation](https://en.wikipedia.org/wiki/Incremental_computing) in a variety of workloads and mixed programming models.

## Design
### IProducer / IConsumer
There are two basic contracts:
* Producers produce values and change notifications
* Consumers read data and receive notifications as data changes.

Observable data structures implement the IProducer contract.  Observers subscribe to change notifications via the IConsumer callback interface.

```ts
const map = new MapProducer();

// Subscribe to change notifications
map.open(/* IConsumer */ {
    valueChanged: (key: string) => {
        console.log(`New ${key}: ${map.get(key)}`);
    }
});

map.set("answer", 42);      // prints "New answer: 42"
```

In addition to the basic producer contract, there are specialized versions for vectors, matrices, and trees that provide more efficient/fine-grained change notifications for these types (e.g., notifications when rows have been inserted into a matrix.)

### Transform Pattern
A transform is an object that is both a consumer and a producer.  A typical example is a filter transform which consumes values from upstream producers, calculates which items to include, and notifies downstream consumers of any changes.

Note that transforms can be chained (e.g., the output of one transform can be the input of the next), making transforms reusable building blocks for assembling incremental calculations.

### IReader / IWriter
To support multiple programming paradigms, the IReader/IWriter aspects are surfaced as separate interfaces.  A typical data types typically implement all three: IProducer / IReader / IWriter, which supports a traditional/imperative style:

```ts
const map = new MapProducer();
map.set("answer", 42);
map.get("answer");
```

However, a program may upcast to more restrictive contracts.  (For example, to prevent transforms from writing to their inputs or reading from their outputs.)

Upcasting to IProducer is useful for ensuring that consumers remember to subscribe to change notifications:

```ts
const producer: IProducer = map;    // Capability to observe
const writer: IWriter = map;        // Capability to write

// To read, an observer must subscribe to change notifications.
const reader = producer.open({
    console.log(`New ${key}: ${reader.get(key)}`);
});

writer.set("answer");
```

### IProducer / IShapeProducer
There are distinct contracts for talking about the values of a data type vs. the shape of the data.  This allows multiple produces to share the same shape.  For example, you might have two matrices, one which contains spreadsheet formulas and one which contains style information describing how to format the cells for display.  These matrices share the same shape (i.e., inserting a row or col effects both simultaneously), but have separate storage for their values.

Producers, readers, and consumers are implicitly shape producers, readers, and consumers.  However, writers are not implicitly shape writers.  That is, the capabilities to write cells in a matrix and the capability to resize a matrix are distinct.