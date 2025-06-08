declare global {
  interface SymbolConstructor {
    readonly isTuple: unique symbol;
  }
}

// @ts-expect-error Symbol.isTuple is usually not assignable
if (!Symbol.isTuple) Symbol.isTuple = Symbol("isTuple");

export type Tupleable = readonly any[];

export const supportsWeak = typeof WeakRef !== "undefined";

const finalizer =
  supportsWeak &&
  new FinalizationRegistry<{ tuple: any[]; generation: number }>(
    ({ tuple, generation }) => {
      (function cleanup(current = cache, path = tuple) {
        if (path.length === 0 && generation === current.generation)
          return (current.value = null);

        const key = path.shift();
        const nextCache = current.get(key);
        if (!nextCache) return;

        cleanup(nextCache, path);

        if (!nextCache.value && nextCache.size === 0) current.delete(key);
      })();
    }
  );

type Cache = Map<any, Cache> & {
  value: null | Tuple.Type | WeakRef<Tuple.Type>;
  generation: number;
};

const createCache = () =>
  Object.assign(new Map(), {
    value: null,
    generation: 0,
  }) as Cache;

const cache = createCache();
const tuples = supportsWeak ? new WeakSet<Tuple.Type>() : new Set();

type Tuple<T extends Tupleable = Tupleable> = Tuple.Type<T>;

declare namespace Tuple {
  type Type<T extends Tupleable = Tupleable> = T & {
    readonly [Symbol.isTuple]: true;
  };
}

function Tuple<T extends Tupleable>(...items: T) {
  return Tuple.from(items);
}

Tuple.from = <const T extends Tupleable>(items: T): Tuple.Type<T> => {
  let current = cache;
  let i = 0;

  for (; i < items.length; ++i) {
    const item = items[i];

    if (!current.has(item)) current.set(item, createCache());
    current = current.get(item)!;
  }

  let { value } = current;
  if (value && "deref" in value) value = value.deref() as Tuple.Type | null;
  if (value) return value as Tuple.Type<T>;

  const tuple = Object.freeze(
    Object.assign(items, { [Symbol.isTuple]: true as const })
  );

  current.value = supportsWeak ? new WeakRef(tuple) : tuple;
  if (finalizer)
    finalizer.register(tuple, {
      tuple: [...tuple],
      generation: ++current.generation,
    });

  tuples.add(tuple);

  return tuple;
};

Tuple.isTuple = (maybeTuple: any): maybeTuple is Tuple.Type =>
  tuples.has(maybeTuple);

export default Tuple;
