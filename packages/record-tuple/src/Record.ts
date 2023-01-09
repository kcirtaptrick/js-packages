import Tuple from "./Tuple.js";

type AnyRecord = Readonly<{
  [key: keyof any]: any;
}>;

type Record<T extends AnyRecord = AnyRecord> = T & { __brand: "Record" };

function Record<T extends AnyRecord>(obj: T) {
  const tuple = Tuple(...Object.entries(obj).map((entry) => Tuple(...entry)));

  if (!Record.cache.has(tuple)) {
    const record = Object.freeze({ ...obj });
    Record.cache.set(tuple, record);
    Record.cache.set(record, tuple);
  }

  return Record.cache.get(tuple);
}

Record.cache = new Map();
Record.isRecord = (maybeRecord: any): maybeRecord is Record =>
  Record.cache.has(maybeRecord) && !Tuple.isTuple(maybeRecord);

export default Record;
