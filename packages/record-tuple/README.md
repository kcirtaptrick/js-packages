# Record & Tuple

[Lightweight](https://bundlephobia.com/package/record-tuple), typed implementation of the [Records and Tuples proposal](https://github.com/tc39/proposal-record-tuple), only supports standard library. See [`@bloomberg/record-tuple-polyfill`](https://www.npmjs.com/package/@bloomberg/record-tuple-polyfill) for experimental syntax support with a [Babel](https://babeljs.io/) transform.

## Installation

```
npm install record-tuple
```

## Basic Usage

```ts
import { Tuple, Record } from "record-tuple";

// Returns native data structures
JSON.stringify(Tuple(1, 2, 3)); // "[1, 2, 3]"
JSON.stringify(Record({ a: "a", b: "b" })); // '{"a":"a","b":"b"}'

// Structural equality
Tuple(1, 2, 3) === Tuple(1, 2, 3); // true
Record({ a: "a", b: "b" }) === Record({ a: "a", b: "b" }); // true

// Records ignore property order
Record({ a: "a", b: "b" }) === Record({ b: "b", a: "a" }); // true
JSON.stringify(Record({ b: "b", a: "a" })); // '{"a":"a","b":"b"}'

// As Map/Set keys
const map = new Map();

map.set(Tuple(1, 2, 3), "value 1");
map.set(Record({ a: "a" }), "value 2");

map.get(Tuple(1, 2, 3)); // "value 1"
map.get(Record({ a: "a" })); // "value 2"

// Types
const tuple: Tuple.Type<[number, number]> = Tuple(1, 2);
// @ts-expect-error
const tuple: Tuple.Type<[number, number]> = [1, 2];
// @ts-expect-error
const tuple: Tuple.Type<[number, number]> = Tuple(1, 2, 3);

const record: Record.Type<{ a: string }> = Record({ a: "a" });
// @ts-expect-error
const record: Record.Type<{ a: string }> = { a: "a" };
// @ts-expect-error
const record: Record.Type<{ a: string }> = Record({ b: "b" });
```

### Why Tuple/Record.Type?

We want to avoid overriding Typescript's first-party `Record` type. We use `Tuple.Type` for consistency, but will continue to provide a `Tuple<...>` alias for convenience.

## RecordTuple

`RecordTuple` allows for generic immutable data structure creation.\
`RecordTuple.deep` does the same, but deeply.

```ts
import { RecordTuple, Tuple, Record } from "record-tuple";

RecordTuple([1, 2, 3]) === Tuple(1, 2, 3);
RecordTuple({ a: "a", b: "b" }) === Record({ a: "a", b: "b" });

RecordTuple.deep([
  { a: "a", b: "b" },
  { c: "c", d: "d" },
]) === Tuple(Record({ a: "a", b: "b" }), Record({ c: "c", d: "d" }));
```
