import { suite } from "uvu";
import * as assert from "uvu/assert";
import Record from "./Record";
import RecordTuple from "./RecordTuple";
import Tuple from "./Tuple";

const test = suite("RecordTuple");

test("Creates Record or Tuple", () => {
  assert.is(RecordTuple([]), Tuple());
  assert.is(RecordTuple({}), Record({}));
  assert.is(RecordTuple({}), RecordTuple({}));

  assert.is(RecordTuple([1, 2, 3]), Tuple(1, 2, 3));
  assert.is(RecordTuple({ a: "a", b: "b" }), Record({ a: "a", b: "b" }));
  assert.is(RecordTuple({ a: "a", b: "b" }), RecordTuple({ a: "a", b: "b" }));
});

test(".deep: Empty", () => {
  assert.is(RecordTuple.deep([]), Tuple());
  assert.is(RecordTuple.deep({}), Record({}));
});

test(".deep: Basic", () => {
  assert.is(RecordTuple.deep([]), Tuple());
  assert.is(RecordTuple.deep({}), Record({}));

  assert.is(RecordTuple.deep([1, 2, 3]), Tuple(1, 2, 3));
  assert.is(RecordTuple.deep({ a: "a", b: "b" }), Record({ a: "a", b: "b" }));
});

test(".deep: Tuple nesting", () => {
  assert.is(
    RecordTuple.deep([1, [2, 3], [4, [5, 6]]] as const),
    Tuple(1, Tuple(2, 3), Tuple(4, Tuple(5, 6)))
  );
  assert.is(RecordTuple.deep([[[[[]]]]]), Tuple(Tuple(Tuple(Tuple(Tuple())))));
  assert.is.not(RecordTuple.deep([[[]]]), Tuple(Tuple(Tuple(Tuple()))));
});

test(".deep: Record nesting", () => {
  assert.is(
    RecordTuple.deep({ a: { b: {} }, c: { d: { e: { f: "g" } } } }),
    Record({
      a: Record({ b: Record({}) }),
      c: Record({ d: Record({ e: Record({ f: "g" }) }) }),
    })
  );
  assert.is.not(
    RecordTuple.deep({ a: { b: {} }, c: { d: { e: { f: "g" } } } }),
    Record({
      a: Record({ b: Record({}) }),
      c: Record({ d: Record({ e: Record({ f: 1 }) }) }),
    })
  );
});

test(".deep: Mixed nesting", () => {
  assert.is(
    RecordTuple.deep({
      a: { b: [1, 2, 3] },
      c: { d: { e: { f: [1, [2, 3]] } } },
    }),
    Record({
      a: Record({ b: Tuple(1, 2, 3) }),
      c: Record({ d: Record({ e: Record({ f: Tuple(1, Tuple(2, 3)) }) }) }),
    })
  );
  assert.is(
    RecordTuple.deep([
      { a: "a", b: "b" },
      { c: "c", d: "d" },
    ]),
    Tuple(Record({ a: "a", b: "b" }), Record({ c: "c", d: "d" }))
  );
});

test(".deep: Non-serializables", () => {
  const fn = () => {};
  const symbol = Symbol();

  assert.is(
    RecordTuple.deep({
      fn,
      symbol,
    }),
    Record({
      fn,
      symbol,
    })
  );
});

test(".deep: Stops at record or tuple", () => {
  const shouldNotChangeReference = {
    some: { deep: { object: "value" } },
  };

  assert.is(
    RecordTuple.deep({
      record: Record({ prop: shouldNotChangeReference }),
      tuple: Tuple(shouldNotChangeReference),
    }),
    Record({
      record: Record({ prop: shouldNotChangeReference }),
      tuple: Tuple(shouldNotChangeReference),
    })
  );
});

test.run();
