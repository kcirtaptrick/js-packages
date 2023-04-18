/* asyncIterator clone many */

import {} from "../../../utils";

export {};

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

export default class EventEmitterConfiguration<T extends EventDetails[] = any> {
  #listeners = new Map<T[number][0], Set<(...args: any) => any>>();

  constructor() {
    this.destroy = this.destroy.bind(this);

    this.clone = this.clone.bind(this);
  }

  get on() {
    type Self = EventEmitterConfiguration<T>;

    const self = this;

    const on = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,

      handler?: HandlerFromData<Details>
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
        and: this as EventEmitterConfiguration<T>,
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
      handler: HandlerFromData<Details>
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
    const createEmitter = (options: {}) => {
      const emit = Object.assign(
        <
          E extends T[number][0],
          Details extends FilterDetailsFromName<T, E>[number]
        >(
          name: E,
          ...[data]: Details[1] extends undefined ? [] : [data: Details[1]]
        ) => {
          const [_name, _data] = [name, data];

          const keys = [_name];

          const result: Details[2][] = [];
          for (const key of keys)
            if (this.#listeners.has(key))
              for (const listener of this.#listeners.get(key)!)
                result.push(listener(_data));

          return {
            result,
            and: this as EventEmitterConfiguration<T>,
          };
        },
        {}
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
