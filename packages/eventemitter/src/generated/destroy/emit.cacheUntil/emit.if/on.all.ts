/* destroy emit.cacheUntil emit.if on.all */

type EventDetails = [name: any, data?: any, returnValue?: any];

type FilterDetailsFromName<
  List extends [name: any, data?: any, returnValue?: any][],
  First
> = List extends [infer Current, ...infer R]
  ? Current extends EventDetails
    ? R extends EventDetails[]
      ? Current[0] extends First
        ? [Current, ...FilterDetailsFromName<R, First>]
        : FilterDetailsFromName<R, First>
      : never
    : never
  : [];

type HandlerFromData<Details extends EventDetails> = (
  data: Details[1]
) => Details[2] extends undefined ? void : Details[2];

const DESTROY_ALL = Symbol("EventEmitter.DESTROY_ALL");

const LISTEN_ALL = Symbol("EventEmitter.LISTEN_ALL");

export default class EventEmitterConfiguration<T extends EventDetails[] = any> {
  #listeners = new Map<
    T[number][0] | typeof LISTEN_ALL,
    Set<(...args: any) => any>
  >();

  private cache = new Map<
    T[number][0] | typeof LISTEN_ALL,
    Set<readonly [name: T[number][0], data: T[number][1]]>
  >();

  constructor() {
    this.destroy = this.destroy.bind(this);
  }

  get on() {
    type Self = EventEmitterConfiguration<T>;
    const self = this;
    const on = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,

      handler: HandlerFromData<Details>
    ): {
      and: Self;
      off: () => {
        and: Self;
        removed: boolean;
      };
    } => {
      if (!this.#listeners.has(name)) this.#listeners.set(name, new Set());

      if (handler) {
        this.#listeners.get(name)!.add(handler);

        if (this.cache.has(name)) {
          for (const [_name, data] of this.cache.get(name)!)
            if (name === LISTEN_ALL) (handler as any)(_name, data);
            else (handler as any)(data);
        }
      }

      return {
        and: this as EventEmitterConfiguration<T>,
        off: () => this.off(name, handler!),
      };
    };

    return Object.assign(on, {
      // Cannot return this type: The inferred type of 'on' references an
      // inaccessible 'this' type. A type annotation is necessary.

      all: (
        handler: (
          name: T[number][0],
          data: T[number][1]
        ) => void | Track<T[number][2]>
      ) => on(LISTEN_ALL, handler as any),
    });
  }

  get off() {
    const off = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,
      handler: HandlerFromData<Details>
    ) => {
      const removed = !!this.#listeners.get(name)?.delete(handler);

      return {
        and: this as EventEmitterConfiguration<T>,
        removed,
      };
    };

    return Object.assign(off, {
      all: (handler: Parameters<this["on"]["all"]>[0]) =>
        off(LISTEN_ALL, handler as any),
    });
  }

  destroy(name: T[number][0] = DESTROY_ALL) {
    if (name === DESTROY_ALL) this.#listeners.clear();
    else this.#listeners.delete(name);
  }

  get emit() {
    let cacheUntil: Promise<any> | null = null;

    const emit = Object.assign(
      <
        E extends T[number][0],
        Details extends FilterDetailsFromName<T, E>[number]
      >(
        name: E,
        ...[data]: Details[1] extends undefined ? [] : [data: Details[1]]
      ) => {
        const keys = [name, LISTEN_ALL];

        const res = [];
        for (const key of keys)
          if (this.#listeners.has(key))
            if (key === LISTEN_ALL)
              for (const listener of this.#listeners.get(key)!) {
                const r = listener(name, data);
                if (r instanceof Track) res.push(r.value);
              }
            else
              for (const listener of this.#listeners.get(key)!)
                res.push(listener(data));

        if (cacheUntil) {
          // Make reference for emitted data, this will allow for easy expiration
          const tracked = [name, data] as const;
          for (const key of keys) {
            if (!this.cache.has(key)) this.cache.set(key, new Set());
            this.cache.get(key)!.add(tracked);
          }

          cacheUntil.then(() => {
            for (const key of keys) this.cache.get(key)!.delete(tracked);
          });
        }

        return res as Details[2][];
      },
      {
        cacheUntil(promise: Promise<any>) {
          cacheUntil = promise;
          return emit;
        },

        /**
         * Too difficult to type fully, this method assumes that argument already has
         * types enforced
         */
        if<
          E extends T[number][0],
          Details extends FilterDetailsFromName<T, E>[number]
        >(
          event:
            | [
                name: E,
                ...maybeData: Details[1] extends undefined
                  ? []
                  : [data: Details[1]]
              ]
            | Falsy
        ) {
          if (event) return emit(...event);
        },
      }
    );

    return emit;
  }
}

export class Track<T> {
  constructor(public value: T) {}
}

export type EventDetailsFromName<
  EE extends EventEmitterConfiguration,
  Name extends EE extends EventEmitterConfiguration<infer Events>
    ? Events[number][0]
    : never
> = FilterDetailsFromName<
  EE extends EventEmitterConfiguration<infer Events> ? Events : never,
  Name
>[number];

type Falsy = false | 0 | "" | null | undefined;
