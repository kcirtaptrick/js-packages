import { suite } from "uvu";
import * as assert from "uvu/assert";
import Record from "./Record.js";
import Tuple from "./Tuple.js";
import { setFlagsFromString } from "v8";
import { runInNewContext } from "vm";

setFlagsFromString("--expose_gc");
const gc = runInNewContext("gc");

const test = suite("Record");

test("Creates record as array", () => {
  assert.equal(Record({}), {});
  assert.equal(Record({ a: "a", b: "b" }), { a: "a", b: "b" });
});

test("Provides structural equality with primitive values", () => {
  assert.is(Record({}), Record({}));
  assert.is(Record({ a: "a", b: "b" }), Record({ a: "a", b: "b" }));
  assert.is.not(Record({ a: "a", b: "b" }), Record({ a: "a" }));
  assert.is.not(Record({ a: "a", b: "b" }), Record({ a: "a", b: "c" }));
  assert.is.not(Record({ a: "a", b: "b" }), Record({ a: "a", c: "b" }));

  const sym = Symbol();
  assert.is(
    Record({ a: true, b: false, c: 0, d: sym, e: null, f: undefined }),
    Record({ a: true, b: false, c: 0, d: sym, e: null, f: undefined })
  );
});

test("Record.isRecord", () => {
  assert.ok(Record.isRecord(Record({ a: "a", b: "b" })));
  assert.not(Record.isRecord(Tuple(1, 2, 3)));
  assert.not(Record.isRecord(Tuple(Tuple("a", "a"))));
});

test("Provides nested structural equality", () => {
  assert.is(
    Record({ a: Record({ a: "a", b: "b" }), b: 1 }),
    Record({ a: Record({ a: "a", b: "b" }), b: 1 })
  );
  assert.is.not(
    Record({ a: Record({ a: "a", b: "b" }), b: 1 }),
    Record({ a: Record({ a: "a", b: "c" }), b: 1 })
  );
});

test("Ignores property ordering", () => {
  assert.is(
    Record({ a: Record({ a: "a", b: "b" }), b: 1 }),
    Record({ a: Record({ b: "b", a: "a" }), b: 1 })
  );
});

test("Creates frozen objects", () => {
  assert.ok(Object.isFrozen(Record({ a: "a", b: "b" })));
  assert.ok(Object.isFrozen(Record({ a: Record({ a: "a", b: "b" }) }).a));
});

test("Works with tuples", () => {
  assert.is(Record({ a: Tuple(1, 2, 3) }), Record({ a: Tuple(1, 2, 3) }));
  assert.is(Record({ a: Tuple(1, 2, 3) }), Record({ a: Tuple(1, 2, 3) }));
});

test("Does not hold references", async () => {
  const ref = new WeakRef(Record({ prop: Symbol() }));
  assert.ok(ref.deref() != null);

  // Schedule macrotask for gc
  await new Promise((resolve) => setTimeout(resolve));

  gc();

  assert.ok(ref.deref() == null);
});

test.run();
