# Initial Specification for tiny-calc

### Overview

Tiny-calc is designed to be a compact but efficient and extensible calculation language. The primary purpose of tiny-calc is to support spreadsheet-style reactive programming across multiple data components. Two primary concepts in tiny-calc are resources and host. Names subject to discussion; producer and consumer seem solid candidates too.

- **Resources**: A resource is any data object that can be queried by tiny-calc programs. Examples include, tables, columns, grids, cells, maps, sliders, graphs, and other tiny-calc programs.
- **Hosts**: A host is any context that can contain a tiny calc program. Examples include tables, columns, grids, cells, and text.

### Resources and Hosts

- **Resources**: Resources are living entities that constantly change: as a resource updates, so do all tiny-calc programs that depend on the program. [JW-NOTE: I've somewhat arbitrarily used the term 'resource' here, but we can find better terminology. Resources are abit like observables but they are not restricted to being asynchronous. We don't want to bake in a push based model as that makes it harder to support things like auto-complete]
- **Hosts**: The primary trait of a tiny-calc host is that it can be invalidated (or dirtied) by resources that have a reference to the host and consider it a dependent. The mapping of a host to a formula is one-to-many. A one-to-one mapping gives the finest granularity of dependency update as invalidation requires the recalc of exactly one formula. A one-to-many mapping is inefficient but easier to implement --- this should be the choice of the host. [JW-NOTE: Does a many-to-(many/one) ever make sense?]

Candidate interfaces for `Resource` and `Host` are:

```ts
interface Resource {
  fixedProperties: () => string[];
  isProperty: (property: string) => boolean;
  request: <R>(
    origin: Host,
    property: string,
    cont: (v: CalcValue) => R,
    reject: (err?: unknown) => R,
    ...args: any[]
  ) => R;
}

interface Host {
  notify: (resource: Resource, property: string) => void;
}
```

Resources are defined by their properties which can be requested. The domain of properties on a resource can be infinite, however there may be a fixed subset that are statically known. Function `fixedProperties` returns this subset that can be used for auto-completing properties on a resource. Predicate `isProperty` determines whether a candidate property is supported by the resource. For example, if a table is a resource then we have have a fixed set of properties such as `"ColA"`, `"ColB"`, `"ColC"`. However, a table should also support all rows as properties, so `"1"`, `"10"`, and `"10:20"`, are all properties but they are not statically presented.

The `request` function will obtain the corresponding value for a property of the resource. Every request comes from an origin, or `Host`. Passing the origin enables dependency generation than creates an edge from the resource to origin. This is how calc-chains can be derived. The `request` function accepts a continuation `cont` that receives the requested property value. Passing a continuation allows us to easily support different programming models, including synchronous and promise-based evaluation. For example:

```ts
const id = <X>(x: X) => x;
const reject = <X>(x: X) => {
  throw "error";
};
declare const host: Calc;
declare const col: Resource;
const result = col.request(host, "Sum", id, reject);
const promisedResult = new Promise<CalcValue>((resolve, reject) => col.request(host, "Sum", resolve, reject));
```

We can compute the sum of a column synchronously by passing the identity function as the continuation. Alternatively, we can wrap the request in a promise to support async workflows. The continuation passing style make it easy to handles errors as we can add a second `catch` continuation.

We might want to consider enforcing a minimum set of properties all resources should satisfy. For example:

- toString: return the string representation of a resource.
- asValue: return the (non resource) calc value for a resource. This would be equivalent to dereferencing for cells if we treat cells as resources.

[JW-NOTE: This level of abstraction comes at a price that we should consider. Do we really want or need to support different evaluation workflows?]

A `Host` is any object that has a `notify` method. The function takes a resource and a property and indicates to the host that the property of the given resource has changed. A couple of design considerations about the type of `notify`. One option is to just make `notify` set some dirty bit so that the resource can re-evaluate its formula:

- `notify: () => void;`

The reason for not choosing this approach is because it rules out true reactive or observable to style programming where the `Host` is effectively an `Observer`. Another approach would be to pass the value in the notification so that `Host` really is an observer of values for that property:

- `notify: (resource: Resource, property: string, value: CalcValue) => void;`

A reason for not choosing this approach would be because it couples invalidation of a resource with its re-computation. If I want to dirty a cell and notify its dependents I must now recompute the cell first to obtain the new value. This may be expensive and the host may not even need the value right now. Additionally, it is possible to support this observer style signature using the currently proposed one with a wrapper function:

```ts
interface Observer {
  notify: (resource: Resource, property: string, value: CalcValue) => void;
}

interface Host {
  notify: (resource: Resource, property) => void;
}

function observerToHost(observer: Observer): Host {
  const host = {
    notify(resource: Resource, property: string) {
      resource.request(
        host,
        property,
        value => observer.notify(resource, property, value),
        () => {
          throw "err";
        }
      );
    }
  };
  return host;
}
```

[JW-NOTE: The Resource/Host model is definitely on open design question so any guidance or alternate design feedback would be great here. In particular, I'm unsure of the type for `Host`. In many ways I like the simplicity of `{ notify: (resource: Resource, property: string, value: CalcValue) => void; }` but I'm unsure about having to pass the value down. How useful is that value, given that we probably need to go off and request all the other dependencies to do a recalc anyway. We can omit the value and encode the observer-stye signature, but at the cost of making an additional request to the resource.]

##### Dynamic Dependencies

Suppose we have the following formula in a text segment. `=IF(A1 < 10, Table1.ColA.Sum, Map2.Pin1.X)` where `A1 = 5`. On the first calc we request `Table1.ColA.Sum`. Suppose we change `A1 = 15` and therefore invalidate the formula. On the second calc we request `Map2.Pin1.X` but do not need `Table1.ColA.Sum`. What happens to the legacy dependency edge that links `Table1.ColA.Sum` to the formula in the text?

The table has no knowledge that the formula was recalculated, so if the table changes it will send a notification to the formula. What do we do in this situation? Possible solutions:

- Just recalculate the formula again. This is unnecessary work and incorrect in the presence of side-effects. This still leaves the issue of the legacy dependency. We could keep it around, and occasionally garbage collect by deleting dependencies after a notification. We could also delete after every notification, but this introduces high churn on dependency tracking.
- Forbid dynamic dependencies altogether. We probably don't want to enforce this restriction. Furthermore, it doesn't solve the case where we may delete a formula or host. Any resources will still cling on to a reference, preventing it from being garbage collected.
- Calc Versions. Each host maintains a version id that is sent with every request to a resource and incremented before every new calc. When a resource notifies a host it sends this corresponding id back. If the host receives a notification that is different from its id it ignores the notification and instead unsubscribes to the resource. This tells the resource to delete its dependency. A host can effectively be deleted in all global graphs by bumping its version id without doing a calc.

[JW-NOTE: If there is a standard/better way to handle this sort of dynamic dependency behavior we should do that instead. How can we make handling this process easier for implementors? I also think it might be worth having some property on a host that indicates whether it is even capable of generating dynamic dependencies. Most formulas wont have them, and knowing that is a useful fact for resources.]

### Language Definition

#### Goals

Defining characteristics of tiny-calc should be:

- **Compositional**: Resources should nest arbitrarily so that it is easy to build rich applications that host calculation.
- **Dot-driven**: The primary mechanism for building _tiny-calc's_ and exploring resources is through dot-completion. Editing experience is a core feature of the language design.
- **Stateless**: Tiny-calc programs should be pure functional programs. State is encapsulated in the resources that calculations may depend on, not the calculations themselves.
- **Message Passing**: Passing messages to resources should be preferred over passing significant amounts of data. An example is the formula `=SUM(ColumnA)`. If we consider the column `ColumnA` as a resource then the preferred way to evaluate the formula is to send a `SUM` message to the resource, rather than pull in the values and sum them within tiny-calc. This lets resources efficiently implement traversals based on their data representation, rather than forcing everything into a single tiny-calc representation.

#### Language Definition

We start with candidate overview of the tiny-calc language.

##### Values

```ts
type CalcValue = number | string | boolean | Resource | Lambda;
```

The language of values includes primitives, resources, and lambda values. Errors values are currently missing; they could be first-class or instances of `Resource`. We need to decide on an error handling model, possibly compatible with spreadsheet systems. Lambdas are distinguished first-class values. There are no record values as these can be viewed as a specialized form of `Resource`. The primary motivation for that is because we want dot-completion to be consistent across resources, like tables, and record values. Arrays should also be first-class, probably using plain JS arrays.

##### Terms

The initial grammar for tiny-calc is:

```
(Tiny Calc) F ::= k | I | F(...F') | FUN(...I, F) | F.l | F binop F'
(Constants) k ::= 1 | 2 | 3 ... | true | false | ...
(Labels)    l ::= I | 'some string'
```

where `k` ranges over constant values, `I` ranges over identifiers, `l` ranges over property labels. Terms include n-ary application, functions definitions, field access, and binary operators (and also unary).

##### Parsing

Parsing should call into a generic consumer interface. For example:

```ts
interface Parser<R> {
  lit: (value: number | string | boolean) => R;
  ident: (id: string, quoted: boolean) => R;
  fun: (identifer: string[], body: R) => R;
  app: (head: R, ...args: R[]) => R;
  dot: (left: R, right: R) => R;
  binOp: (op: Op, left: R, right: R) => R;
}
```

A string to string parser for direct compilation to JavaScript would be of type `Parser<string>`. A string to AST parser would have type `Parser<AST>`, for some abstract syntax tree type.

[JW-NOTE: Where should spans fit in? Does this approach extend to incremental parsing?]

Parsing should probably be aware of the host and context we are parsing in, as we may need to resolve labels in some context sensitive way (such as relative cell references).

##### Evaluation Model

Every tiny-calc program defines a function of the following type.

```ts
type Formula = (host: Host, context: Resource) => CalcValue;
```

The host is the location of the formula. The context is the initial resource in scope, or global namespace. For example, a formula `=ROW`, can be desugared as `context.request(host, "ROW", ...)`. Library functions should be attached as properties on the initial context resource. We probably want some efficient way of representing this (the same goes for local variables bound by lambda's).

An object can simultaneously be a `CalcHost` and a `Resource`. For example, a cell is both a host and resource with attributes `ROW` and `COL`. However, it is not the case that an object is always both which is why there are two distinct arguments in the function type `Formula`.

Not all `CalcHosts` are `Resources`: a formula in a piece of text may host a calculation but export no attributes for other formulas to read.

Not all `Resources` are `Hosts`. A dictionary value is a type of resource, but does not hold tiny-calc programs.

##### Overloading and Extensibility.

One design question is around the model of extensibility, and how we let resources interact with certain operations. For example, what is the meaning of application `F(...F1)` when `F` evaluates to a resource? What is the meaning of `F1 + F2` when `F1` evaluates to a resource?

Options include, but are not limited to:

- We just error out.
- We request the `asValue` property of the resource and compute with the returned value. For example, `A1 + A2` effectively desugars to:
  - `context.request(host, "A1").request(host, "asValue") + context.request(host, "A2").request(host, "asValue")`
- We let the resource try and handle the operation. For example, `A1 + A2` effectively desugars to:
  - `context.request(host, "A1").request(host, "ADD", context.request(host, "A2"))`
  - In effect, we call the `ADD` method of `A1` with argument `A2`.
- We have a hybrid approach: First try and detect an overload, otherwise fallback to `asValue`.

##### Compilation

Formulas should compile to JavaScript functions of the type:

```ts
(host: Host, context: Resource) => CalcValue;
```

[JW-NOTE: We might want to encode run-time errors here, so the result type is actually `Result<CalcValue, Error>`. Some thought is needed on this. It can be pretty robust but also verbose to deal with. If we make `Result` a `Thenable` interface then we can easily have asynchronous formulas of the type `(host: Host, context: Resource) => Promise<CalcValue>;`]

Example 1, assuming synchronous evaluation:

- `=Table1.ColumnA.Sum` compiles to
- `(context, host) => context.request(host, 'Table1', id).request(host, 'ColumnA', id).request(host, 'Sum', id)`

Example 2, assuming synchronous evaluation:

- `=Table1.ColumnA.Sum + Table1.ColumnB.Max` compiles to

```ts
(context, host) =>
  calc.add(
    context
      .request(host, "Table1", id)
      .request(host, "ColumnA", id)
      .request(host, "Sum", id),
    context
      .request(host, "Table1", id)
      .request(host, "ColumnB", id)
      .request(host, "Max", id)
  );
```

where `calc.add` is the `+` operator with the following semantics. Given `calc.add(a,b)`

- If `a` evaluates to a resource handle `add` using the extensibility model we define.
- If `b` evaluates to a resource handle `add` using the extensibility model we define (assuming `a` is not a resource).
- Otherwise, return `a + b`.

[JW-NOTE: What happens if `a` or `b` are errors?]

##### Efficient compilation

The example `=Table1.ColumnA.Sum + Table1.ColumnB.Max` compiles to (somewhat) verbose code. This gives us a great deal of flexibility but may often be too general and impact performance. In some cases the ideal code to generate would be

```ts
(context, host) => context.Table1.ColumnA.Sum + context.Table1.ColumnB.Max;
```

where we can actually benefit from inlining caching, and we use the raw `+` operator. This is especially true if we use resources that effectively represent records, or JavaScript objects with fixed properties. To be able to support this type of compilation one proposal is the notion of _resource schemas_.

A resource schema is a static description of a resource (or its type) that is attached to the resource and available during parse. A schema for our context resource might look like:

```ts
const contextSchema = {
  Table1: {
    ColumnA: {
      Sum: "number",
      Max: "number"
    },
    ColumnB: {
      Sum: "number",
      Max: "number"
    }
  }
};
```

Schemas would subsume the `fixedProperties` method on resources, and can additionally come with doc-strings to improve autocompletion and formula authoring. Schemas should be an optional feature so that users do not have to write them.

#### Tiny-Calc Eco-system

What is tiny-calc? At the core tiny calc is a set of interfaces that describe resources and hosts, and a compilation mechanism to turn formulas into context dependent functions. Tiny-calc will come with some built-in operators and functions, but most of the functionality is provided by the client's implementation of resources, and how they combine hosts and resources. For example, tiny-calc does no dependency tracking, and lets each resource handle its dependencies.

Moving forward, we probably want to have a library of common resource implementations (tables, cells, etc), as well as robust libraries for dependency tracking of different forms (for example, specialized to sparse 2-d grids). Additionally, there should be a language-service like api for building out good editing experiences.
