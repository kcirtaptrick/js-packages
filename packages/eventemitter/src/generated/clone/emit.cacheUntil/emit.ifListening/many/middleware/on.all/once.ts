/* clone emit.cacheUntil emit.ifListening many middleware on.all once */

import { Track, Abort } from "../../../../../../../utils.js";

export { Track, Abort };

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

  #cache = new Map<
    T[number][0] | typeof LISTEN_ALL,
    Set<readonly [name: T[number][0], data: T[number][1]]>
  >();

  #middleware = new Set<Middleware<T>>();

  constructor() {
    this.destroy = this.destroy.bind(this);

    this.clone = this.clone.bind(this);

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
            if (name === LISTEN_ALL) (handler as any)(_name, data);
            else (handler as any)(data);
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
          data: T[number][1]
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
        handler: HandlerFromData<Details>
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
      handler: HandlerFromData<Details>
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
          and: this as EventEmitterConfiguration<T>,
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
    const createEmitter = (options: { cacheUntil?: Promise<any> }) => {
      const emit = Object.assign(
        <
          E extends T[number][0],
          Details extends FilterDetailsFromName<T, E>[number]
        >(
          name: E,
          ...[data]: Details[1] extends undefined ? [] : [data: Details[1]]
        ) => {
          const middlwareResult = this.#applyMiddleware(name, data);
          if (middlwareResult instanceof Abort)
            return { result: [], and: this, abortedWith: middlwareResult };

          const [_name, _data] = middlwareResult || [name, data];

          const keys = [_name, LISTEN_ALL];

          const result: Details[2][] = [];
          for (const key of keys)
            if (this.#listeners.has(key))
              if (key === LISTEN_ALL)
                for (const listener of this.#listeners.get(key)!) {
                  const r = listener(_name, _data);
                  if (r instanceof Track) result.push(r.value);
                }
              else
                for (const listener of this.#listeners.get(key)!)
                  result.push(listener(_data));

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
            result,
            and: this as EventEmitterConfiguration<T>,

            abortedWith: null as Abort | null,
          };
        },
        {
          cacheUntil: (promise: Promise<any>) =>
            createEmitter({ ...options, cacheUntil: promise }),

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
        }
      );
      return emit;
    };

    return createEmitter({});
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
