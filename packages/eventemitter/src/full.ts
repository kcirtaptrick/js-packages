/* asyncIterator clone destroy emit.cacheUntil emit.if emit.ifListening emit.withContext many on.all once */

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
  /* +emit.withContext */
  Context extends any = never
  /* /emit.withContext */
> = (
  data: Details[1],
  /* +emit.withContext */
  context?: Context
  /* /emit.withContext */
) => Details[2] extends undefined ? void : Details[2];

/* +destroy */
const DESTROY_ALL = Symbol("EventEmitter.DESTROY_ALL");
/* /destroy */
/* +on.all */
const LISTEN_ALL = Symbol("EventEmitter.LISTEN_ALL");
/* /on.all */

export default class EventEmitterConfiguration<
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
  private cache = new Map<
    T[number][0] /* +on.all */ | typeof LISTEN_ALL /* /on.all */,
    Set<
      readonly [
        name: T[number][0],
        data: T[number][1],
        /* +emit.withContext */
        context: Context | null
        /* /emit.withContext */
      ]
    >
  >();
  /* /emit.cacheUntil */

  constructor() {
    /* +destroy */
    this.destroy = this.destroy.bind(this);
    /* /destroy */
    /* +clone */
    this.clone = this.clone.bind(this);
    /* /clone */
  }

  get on() {
    type Self = EventEmitterConfiguration<
      T /* +emit.withContext */,
      Context /* /emit.withContext */
    >;
    const self = this;
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
        if (this.cache.has(name)) {
          for (const [_name, data/* +emit.withContext */, context/* /emit.withContext */] of this.cache.get(name)!)
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
        and: this as EventEmitterConfiguration<
          T /* +emit.withContext */,
          Context /* /emit.withContext */
        >,
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
      } /* /asyncIterator */ => on(LISTEN_ALL, handler as any),
      /* /on.all */
    });
  }

  /* +once */
  get once() {
    const once = <
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
    };

    return Object.assign(once, {
      /* +on.all */
      all: (handler: Parameters<this["on"]["all"]>[0]) => {
        const { off, and } = this.on.all((...args) => {
          off();

          return handler?.(...args);
        });

        return { off, and };
      },
      /* /on.all */
    });
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
    const off = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,
      handler: HandlerFromData<Details>
    ) => {
      const removed = !!this.#listeners.get(name)?.delete(handler);

      return {
        and: this as EventEmitterConfiguration<
          T /* +emit.withContext */,
          Context /* /emit.withContext */
        >,
        removed,
      };
    };

    return Object.assign(off, {
      /* +on.all */
      all: (handler: Parameters<this["on"]["all"]>[0]) =>
        off(LISTEN_ALL, handler as any),
      /* /on.all */
    });
  }

  /* +destroy */
  destroy(name: T[number][0] = DESTROY_ALL) {
    if (name === DESTROY_ALL) this.#listeners.clear();
    else this.#listeners.delete(name);
  }
  /* /destroy */

  get emit() {
    /* +emit.withContext */
    let ctx: Context | null = null;
    /* /emit.withContext */
    /* +emit.cacheUntil */
    let cacheUntil: Promise<any> | null = null;
    /* /emit.cacheUntil */

    const emit = Object.assign(
      <
        E extends T[number][0],
        Details extends FilterDetailsFromName<T, E>[number]
      >(
        name: E,
        ...[data]: Details[1] extends undefined ? [] : [data: Details[1]]
      ) => {
        const keys = [
          name,
          /* +on.all */
          LISTEN_ALL,
          /* /on.all */
        ];

        const res = [];
        for (const key of keys)
          // prettier-ignore
          if (this.#listeners.has(key))
            /* +on.all */
            if (key === LISTEN_ALL)
              for (const listener of this.#listeners.get(key)!) {
                const r = listener(
                  name,
                  data,
                  /* +emit.withContext */
                  ctx
                  /* /emit.withContext */
                );
                if (r instanceof Track) res.push(r.value);
              }
            else
            /* /on.all */ 
              for (const listener of this.#listeners.get(key)!)
                res.push(
                  listener(
                    data,
                    /* +emit.withContext */
                    ctx
                    /* /emit.withContext */
                  )
                );

        /* +emit.cacheUntil */
        if (cacheUntil) {
          // Make reference for emitted data, this will allow for easy expiration
          const tracked = [
            name,
            data,
            /* +emit.withContext */
            ctx,
            /* /emit.withContext */
          ] as const;
          for (const key of keys) {
            if (!this.cache.has(key)) this.cache.set(key, new Set());
            this.cache.get(key)!.add(tracked);
          }

          cacheUntil.then(() => {
            for (const key of keys) this.cache.get(key)!.delete(tracked);
          });
        }
        /* /emit.cacheUntil */

        return res as Details[2][];
      },
      {
        /* +emit.cacheUntil */
        cacheUntil(promise: Promise<any>) {
          cacheUntil = promise;
          return emit;
        },
        /* /emit.cacheUntil */
        /* +emit.withContext */
        withContext(context: Context) {
          ctx = context;
          return emit;
        },
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

/* +on.all */
export class Track<T> {
  constructor(public value: T) {}
}
/* /on.all */

export type EventDetailsFromName<
  EE extends EventEmitterConfiguration,
  Name extends EE extends EventEmitterConfiguration<infer Events>
    ? Events[number][0]
    : never
> = FilterDetailsFromName<
  EE extends EventEmitterConfiguration<infer Events> ? Events : never,
  Name
>[number];

/* +emit.if */
type Falsy = false | 0 | "" | null | undefined;
/* +emit.if */
