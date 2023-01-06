/* asyncIterator emit.cacheFor emit.if emit.ifListening once */

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

export default class EventEmitterConfiguration<T extends EventDetails[] = any> {
  listeners = new Map<T[number][0], Set<(...args: any) => any>>();

  private cache = new Map<
    T[number][0],
    Set<readonly [name: T[number][0], data: T[number][1]]>
  >();

  constructor() {
    this.asyncIteratorFor = this.asyncIteratorFor.bind(this);
  }

  get on() {
    const on = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,
      handler: HandlerFromData<Details>
    ) => {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());

      this.listeners.get(name)!.add(handler);

      if (this.cache.has(name)) {
        for (const [_name, data] of this.cache.get(name)!)
          (handler as any)(data);
      }

      return {
        and: this as EventEmitterConfiguration<T>,
        off: () => this.off(name, handler),
      };
    };

    return Object.assign(on, {});
  }

  get once() {
    const once = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,
      handler: HandlerFromData<Details>
    ) => {
      const { off, and } = this.on(name, (...args) => {
        off();

        return handler(...args);
      });

      return { off, and };
    };

    return Object.assign(once, {});
  }

  async *asyncIteratorFor<E extends T[number][0]>(
    name: E
  ): AsyncIterableIterator<FilterDetailsFromName<T, E>[number]> {
    while (true) {
      yield await new Promise((resolve) => {
        const { off } = this.on(name, (data) => {
          resolve(data);
          off();
        });
      });
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<
    [name: T[number][0], data: T[number][1]]
  > {
    while (true) {
      yield await new Promise((resolve) => {
        const { off } = this.on(name, (data) => {
          resolve(data);
          off();
        });
      });
    }
  }

  get off() {
    const off = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,
      handler: HandlerFromData<Details>
    ) => {
      const removed = !!this.listeners.get(name)?.delete(handler);

      return {
        and: this as EventEmitterConfiguration<T>,
        removed,
      };
    };

    return Object.assign(off, {});
  }

  get emit() {
    let cacheTime = 0;

    const emit = Object.assign(
      <
        E extends T[number][0],
        Details extends FilterDetailsFromName<T, E>[number]
      >(
        name: E,
        ...[data]: Details[1] extends undefined ? [] : [data: Details[1]]
      ) => {
        const keys = [name];

        const res = [];
        for (const key of keys)
          if (this.listeners.has(key))
            for (const listener of this.listeners.get(key)!)
              res.push(listener(data));

        if (cacheTime > 0) {
          // Make reference for emitted data, this will allow for easy expiration
          const tracked = [name, data] as const;
          for (const key of keys) {
            if (!this.cache.has(key)) this.cache.set(key, new Set());
            this.cache.get(key)!.add(tracked);
          }

          if (cacheTime !== Infinity)
            setTimeout(() => {
              for (const key of keys) this.cache.get(key)!.delete(tracked);
            }, cacheTime);
        }

        return res as Details[2][];
      },
      {
        cacheFor(ms: number) {
          cacheTime = ms;
          return emit;
        },

        ifListening: <
          E extends T[number][0],
          Details extends FilterDetailsFromName<T, E>[number]
        >(
          name: E,
          data: () => Details[1]
        ): Details[2][] => {
          if (this.listeners.has(name)) return (emit as any)(name, data());

          return [];
        },

        /**
         * Too difficult to type fully, this method assumes that argument already has
         * types enforced
         */
        if<
          E extends T[number][0],
          Details extends FilterDetailsFromName<T, E>[number]
        >(
          event: [
            name: E,
            ...maybeData: Details[1] extends undefined ? [] : [data: Details[1]]
          ]
        ) {
          if (event) return emit(...event);
        },
      }
    );

    return emit;
  }
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
