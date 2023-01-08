/* asyncIterator clone emit.cacheUntil emit.withContext */

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

export default class EventEmitterConfiguration<
  T extends EventDetails[] = any,
  Context extends any = never
> {
  #listeners = new Map<T[number][0], Set<(...args: any) => any>>();

  private cache = new Map<
    T[number][0],
    Set<
      readonly [name: T[number][0], data: T[number][1], context: Context | null]
    >
  >();

  constructor() {
    this.clone = this.clone.bind(this);
  }

  get on() {
    type Self = EventEmitterConfiguration<T, Context>;
    const self = this;
    const on = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,

      handler?: HandlerFromData<Details, Context>
    ): {
      and: Self;
      off: () => {
        and: Self;
        removed: boolean;
      };

      [Symbol.asyncIterator](): AsyncIterableIterator<Details[1]>;
    } => {
      if (!this.#listeners.has(name)) this.#listeners.set(name, new Set());

      if (handler) {
        this.#listeners.get(name)!.add(handler);

        if (this.cache.has(name)) {
          for (const [_name, data, context] of this.cache.get(name)!)
            (handler as any)(
              data,

              context
            );
        }
      }

      return {
        and: this as EventEmitterConfiguration<T, Context>,
        off: () => this.off(name, handler!),

        async *[Symbol.asyncIterator]() {
          const buffer: Details[1][] = [];
          let next: ((value: Details[1]) => void) | null = null;

          on(name, (data) => {
            if (next) next(data);
            else buffer.push(data);
          });

          while (true) {
            yield await new Promise((resolve) => {
              if (buffer.length > 0) resolve(buffer.shift()!);
              else
                next = (value) => {
                  next = null;
                  resolve(value);
                };
            });
          }
        },
      };
    };

    return Object.assign(on, {});
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
        and: this as EventEmitterConfiguration<T, Context>,
        removed,
      };
    };

    return Object.assign(off, {});
  }

  get emit() {
    let ctx: Context | null = null;

    let cacheUntil: Promise<any> | null = null;

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
          if (this.#listeners.has(key))
            for (const listener of this.#listeners.get(key)!)
              res.push(
                listener(
                  data,

                  ctx
                )
              );

        if (cacheUntil) {
          // Make reference for emitted data, this will allow for easy expiration
          const tracked = [name, data, ctx] as const;
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

        withContext(context: Context) {
          ctx = context;
          return emit;
        },
      }
    );

    return emit;
  }

  clone() {
    const clone = new (this.constructor as any)() as typeof this;

    for (const [key, value] of this.#listeners)
      clone.#listeners.set(key, new Set(value));

    return clone;
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
