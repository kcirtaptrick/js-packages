/* asyncIterator clone emit.cacheUntil emit.if emit.ifListening emit.withContext many middleware on.all once */

// prettier-ignore
import {
  /* +on.all */ Track, /* /on.all */
  /* +middleware */ Abort, /* /middleware */
} from "./utils.js";

// prettier-ignore
export { 
  /* +on.all */ Track, /* /on.all */
  /* +middleware */ Abort, /* /middleware */
};

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
  /* +emit.withContext */
  Context extends any = never
  /* /emit.withContext */
> = (
  data: Details[1],
  /* +emit.withContext */
  context?: Context
  /* /emit.withContext */
) => Details[2] extends undefined ? void : Details[2];

const DESTROY_ALL = Symbol("EventEmitter.DESTROY_ALL");
/* +on.all */
const LISTEN_ALL = Symbol("EventEmitter.LISTEN_ALL");
/* /on.all */

class EventEmitterConfiguration<
  T extends EventDetails[] = any,
  /* +emit.withContext */
  Context extends any = never
  /* /emit.withContext */
> {
  #listeners = new Map<
    T[number][0] /* +on.all */ | typeof LISTEN_ALL /* /on.all */,
    Set<(...args: any) => any>
  >();

  /* +emit.cacheUntil */
  #cache = new Map<
    T[number][0] /* +on.all */ | typeof LISTEN_ALL /* /on.all */,
    Set<
      readonly [
        name: T[number][0],
        data: T[number][1],
        /* +emit.withContext */
        context: Context | undefined
        /* /emit.withContext */
      ]
    >
  >();
  /* /emit.cacheUntil */

  /* +middleware */
  #middleware = new Set<
    Middleware<T /* +emit.withContext */, Context /* /emit.withContext */>
  >();
  /* /middleware */

  constructor() {
    this.destroy = this.destroy.bind(this);
    /* +clone */
    this.clone = this.clone.bind(this);
    /* /clone */
    /* +middleware */
    this.use = this.use.bind(this);
    this.unuse = this.unuse.bind(this);
    /* /middleware */
  }

  /* +middleware */
  use(
    middleware: Middleware<
      T /* +emit.withContext */,
      Context /* /emit.withContext */
    >
  ) {
    this.#middleware.add(middleware);

    return {
      and: this as EventEmitterConfiguration<
        T /* +emit.withContext */,
        Context /* /emit.withContext */
      >,
      unuse: () => {
        this.#middleware.delete(middleware);
      },
    };
  }

  unuse(
    middleware: Middleware<
      T /* +emit.withContext */,
      Context /* /emit.withContext */
    >
  ) {
    const removed = this.#middleware.delete(middleware);

    return {
      removed,
      and: this as EventEmitterConfiguration<
        T /* +emit.withContext */,
        Context /* /emit.withContext */
      >,
    };
  }

  get #applyMiddleware() {
    return ((
      event,
      details /* +emit.withContext */,
      context /* /emit.withContext */
    ) => {
      let payload = [
        event,
        details,
        /* +emit.withContext */
        context,
        /* /emit.withContext */
      ] as Exclude<
        ReturnType<
          Middleware<T /* +emit.withContext */, Context /* /emit.withContext */>
        >,
        Abort
      >;

      for (const middleware of this.#middleware) {
        const result = middleware(...payload);
        if (result instanceof Abort) return result;

        payload = result;
      }

      return payload;
    }) as Middleware<
      T /* +emit.withContext */,
      Context /* /emit.withContext */
    >;
  }
  /* /middleware */

  get on() {
    type Self = EventEmitterConfiguration<
      T /* +emit.withContext */,
      Context /* /emit.withContext */
    >;
    /* +asyncIterator */
    const self = this;
    /* /asyncIterator */

    const on = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,
      // prettier-ignore
      handler/* +asyncIterator */?/* /asyncIterator */: 
        HandlerFromData<
          Details /* +emit.withContext */,
          Context /* /emit.withContext */
        >
    ): {
      and: Self;
      off: () => {
        and: Self;
        removed: boolean;
      };
      /* +asyncIterator */
      [Symbol.asyncIterator](): AsyncIterableIterator<Details[1]>;
      /* /asyncIterator */
    } => {
      if (!this.#listeners.has(name)) this.#listeners.set(name, new Set());

      if (handler) {
        this.#listeners.get(name)!.add(handler);

        /* +emit.cacheUntil */
        if (this.#cache.has(name)) {
          for (const [
            _name,
            data,
            /* +emit.withContext */
            context,
            /* /emit.withContext */
          ] of this.#cache.get(name)!)
            // prettier-ignore
            /* +on.all */
            if (name === LISTEN_ALL) (handler as any)(
              _name,
              data,
              /* +emit.withContext */
              context
              /* /emit.withContext */
            );
            else 
            /* /on.all */ 
              (handler as any)(
                data,
                /* +emit.withContext */
                context
                /* /emit.withContext */
              );
        }
        /* /emit.cacheUntil */
      }

      return {
        and: this as Self,
        off: () => this.off(name, handler!),
        /* +asyncIterator */
        async *[Symbol.asyncIterator]() {
          const buffer: Details[1][] = [];
          let next: ((value: Details[1]) => void) | null = null;

          /* +on.all */
          if (name === LISTEN_ALL)
            self.on.all((name, data) => {
              const value: any = [name, data];
              if (next) next(value);
              else buffer.push(value);
            });
          // prettier-ignore
          else
          /* /on.all */ 
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
        /* /asyncIterator */
      };
    };

    return Object.assign(on, {
      /* +on.all */
      // Cannot return this type: The inferred type of 'on' references an
      // inaccessible 'this' type. A type annotation is necessary.
      // prettier-ignore
      all: (
        handler/* +asyncIterator */?/* /asyncIterator */: (
          name: T[number][0],
          data: T[number][1],
          /* +emit.withContext */
          context: Context
          /* /emit.withContext */
        ) => void | Track<T[number][2]>
      )/* +asyncIterator */: ReturnType<typeof on> & {
        [Symbol.asyncIterator](): AsyncIterableIterator<
          [T[number][0], T[number][1]]
        >;
      } /* /asyncIterator */ => this.on(LISTEN_ALL, handler as any),
      /* /on.all */
    });
  }

  /* +once */
  get once() {
    return Object.assign(
      <
        E extends T[number][0],
        Details extends FilterDetailsFromName<T, E>[number]
      >(
        name: E,
        handler: HandlerFromData<
          Details /* +emit.withContext */,
          Context /* /emit.withContext */
        >
      ) => {
        const { off, and } = this.on(name, (...args) => {
          off();

          return handler(...args);
        });

        return { off, and };
      },
      {
        /* +on.all */
        all: (handler: Parameters<this["on"]["all"]>[0]) => {
          const { off, and } = this.on.all((...args) => {
            off();

            return handler?.(...args);
          });

          return { off, and };
        },
        /* /on.all */
      }
    );
  }
  /* /once */

  /* +many */
  get many() {
    const many = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      count: number,
      name: E,
      handler: HandlerFromData<
        Details /* +emit.withContext */,
        Context /* /emit.withContext */
      >
    ) => {
      const { off, and } = this.on(name, (...args) => {
        if (--count === 0) off();

        return handler(...args);
      });

      return { off, and };
    };

    return Object.assign(many, {
      /* +on.all */
      all: (count: number, handler: Parameters<this["on"]["all"]>[0]) => {
        const { off, and } = this.on.all((...args) => {
          if (--count === 0) off();

          return handler?.(...args);
        });

        return { off, and };
      },
      /* /on.all */
    });
  }
  /* /many */

  /* +asyncIterator */
  /* +on.all */
  [Symbol.asyncIterator]() {
    return this.on.all()[Symbol.asyncIterator]();
  }
  /* /on.all */
  /* /asyncIterator */

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
          and: this as EventEmitterConfiguration<
            T /* +emit.withContext */,
            Context /* /emit.withContext */
          >,
        };
      },
      {
        /* +on.all */
        all: (handler: Parameters<this["on"]["all"]>[0]) =>
          this.off(LISTEN_ALL, handler as any),
        /* /on.all */
      }
    );
  }

  destroy(name: T[number][0] = DESTROY_ALL) {
    if (name === DESTROY_ALL) this.#listeners.clear();
    else this.#listeners.delete(name);
  }

  get emit() {
    const createEmitter = (options: {
      /* +emit.withContext */
      context?: Context;
      /* /emit.withContext */
      /* +emit.cacheUntil */
      cacheUntil?: Promise<any>;
      /* /emit.cacheUntil */
    }) => {
      const emit = Object.assign(
        <
          E extends T[number][0],
          Details extends FilterDetailsFromName<T, E>[number]
        >(
          name: E,
          ...[data]: Details[1] extends undefined ? [] : [data: Details[1]]
        ): {
          result: Details[2] | undefined;
          results: Details[2][];
          and: EventEmitterConfiguration<
            T /* +emit.withContext */,
            Context /* /emit.withContext */
          >;
          /* +middleware */
          abortedWith: Abort | null;
          /* /middleware */
        } => {
          /* +middleware */
          const middlwareResult = this.#applyMiddleware(
            name,
            data /* +emit.withContext */,
            options.context /* /emit.withContext */
          );
          if (middlwareResult instanceof Abort)
            return {
              result: undefined,
              results: [],
              and: this,
              abortedWith: middlwareResult,
            };
          /* /middleware */

          const [
            _name,
            _data,
            /* +emit.withContext */
            _context,
            /* /emit.withContext */
          ] = /* +middleware */ middlwareResult || /* /middleware */ [
            name,
            data,
            /* +emit.withContext */
            options.context,
            /* /emit.withContext */
          ];

          const keys = [
            _name,
            /* +on.all */
            LISTEN_ALL,
            /* /on.all */
          ];

          const results: Details[2][] = [];
          for (const key of keys)
          // prettier-ignore
          if (this.#listeners.has(key))
            /* +on.all */
            if (key === LISTEN_ALL)
              for (const listener of this.#listeners.get(key)!) {
                const r = listener(
                  _name,
                  _data,
                  /* +emit.withContext */
                  _context
                  /* /emit.withContext */
                );
                if (r instanceof Track) results.push(r.value);
              }
            else
            /* /on.all */ 
              for (const listener of this.#listeners.get(key)!)
                results.push(
                  listener(
                    _data,
                    /* +emit.withContext */
                    _context
                    /* /emit.withContext */
                  )
                );

          /* +emit.cacheUntil */
          if (options.cacheUntil) {
            // Make reference for emitted data, this will allow for easy expiration
            const tracked = [
              _name,
              _data,
              /* +emit.withContext */
              _context,
              /* /emit.withContext */
            ] as const;
            for (const key of keys) {
              if (!this.#cache.has(key)) this.#cache.set(key, new Set());
              this.#cache.get(key)!.add(tracked);
            }

            options.cacheUntil.then(() => {
              for (const key of keys) this.#cache.get(key)!.delete(tracked);
            });
          }
          /* /emit.cacheUntil */

          return {
            result: results[0],
            results,
            and: this,
            /* +middleware */
            abortedWith: null,
            /* /middleware */
          };
        },
        {
          /* +emit.cacheUntil */
          cacheUntil: (promise: Promise<any>) =>
            createEmitter({ ...options, cacheUntil: promise }),
          /* /emit.cacheUntil */
          /* +emit.withContext */
          withContext: (context: Context) =>
            createEmitter({ ...options, context }),
          /* /emit.withContext */
          /* +emit.ifListening */
          ifListening: <
            E extends T[number][0],
            Details extends FilterDetailsFromName<T, E>[number]
          >(
            name: E,
            data: () => Details[1]
          ): Details[2][] => {
            if (
              this.#listeners.has(name) /* +on.all */ ||
              this.#listeners.has(LISTEN_ALL) /* /on.all */
            )
              return (emit as any)(name, data());

            return [];
          },
          /* /emit.ifListening */
          /* +emit.if */
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
          /* /emit.if */
        }
      );
      return emit;
    };

    return createEmitter({});
  }

  /* +clone */
  clone() {
    const clone = new (this.constructor as any)() as typeof this;

    for (const [key, value] of this.#listeners)
      clone.#listeners.set(key, new Set(value));

    return clone;
  }
  /* /clone */
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

/* +emit.if */
type Falsy = false | 0 | "" | null | undefined;
/* /emit.if */

/* +middleware */
type Middleware<T extends EventDetails[], Context extends any = never> = (
  event: T[number][0],
  details: T[number][1] /* +emit.withContext */,
  context?: Context /* /emit.withContext */
) =>
  | readonly [
      T[number][0],
      T[number][1] /* +emit.withContext */,
      Context? /* /emit.withContext */
    ]
  | Abort;

// WIP
type MiddlewareResults<
  T extends EventDetails[] /* +emit.withContext */,
  Context extends any = never /* /emit.withContext */
> = T extends [infer Item, ...infer Rest extends EventDetails[]]
  ? readonly [
      Item extends [infer Event, infer Details]
        ? [
            Event,
            Details /* +emit.withContext */,
            Context /* /emit.withContext */
          ]
        : Item extends [infer Event]
        ? [
            Event,
            undefined,
            /* +emit.withContext */ Context? /* /emit.withContext */
          ]
        : never,
      ...MiddlewareResults<Rest>
    ]
  : readonly [];
/* /middleware */
