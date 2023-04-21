import Tuple, { supportsWeak } from "./Tuple.js";

declare global {
  interface SymbolConstructor {
    readonly isRecord: unique symbol;
  }
}

// @ts-expect-error Symbol.isRecord is usually not assignable
if (!Symbol.isRecord) Symbol.isRecord = Symbol("isRecord");

export type Recordable = {
  readonly [key: keyof any]: any;
};

type Record<T extends Recordable = Recordable> = T & {
  readonly [Symbol.isRecord]: true;
};

const tuplesByRecord = supportsWeak
  ? new WeakMap<Record, Tuple>()
  : (new Map() as never);
const recordsByTuple = supportsWeak
  ? new WeakMap<Tuple, Record>()
  : (new Map() as never);

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
    [Key in Exclude<KeysOfUnion<T>, typeof Symbol.isRecord>]: Tuple<
      [Key, Extract<T, { [k in Key]?: any }>[Key]]
    >;
  }[Exclude<KeysOfUnion<T>, typeof Symbol.isRecord>][]
>;

Record.entries = <R extends Record>(record: R): TupleEntries<R> => {
  const tuple = tuplesByRecord.get(record);
  if (!tuple) throw nonRecordError;
  return tuple as any;
};

type FromEntries<Entries extends readonly [string, any][]> = {
  [Key in Entries[number][0]]: Extract<Entries[number], [Key, any]>[1];
};

Record.fromEntries = <Entries extends readonly [string, any][]>(
  entries: Entries
): Record<FromEntries<Entries>> => {
  // @ts-expect-error `entries` is not necessarily a tuple
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
    const record = Object.freeze(
      Object.assign(Object.fromEntries(tuple), {
        [Symbol.isRecord]: true as const,
      })
    );

    recordsByTuple.set(tuple, record);
    tuplesByRecord.set(record, tuple);
  }

  return recordsByTuple.get(tuple) as any;
};

Record.isRecord = (maybeRecord: any): maybeRecord is Record =>
  tuplesByRecord.has(maybeRecord);

export default Record;
