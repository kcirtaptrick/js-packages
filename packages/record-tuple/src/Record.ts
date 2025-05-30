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

const tuplesByRecord = supportsWeak
  ? new WeakMap<Record.Type, Tuple.Type>()
  : (new Map() as never);
const recordsByTuple = supportsWeak
  ? new WeakMap<Tuple.Type, Record.Type>()
  : (new Map() as never);

const symbolKeyError = "A Symbol cannot be used as a property key in a Record.";

declare namespace Record {
  type Type<T extends Recordable = Recordable> = T & {
    readonly [Symbol.isRecord]: true;
  };
}

function Record<T extends Recordable>(obj: T): Record.Type<T> {
  if (Record.isRecord(obj)) return obj;

  if (Object.getOwnPropertySymbols(obj).length > 0)
    throw new TypeError(symbolKeyError);

  return Record.fromEntries(Object.entries(obj)) as Record.Type<T>;
}

type KeysOfUnion<T> = T extends T ? keyof T : never;

type TupleEntries<T> = Tuple.Type<
  {
    [Key in Exclude<KeysOfUnion<T>, typeof Symbol.isRecord>]: Tuple.Type<
      [Key, Extract<T, { [k in Key]?: any }>[Key]]
    >;
  }[Exclude<KeysOfUnion<T>, typeof Symbol.isRecord>][]
>;

Record.entries = <R extends Record.Type>(record: R): TupleEntries<R> => {
  const tuple = tuplesByRecord.get(record);
  if (!tuple)
    throw new TypeError("Record.entries unexpectedly received a non-record.");
  return tuple as any;
};

type FromEntries<Entries extends readonly [string, any][]> = {
  [Key in Entries[number][0]]: Extract<Entries[number], [Key, any]>[1];
};

Record.fromEntries = <Entries extends readonly [string, any][]>(
  entries: Entries
): Record.Type<FromEntries<Entries>> => {
  // @ts-expect-error `entries` is not necessarily a tuple
  if (recordsByTuple.has(entries)) return recordsByTuple.get(entries);

  const tuple = Tuple.from(
    [...entries]
      .sort(([a], [b]) => a.localeCompare(b))
      .map((entry) => {
        if (typeof entry[0] === "symbol") throw new TypeError(symbolKeyError);
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

Record.isRecord = (maybeRecord: any): maybeRecord is Record.Type =>
  tuplesByRecord.has(maybeRecord);

export default Record;
