import Record, { Recordable } from "./Record.js";
import Tuple, { Tupleable } from "./Tuple.js";

namespace RecordTuple {
  export type Input = Recordable | Tupleable;
  export type Result<T extends Input> = T extends any[] ? Tuple<T> : Record<T>;

  export namespace deep {
    type DeepMap<T extends Tupleable> = T extends Tuple
      ? T
      : T extends readonly [infer Item, ...infer Rest]
      ? [Item extends Input ? Result<Item> : Item, ...DeepMap<Rest>]
      : T[number] extends never
      ? T
      : T[number] extends Input
      ? Result<T[number]>[]
      : T;
    type DeepRecord<T extends Recordable> = T extends Record
      ? T
      : Record<{
          [Key in keyof T]: T[Key] extends Input ? Result<T[Key]> : T[Key];
        }>;
    export type Result<T extends Input> = T extends Tupleable
      ? Tuple<DeepMap<T>>
      : DeepRecord<T>;
  }
}

function RecordTuple<T extends RecordTuple.Input>(input: T) {
  return (
    Array.isArray(input) ? Tuple.from(input) : Record(input)
  ) as RecordTuple.Result<T>;
}

RecordTuple.deep = <T extends RecordTuple.Input>(
  input: T
): RecordTuple.deep.Result<T> => {
  if (!input || typeof input !== "object")
    throw new TypeError(
      `Expected input to be an object or array, got \`${input}\``
    );

  const refs = new Set();

  return (function next(value = input): any {
    if (refs.has(value)) throw new RecordTuple.CircularReferenceError();
    refs.add(value);

    if (Tuple.isTuple(value) || Record.isRecord(value)) return value;

    if (Array.isArray(value))
      return Tuple.from(
        value.map(
          (item) => item && (typeof item === "object" ? next(item) : item)
        )
      );

    return Record.fromEntries(
      Object.entries(value).map(([k, v]) => [
        k,
        v && (typeof v === "object" ? next(v) : v),
      ])
    );
  })();
};

RecordTuple.CircularReferenceError = class extends TypeError {
  name = "CircularReferenceError";

  constructor(message = "Unexpected circular reference encountered.") {
    super(message);
  }
};

export default RecordTuple;
