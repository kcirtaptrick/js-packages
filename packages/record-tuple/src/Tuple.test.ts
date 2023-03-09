import { suite } from "uvu";
import * as assert from "uvu/assert";
import Record from "./Record.js";
import Tuple from "./Tuple.js";
import { setFlagsFromString } from "v8";
import { runInNewContext } from "vm";

setFlagsFromString("--expose_gc");
const gc = runInNewContext("gc");

const test = suite("Tuple");

test("Creates tuple as array", () => {
  assert.equal(Tuple(), []);
  assert.instance(Tuple(), Array);
  assert.equal(Tuple(1, 2, 3), [1, 2, 3]);
  assert.instance(Tuple(1, 2, 3), Array);
});

test("Provides structural equality with primitive elements", () => {
  assert.is(Tuple(), Tuple());
  assert.is(Tuple(1, 2, 3), Tuple(1, 2, 3));
  assert.is.not(Tuple(1, 2, 3), Tuple(1, 2));
  assert.is.not(Tuple(1, 2, 3), Tuple(1, 2, 4));

  const sym = Symbol();
  assert.is(
    Tuple(true, false, "string", sym, null, undefined),
    Tuple(true, false, "string", sym, null, undefined)
  );
});

test("Tuple.isTuple", () => {
  assert.ok(Tuple.isTuple(Tuple(1, 2, 3)));
  assert.not(Tuple.isTuple([1, 2, 3]));
  assert.not(Tuple.isTuple(Object.assign([1, 2, 3], { isTuple: true })));
  assert.not(Tuple.isTuple(Record({ a: "a" })));
});

test("Provides nested structural equality", () => {
  assert.is(
    Tuple(Tuple(1, 2, 3), 4, Tuple(5, 6, 7)),
    Tuple(Tuple(1, 2, 3), 4, Tuple(5, 6, 7))
  );
  assert.is.not(
    Tuple(Tuple(1, 2, 3), 4, Tuple(5, 6, 7)),
    Tuple(Tuple(1, 2, 4), 4, Tuple(5, 6, 7))
  );
});

test("Creates frozen objects", () => {
  assert.ok(Object.isFrozen(Tuple(1, 2, 3)));
  assert.ok(Object.isFrozen(Tuple(Tuple(1, 2, 3), 2, 3)[0]));
});

test("Works with Records", () => {
  assert.is(Tuple(Record({})), Tuple(Record({})));
  assert.is(
    Tuple(1, Record({ a: "a", b: "b" }), 2),
    Tuple(1, Record({ a: "a", b: "b" }), 2)
  );
});

test("Does not hold references", async () => {
  const ref = new WeakRef(Tuple(Symbol()));
  assert.ok(ref.deref() != null);

  await new Promise((resolve) => setTimeout(resolve));

  gc();

  assert.ok(ref.deref() == null);
});

test.run();
