export type Tupleable = readonly any[];

type Tuple<T extends Tupleable = Tupleable> = T & {
  __brand: "Tuple";
};

export const supportsWeak = typeof WeakRef !== "undefined";

const finalizer =
  supportsWeak &&
  new FinalizationRegistry<{ tuple: any[]; generation: number }>(
    ({ tuple, generation }) => {
      (function cleanup(cache = Tuple.cache, path = tuple) {
        if (path.length === 0 && generation === cache.generation)
          return (cache.value = null);

        const key = path.shift();
        const nextCache = cache.get(key);
        if (!nextCache) return;

        cleanup(nextCache, path);

        if (!nextCache.value && nextCache.size === 0) cache.delete(key);
      })();
    }
  );

type Cache = Map<any, Cache> & {
  value: null | Tuple | WeakRef<Tuple>;
  generation: number;
};

const createCache = () =>
  Object.assign(new Map(), {
    value: null,
    generation: 0,
  }) as Cache;

function Tuple<T extends Tupleable>(...items: T) {
  return (function tupleFrom(index = 0, current = Tuple.cache): Tuple<T> {
    if (index === items.length) {
      let { value } = current;
      if (value && "deref" in value) value = value.deref() as Tuple | null;
      if (value) return value as Tuple<T>;

      const tuple = Object.freeze(items) as unknown as Tuple<T>;

      current.value = supportsWeak ? new WeakRef(tuple) : tuple;
      if (finalizer)
        finalizer.register(tuple, {
          tuple: [...tuple],
          generation: ++current.generation,
        });

      Tuple.tuples.add(tuple);

      return tuple;
    }

    if (!current.has(items[index])) current.set(items[index], createCache());

    return tupleFrom(index + 1, current.get(items[index]));
  })();
}

Tuple.cache = createCache();
Tuple.tuples = supportsWeak ? new WeakSet<Tuple>() : new Set();
Tuple.isTuple = (maybeTuple: any): maybeTuple is Tuple =>
  Tuple.tuples.has(maybeTuple);

export default Tuple;
