type Tuple<T extends any[] = any[]> = T & { __brand: "Tuple" };

const value = Symbol("value");

function Tuple<T extends any[]>(...items: T) {
  return (function tupleFrom(index = 0, current = Tuple.cache): Tuple<T> {
    if (index === items.length) {
      if (!current.has(value)) {
        const tuple = Object.freeze(items);
        current.set(value, tuple);
        Tuple.tuples.add(tuple);
      }
      return current.get(value);
    }

    if (!current.has(items[index])) current.set(items[index], new Map());

    return tupleFrom(index + 1, current.get(items[index]));
  })();
}

Tuple.cache = new Map();
Tuple.tuples = new Set();
Tuple.isTuple = (maybeTuple: any[]): maybeTuple is Tuple =>
  Tuple.tuples.has(maybeTuple);

export default Tuple;
