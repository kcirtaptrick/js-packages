/* asyncIterator clone emit.cacheUntil emit.if emit.ifListening emit.withContext on.all */

import { Track } from "../../../../../../../utils";

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

const DESTROY_ALL = Symbol("EventEmitter.DESTROY_ALL");

const LISTEN_ALL = Symbol("EventEmitter.LISTEN_ALL");

export default class EventEmitterConfiguration<
  T extends EventDetails[] = any,
  Context extends any = never
> {
  #listeners = new Map<
    T[number][0] | typeof LISTEN_ALL,
    Set<(...args: any) => any>
  >();

  private cache = new Map<
    T[number][0] | typeof LISTEN_ALL,
    Set<
      readonly [
        name: T[number][0],
        data: T[number][1],

        context: Context | undefined
      ]
    >
  >();

  constructor() {
    this.destroy = this.destroy.bind(this);

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

        async *[Symbol.asyncIterator]() {
          const buffer: Details[1][] = [];
          let next: ((value: Details[1]) => void) | null = null;

          if (name === LISTEN_ALL)
            self.on.all((name, data) => {
              const value: any = [name, data];
              if (next) next(value);
              else buffer.push(value);
            });
          else
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

    return Object.assign(on, {
      // Cannot return this type: The inferred type of 'on' references an
      // inaccessible 'this' type. A type annotation is necessary.

      all: (
        handler?: (
          name: T[number][0],
          data: T[number][1],

          context: Context
        ) => void | Track<T[number][2]>
      ): ReturnType<typeof on> & {
        [Symbol.asyncIterator](): AsyncIterableIterator<
          [T[number][0], T[number][1]]
        >;
      } => on(LISTEN_ALL, handler as any),
    });
  }

  [Symbol.asyncIterator]() {
    return this.on.all()[Symbol.asyncIterator]();
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
        removed,
        and: this as EventEmitterConfiguration<T, Context>,
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
    let ctx: Context | undefined = undefined;

    let cacheUntil: Promise<any> | null = null;

    const emit = Object.assign(
      <
        E extends T[number][0],
        Details extends FilterDetailsFromName<T, E>[number]
      >(
        name: E,
        ...[data]: Details[1] extends undefined ? [] : [data: Details[1]]
      ) => {
        const [_name, _data, _ctx] = [name, data, ctx];

        const keys = [_name, LISTEN_ALL];

        const result: Details[2][] = [];
        for (const key of keys)
          if (this.#listeners.has(key))
            if (key === LISTEN_ALL)
              for (const listener of this.#listeners.get(key)!) {
                const r = listener(
                  _name,
                  _data,

                  _ctx
                );
                if (r instanceof Track) result.push(r.value);
              }
            else
              for (const listener of this.#listeners.get(key)!)
                result.push(
                  listener(
                    _data,

                    _ctx
                  )
                );

        if (cacheUntil) {
          // Make reference for emitted data, this will allow for easy expiration
          const tracked = [_name, _data, _ctx] as const;
          for (const key of keys) {
            if (!this.cache.has(key)) this.cache.set(key, new Set());
            this.cache.get(key)!.add(tracked);
          }

          cacheUntil.then(() => {
            for (const key of keys) this.cache.get(key)!.delete(tracked);
          });
        }

        return {
          result,
          and: this as EventEmitterConfiguration<T, Context>,
        };
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

        ifListening: <
          E extends T[number][0],
          Details extends FilterDetailsFromName<T, E>[number]
        >(
          name: E,
          data: () => Details[1]
        ): Details[2][] => {
          if (this.#listeners.has(name) || this.#listeners.has(LISTEN_ALL))
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

type Falsy = false | 0 | "" | null | undefined;
