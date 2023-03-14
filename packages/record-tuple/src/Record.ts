import Tuple, { supportsWeak } from "./Tuple.js";

export type Recordable = {
  readonly [key: keyof any]: any;
};

type Record<T extends Recordable = Recordable> = T & { __brand: "Record" };

const tuplesByRecord = supportsWeak ? new WeakMap() : new Map();
const recordsByTuple = supportsWeak ? new WeakMap() : new Map();

export const symbolKeyError = new TypeError(
  "A Symbol cannot be used as a property key in a Record."
);

export const nonRecordError = new TypeError(
  "Record.entries received a non-record."
);

function Record<T extends Recordable>(obj: T): Record<T> {
  if (Object.getOwnPropertySymbols(obj).length > 0) throw symbolKeyError;

  return Record.fromEntries(Object.entries(obj)) as Record<T>;
}

type KeysOfUnion<T> = T extends T ? keyof T : never;

type TupleEntries<T> = Tuple<
  {
    [Key in Exclude<KeysOfUnion<T>, "__brand">]: Tuple<
      [Key, Extract<T, { [k in Key]?: any }>[Key]]
    >;
  }[Exclude<KeysOfUnion<T>, "__brand">][]
>;

Record.entries = <R extends Record>(record: R): TupleEntries<R> => {
  const tuple = tuplesByRecord.get(record);
  if (!tuple) throw nonRecordError;
  return tuple;
};

type FromEntries<Entries extends readonly [string, any][]> = {
  [Key in Entries[number][0]]: Extract<Entries[number], [Key, any]>[1];
};

Record.fromEntries = <Entries extends readonly [string, any][]>(
  entries: Entries
): Record<FromEntries<Entries>> => {
  if (recordsByTuple.has(entries)) return recordsByTuple.get(entries);

  const tuple = Tuple.from(
    [...entries]
      .sort(([a], [b]) => a.localeCompare(b))
      .map((entry) => {
        if (typeof entry[0] === "symbol") throw symbolKeyError;
        return Tuple.from(entry);
      })
  );

  if (!recordsByTuple.has(tuple)) {
    const record = Object.freeze(Object.fromEntries(tuple));

    recordsByTuple.set(tuple, record);
    tuplesByRecord.set(record, tuple);
  }

  return recordsByTuple.get(tuple);
};

Record.isRecord = (maybeRecord: any): maybeRecord is Record =>
  tuplesByRecord.has(maybeRecord);

export default Record;
