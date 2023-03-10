import Tuple, { supportsWeak } from "./Tuple.js";

export type Recordable = Readonly<{
  [key: keyof any]: any;
}>;

type Record<T extends Recordable = Recordable> = T & { __brand: "Record" };

function Record<T extends Recordable>(obj: T) {
  const tuple = Tuple(
    ...Object.entries(obj)
      .sort(([a], [b]) => a.localeCompare(b))
      .map((entry) => Tuple(...entry))
  );

  if (!Record.cache.has(tuple)) {
    const record = Object.freeze({ ...obj });

    Record.cache.set(tuple, record);
    Record.cache.set(record, tuple);
  }

  return Record.cache.get(tuple);
}

Record.cache = supportsWeak ? new WeakMap() : new Map();
Record.isRecord = (maybeRecord: any): maybeRecord is Record =>
  Record.cache.has(maybeRecord) && !Tuple.isTuple(maybeRecord);

export default Record;
