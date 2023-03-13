import Tuple, { supportsWeak } from "./Tuple.js";

export type Recordable = Readonly<{
  [key: keyof any]: any;
}>;

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

  return Record.fromEntries(Object.entries(obj));
}

Record.entries = <R extends Record>(
  record: R
): Tuple<Tuple<[string, any]>[]> => {
  const tuple = tuplesByRecord.get(record);
  if (!tuple) throw nonRecordError;
  return tuple;
};

Record.fromEntries = <Entries extends [string, any][]>(entries: Entries) => {
  if (recordsByTuple.has(entries)) return recordsByTuple.get(entries);

  const tuple = Tuple.from(
    entries
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
