/* asyncIterator emit.cacheUntil emit.if emit.withContext once */

import {} from "../../../../../utils.js";

export {};

type EventDetails = EventEmitterConfiguration.EventDetails;

type FilterDetailsFromName<
  List extends [name: any, data?: any, result?: any][],
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

class EventEmitterConfiguration<
  T extends EventDetails[] = any,
  Context extends any = never
> {
  #listeners = new Map<T[number][0], Set<(...args: any) => any>>();

  #cache = new Map<
    T[number][0],
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

        if (this.#cache.has(name)) {
          for (const [_name, data, context] of this.#cache.get(name)!)
            (handler as any)(
              data,

              context
            );
        }
      }

      return {
        and: this as Self,
        off: () => this.off(name, handler!),

        async *[Symbol.asyncIterator]() {
          const buffer: Details[1][] = [];
          let next: ((value: Details[1]) => void) | null = null;

          self.on(name, (data) => {
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

  get once() {
    return Object.assign(
      <
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
      },
      {}
    );
  }

  get off() {
    return Object.assign(
      <
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
      },
      {}
    );
  }

  destroy(name: T[number][0] = DESTROY_ALL) {
    if (name === DESTROY_ALL) this.#listeners.clear();
    else this.#listeners.delete(name);
  }

  get emit() {
    const createEmitter = (options: {
      context?: Context;

      cacheUntil?: Promise<any>;
    }) => {
      const emit = Object.assign(
        <
          E extends T[number][0],
          Details extends FilterDetailsFromName<T, E>[number]
        >(
          name: E,
          ...[data]: Details[1] extends undefined
            ? [data?: undefined]
            : [data: Details[1]]
        ): {
          result: Details[2] | undefined;
          results: Details[2][];
          and: EventEmitterConfiguration<T, Context>;
        } => {
          const [_name, _data, _context] = [name, data, options.context];

          const keys = [_name];

          const results: Details[2][] = [];
          for (const key of keys)
            if (this.#listeners.has(key))
              for (const listener of this.#listeners.get(key)!)
                results.push(
                  listener(
                    _data,

                    _context
                  )
                );

          if (options.cacheUntil) {
            // Make reference for emitted data, this will allow for easy expiration
            const tracked = [_name, _data, _context] as const;
            for (const key of keys) {
              if (!this.#cache.has(key)) this.#cache.set(key, new Set());
              this.#cache.get(key)!.add(tracked);
            }

            options.cacheUntil.then(() => {
              for (const key of keys) this.#cache.get(key)!.delete(tracked);
            });
          }

          return {
            result: results[0],
            results,
            and: this,
          };
        },
        {
          cacheUntil: (promise: Promise<any>) =>
            createEmitter({ ...options, cacheUntil: promise }),

          withContext: (context: Context) =>
            createEmitter({ ...options, context }),

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
                    ? [data?: undefined]
                    : [data: Details[1]]
                ]
              | Falsy
          ) {
            if (event) return emit(...event);
          },
        }
      );
      return emit;
    };

    return createEmitter({});
  }
}

export default EventEmitterConfiguration;

declare namespace EventEmitterConfiguration {
  type Details<EE extends EventEmitterConfiguration> =
    EE extends EventEmitterConfiguration<infer Events> ? Events[number] : never;
  type Name<EE extends EventEmitterConfiguration> = Details<EE>[0];
  type Data<EE extends EventEmitterConfiguration> = Details<EE>[0];
  type Result<EE extends EventEmitterConfiguration> = Details<EE>[0];
  type DetailsFor<
    EE extends EventEmitterConfiguration,
    N extends Name<EE>
  > = FilterDetailsFromName<
    EE extends EventEmitterConfiguration<infer Events> ? Events : never,
    N
  >[number];
  type DataFor<
    EE extends EventEmitterConfiguration,
    N extends Name<EE>
  > = DetailsFor<EE, N>[1];
  type ResultFor<
    EE extends EventEmitterConfiguration,
    N extends Name<EE>
  > = DetailsFor<EE, N>[2];
  type EventDetails = [name: any, data?: any, result?: any];
}

/**
 * @deprecated Use EventEmitterConfiguration.DetailsFor
 */
export type EventDetailsFromName<
  EE extends EventEmitterConfiguration,
  Name extends EE extends EventEmitterConfiguration<infer Events>
    ? Events[number][0]
    : never
> = EventEmitterConfiguration.DetailsFor<EE, Name>;

type Falsy = false | 0 | "" | null | undefined;
