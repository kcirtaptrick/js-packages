import Record, { Recordable } from "./Record.js";
import Tuple, { Tupleable } from "./Tuple.js";

namespace RecordTuple {
  export type Input = Recordable | Tupleable;
  export type Result<T extends Input> = T extends any[] ? Tuple<T> : Record<T>;

  export namespace deep {
    type DeepMap<T extends Tupleable> = T extends readonly [
      infer Item,
      ...infer Rest
    ]
      ? [Item extends Input ? Result<Item> : Item, ...DeepMap<Rest>]
      : T[number] extends never
      ? T
      : T[number] extends Input
      ? Result<T[number]>[]
      : T;
    type DeepRecord<T extends Recordable> = Record<{
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
    throw new Error(`RecordTuple.deep: Invalid input ${input}`);

  if (Array.isArray(input))
    return Tuple.from(
      input.map(
        (item) =>
          item && (typeof item === "object" ? RecordTuple.deep(item) : item)
      )
    ) as any;

  return Record.fromEntries(
    Object.entries(input).map(([k, v]) => [
      k,
      v && (typeof v === "object" ? RecordTuple.deep(v) : v),
    ])
  ) as any;
};

export default RecordTuple;
