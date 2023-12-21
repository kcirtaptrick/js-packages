/* emit.cacheUntil middleware once */

import { Abort } from "../../../utils.js";

export { Abort };

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

type HandlerFromData<Details extends EventDetails> = (
  data: Details[1]
) => Details[2] extends undefined ? void : Details[2];

const DESTROY_ALL = Symbol("EventEmitter.DESTROY_ALL");

class EventEmitterConfiguration<T extends EventDetails[] = any> {
  #listeners = new Map<T[number][0], Set<(...args: any) => any>>();

  #cache = new Map<
    T[number][0],
    Set<readonly [name: T[number][0], data: T[number][1]]>
  >();

  #middleware = new Set<Middleware<T>>();

  constructor() {
    this.destroy = this.destroy.bind(this);

    this.use = this.use.bind(this);
    this.unuse = this.unuse.bind(this);
  }

  use(middleware: Middleware<T>) {
    this.#middleware.add(middleware);

    return {
      and: this as EventEmitterConfiguration<T>,
      unuse: () => {
        this.#middleware.delete(middleware);
      },
    };
  }

  unuse(middleware: Middleware<T>) {
    const removed = this.#middleware.delete(middleware);

    return {
      removed,
      and: this as EventEmitterConfiguration<T>,
    };
  }

  get #applyMiddleware() {
    return ((event, details) => {
      let payload = [event, details] as Exclude<
        ReturnType<Middleware<T>>,
        Abort
      >;

      for (const middleware of this.#middleware) {
        const result = middleware(...payload);
        if (result instanceof Abort) return result;

        payload = result;
      }

      return payload;
    }) as Middleware<T>;
  }

  get on() {
    type Self = EventEmitterConfiguration<T>;

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

        if (this.#cache.has(name)) {
          for (const [_name, data] of this.#cache.get(name)!)
            (handler as any)(data);
        }
      }

      return {
        and: this as Self,
        off: () => this.off(name, handler!),
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
        handler: HandlerFromData<Details>
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
          and: this as EventEmitterConfiguration<T>,
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
    const createEmitter = (options: { cacheUntil?: Promise<any> }) => {
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
          and: EventEmitterConfiguration<T>;

          abortedWith: Abort | null;
        } => {
          const middlwareResult = this.#applyMiddleware(name, data);
          if (middlwareResult instanceof Abort)
            return {
              result: undefined,
              results: [],
              and: this,
              abortedWith: middlwareResult,
            };

          const [_name, _data] = middlwareResult || [name, data];

          const keys = [_name];

          const results: Details[2][] = [];
          for (const key of keys)
            if (this.#listeners.has(key))
              for (const listener of this.#listeners.get(key)!)
                results.push(listener(_data));

          if (options.cacheUntil) {
            // Make reference for emitted data, this will allow for easy expiration
            const tracked = [_name, _data] as const;
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

            abortedWith: null,
          };
        },
        {
          cacheUntil: (promise: Promise<any>) =>
            createEmitter({ ...options, cacheUntil: promise }),
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

type Middleware<T extends EventDetails[], Context extends any = never> = (
  event: T[number][0],
  details: T[number][1]
) => readonly [T[number][0], T[number][1]] | Abort;

// WIP
type MiddlewareResults<T extends EventDetails[]> = T extends [
  infer Item,
  ...infer Rest extends EventDetails[]
]
  ? readonly [
      Item extends [infer Event, infer Details]
        ? [Event, Details]
        : Item extends [infer Event]
        ? [Event, undefined]
        : never,
      ...MiddlewareResults<Rest>
    ]
  : readonly [];
