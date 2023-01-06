/* emit.cacheFor emit.if emit.ifListening emit.withContext on.all once */

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

type HandlerFromData<
  Details extends EventDetails,
  Context extends any = never
> = (
  data: Details[1],

  context?: Context
) => Details[2] extends undefined ? void : Details[2];

const LISTEN_ALL = Symbol("EventEmitter.LISTEN_ALL");

export default class EventEmitterConfiguration<
  T extends EventDetails[] = any,
  Context extends any = never
> {
  listeners = new Map<
    T[number][0] | typeof LISTEN_ALL,
    Set<(...args: any) => any>
  >();

  private cache = new Map<
    T[number][0] | typeof LISTEN_ALL,
    Set<
      readonly [name: T[number][0], data: T[number][1], context: Context | null]
    >
  >();

  constructor() {}

  get on() {
    const on = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,

      handler: HandlerFromData<Details, Context>
    ) => {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());

      if (handler) {
        this.listeners.get(name)!.add(handler);

        if (this.cache.has(name)) {
          for (const [_name, data, context] of this.cache.get(name)!)
            if (name === LISTEN_ALL)
              (handler as any)(
                _name,
                data,

                context
              );
            else
              (handler as any)(
                data,

                context
              );
        }
      }

      return {
        and: this as EventEmitterConfiguration<T, Context>,
        off: () => this.off(name, handler!),
      };
    };

    return Object.assign(on, {
      // Cannot return this type: The inferred type of 'on' references an
      // inaccessible 'this' type. A type annotation is necessary.
      all: (
        handler: (
          name: T[number][0],
          data: T[number][1],

          context: Context
        ) => void | typeof EventEmitterConfiguration.Track
      ) => ({
        ...on(LISTEN_ALL, handler as any),
      }),
    });
  }

  get once() {
    const once = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,
      handler: HandlerFromData<Details, Context>
    ) => {
      const { off, and } = this.on(name, (...args) => {
        off();

        return handler(...args);
      });

      return { off, and };
    };

    return Object.assign(once, {
      all: (handler: Parameters<this["on"]["all"]>[0]) => {
        const { off, and } = this.on.all((...args) => {
          off();

          return handler?.(...args);
        });

        return { off, and };
      },
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
      const removed = !!this.listeners.get(name)?.delete(handler);

      return {
        and: this as EventEmitterConfiguration<T, Context>,
        removed,
      };
    };

    return Object.assign(off, {
      all: (handler: Parameters<this["on"]["all"]>[0]) =>
        off(LISTEN_ALL, handler as any),
    });
  }

  get emit() {
    let ctx: Context | null = null;

    let cacheTime = 0;

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
          if (this.listeners.has(key))
            if (key === LISTEN_ALL)
              for (const listener of this.listeners.get(key)!) {
                const r = listener(
                  name,
                  data,

                  ctx
                );
                if (r instanceof EventEmitterConfiguration.Track)
                  res.push(r.value);
              }
            else
              for (const listener of this.listeners.get(key)!)
                res.push(
                  listener(
                    data,

                    ctx
                  )
                );

        if (cacheTime > 0) {
          // Make reference for emitted data, this will allow for easy expiration
          const tracked = [name, data, ctx] as const;
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

        withContext(context: Context) {
          ctx = context;
          return emit;
        },

        ifListening: <
          E extends T[number][0],
          Details extends FilterDetailsFromName<T, E>[number]
        >(
          name: E,
          data: () => Details[1]
        ): Details[2][] => {
          if (this.listeners.has(name) || this.listeners.has(LISTEN_ALL))
            return (emit as any)(name, data());

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

  static Track = class {
    constructor(public value: any) {}
  };
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
