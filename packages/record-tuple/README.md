# Record & Tuple

Lightweight, typed implementation of the [Records and Tuples proposal](https://github.com/tc39/proposal-record-tuple), only supports standard library. See [`@bloomberg/record-tuple-polyfill`](https://www.npmjs.com/package/@bloomberg/record-tuple-polyfill) for experimental syntax support with a babel transform.

## Installation

```
npm install record-tuple
```

## Usage

```ts
import { Tuple, Record } from "record-tuple";

// Structural equality
Tuple(1, 2, 3) === Tuple(1, 2, 3); // true
Record({ a: "a", b: "b" }) === Record({ a: "a", b: "b" }); // true

// As Map/Set keys
const map = new Map();

map.set(Tuple(1, 2, 3), "value 1");
map.set(Record({ a: "a" }), "value 2");

map.get(Tuple(1, 2, 3)); // "value 1"
map.get(Record({ a: "a" })); // "value 2"

// Types
const tuple: Tuple<number, number> = Tuple(1, 2);
const tuple: Tuple<number, number> = [1, 2]; // TypeError
const tuple: Tuple<number, number> = Tuple(1, 2, 3); // TypeError

const record: Record<{ a: string }> = Record({ a: "a" });
const record: Record<{ a: string }> = { a: "a" }; // TypeError
```
