/* emit.cacheUntil emit.if emit.ifListening emit.withContext many on.all once */

import { Track } from "../../../../../../../utils.js";

export { Track };

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

const LISTEN_ALL = Symbol("EventEmitter.LISTEN_ALL");

class EventEmitterConfiguration<
  T extends EventDetails[] = any,
  Context extends any = never
> {
  #listeners = new Map<
    T[number][0] | typeof LISTEN_ALL,
    Set<(...args: any) => any>
  >();

  #cache = new Map<
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
  }

  get on() {
    type Self = EventEmitterConfiguration<T, Context>;

    const on = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,

      handler: HandlerFromData<Details, Context>
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

        if (this.#cache.has(name)) {
          for (const [_name, data, context] of this.#cache.get(name)!)
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
        and: this as Self,
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
        ) => void | Track<T[number][2]>
      ) => this.on(LISTEN_ALL, handler as any),
    });
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
      {
        all: (handler: Parameters<this["on"]["all"]>[0]) => {
          const { off, and } = this.on.all((...args) => {
            off();

            return handler?.(...args);
          });

          return { off, and };
        },
      }
    );
  }

  get many() {
    const many = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      count: number,
      name: E,
      handler: HandlerFromData<Details, Context>
    ) => {
      const { off, and } = this.on(name, (...args) => {
        if (--count === 0) off();

        return handler(...args);
      });

      return { off, and };
    };

    return Object.assign(many, {
      all: (count: number, handler: Parameters<this["on"]["all"]>[0]) => {
        const { off, and } = this.on.all((...args) => {
          if (--count === 0) off();

          return handler?.(...args);
        });

        return { off, and };
      },
    });
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
      {
        all: (handler: Parameters<this["on"]["all"]>[0]) =>
          this.off(LISTEN_ALL, handler as any),
      }
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

          const keys = [_name, LISTEN_ALL];

          const results: Details[2][] = [];
          for (const key of keys)
            if (this.#listeners.has(key))
              if (key === LISTEN_ALL)
                for (const listener of this.#listeners.get(key)!) {
                  const r = listener(
                    _name,
                    _data,

                    _context
                  );
                  if (r instanceof Track) results.push(r.value);
                }
              else
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
