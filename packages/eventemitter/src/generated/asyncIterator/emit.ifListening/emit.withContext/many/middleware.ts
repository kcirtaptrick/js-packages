/* asyncIterator emit.ifListening emit.withContext many middleware */

import { Abort } from "../../../../../utils.js";

export { Abort };

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

export default class EventEmitterConfiguration<
  T extends EventDetails[] = any,
  Context extends any = never
> {
  #listeners = new Map<T[number][0], Set<(...args: any) => any>>();

  #middleware = new Set<Middleware<T, Context>>();

  constructor() {
    this.destroy = this.destroy.bind(this);

    this.use = this.use.bind(this);
    this.unuse = this.unuse.bind(this);
  }

  use(middleware: Middleware<T, Context>) {
    this.#middleware.add(middleware);

    return {
      and: this as EventEmitterConfiguration<T, Context>,
      unuse: () => {
        this.#middleware.delete(middleware);
      },
    };
  }

  unuse(middleware: Middleware<T, Context>) {
    const removed = this.#middleware.delete(middleware);

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

      for (const middleware of this.#middleware) {
        const result = middleware(...payload);
        if (result instanceof Abort) return result;

        payload = result;
      }

      return payload;
    }) as Middleware<T, Context>;
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
      }

      return {
        and: this as EventEmitterConfiguration<T, Context>,
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

    return Object.assign(many, {});
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
    const createEmitter = (options: { context?: Context }) => {
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

          const keys = [_name];

          const result: Details[2][] = [];
          for (const key of keys)
            if (this.#listeners.has(key))
              for (const listener of this.#listeners.get(key)!)
                result.push(
                  listener(
                    _data,

                    _context
                  )
                );

          return {
            result,
            and: this as EventEmitterConfiguration<T, Context>,

            abortedWith: null as Abort | null,
          };
        },
        {
          withContext: (context: Context) =>
            createEmitter({ ...options, context }),

          ifListening: <
            E extends T[number][0],
            Details extends FilterDetailsFromName<T, E>[number]
          >(
            name: E,
            data: () => Details[1]
          ): Details[2][] => {
            if (this.#listeners.has(name)) return (emit as any)(name, data());

            return [];
          },
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
