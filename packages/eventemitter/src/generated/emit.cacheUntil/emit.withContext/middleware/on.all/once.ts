/* emit.cacheUntil emit.withContext middleware on.all once */

import { Track, Abort } from "../../../../../utils";

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

  middleware = new Set<Middleware<T, Context>>();

  constructor() {
    this.destroy = this.destroy.bind(this);

    this.use = this.use.bind(this);
    this.unuse = this.unuse.bind(this);
  }

  use(middleware: Middleware<T, Context>) {
    this.middleware.add(middleware);

    return {
      and: this as EventEmitterConfiguration<T, Context>,
      unuse: () => {
        this.middleware.delete(middleware);
      },
    };
  }

  unuse(middleware: Middleware<T, Context>) {
    const removed = this.middleware.delete(middleware);

    return {
      removed,
      and: this as EventEmitterConfiguration<T, Context>,
    };
  }

  get #applyMiddleware() {
    return ((event, details, context) => {
      let payload = [event, details, context] as Exclude<
        ReturnType<Middleware<T, Context>>,
        Abort
      >;

      for (const middleware of this.middleware) {
        const result = middleware(...payload);
        if (result instanceof Abort) return result;

        payload = result;
      }

      return payload;
    }) as Middleware<T, Context>;
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
          ...[data]: Details[1] extends undefined ? [] : [data: Details[1]]
        ) => {
          const middlwareResult = this.#applyMiddleware(
            name,
            data,
            options.context
          );
          if (middlwareResult instanceof Abort)
            return { result: [], and: this, abortedWith: middlwareResult };

          const [_name, _data, _context] = middlwareResult || [
            name,
            data,

            options.context,
          ];

          const keys = [_name, LISTEN_ALL];

          const result: Details[2][] = [];
          for (const key of keys)
            if (this.#listeners.has(key))
              if (key === LISTEN_ALL)
                for (const listener of this.#listeners.get(key)!) {
                  const r = listener(
                    _name,
                    _data,

                    _context
                  );
                  if (r instanceof Track) result.push(r.value);
                }
              else
                for (const listener of this.#listeners.get(key)!)
                  result.push(
                    listener(
                      _data,

                      _context
                    )
                  );

          if (options.cacheUntil) {
            // Make reference for emitted data, this will allow for easy expiration
            const tracked = [_name, _data, _context] as const;
            for (const key of keys) {
              if (!this.cache.has(key)) this.cache.set(key, new Set());
              this.cache.get(key)!.add(tracked);
            }

            options.cacheUntil.then(() => {
              for (const key of keys) this.cache.get(key)!.delete(tracked);
            });
          }

          return {
            result,
            and: this as EventEmitterConfiguration<T, Context>,

            abortedWith: null as Abort | null,
          };
        },
        {
          cacheUntil: (promise: Promise<any>) =>
            createEmitter({ ...options, cacheUntil: promise }),

          withContext: (context: Context) =>
            createEmitter({ ...options, context }),
        }
      );
      return emit;
    };

    return createEmitter({});
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

type Middleware<T extends EventDetails[], Context extends any = never> = (
  event: T[number][0],
  details: T[number][1],
  context?: Context
) => readonly [T[number][0], T[number][1], Context?] | Abort;

// WIP
type MiddlewareResults<
  T extends EventDetails[],
  Context extends any = never
> = T extends [infer Item, ...infer Rest extends EventDetails[]]
  ? readonly [
      Item extends [infer Event, infer Details]
        ? [Event, Details, Context]
        : Item extends [infer Event]
        ? [Event, undefined, Context?]
        : never,
      ...MiddlewareResults<Rest>
    ]
  : readonly [];
