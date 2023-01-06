/* destroy emit.ifListening many once */

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
  listeners = new Map<T[number][0], Set<(...args: any) => any>>();

  constructor() {
    this.destroy = this.destroy.bind(this);
  }

  get on() {
    const on = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,

      handler: HandlerFromData<Details>
    ) => {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());

      if (handler) {
        this.listeners.get(name)!.add(handler);
      }

      return {
        and: this as EventEmitterConfiguration<T>,
        off: () => this.off(name, handler!),
      };
    };

    return Object.assign(on, {});
  }

  get once() {
    const once = <
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
    };

    return Object.assign(once, {});
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
        if (count-- === 0) off();

        return handler(...args);
      });

      return { off, and };
    };

    return Object.assign(many, {});
  }

  get off() {
    const off = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,
      handler: HandlerFromData<Details>
    ) => {
      const removed = !!this.listeners.get(name)?.delete(handler);

      return {
        and: this as EventEmitterConfiguration<T>,
        removed,
      };
    };

    return Object.assign(off, {});
  }

  destroy(name: T[number][0] = DESTROY_ALL) {
    if (name === DESTROY_ALL) this.listeners.clear();
    else this.listeners.delete(name);
  }

  get emit() {
    const emit = Object.assign(
      <
        E extends T[number][0],
        Details extends FilterDetailsFromName<T, E>[number]
      >(
        name: E,
        ...[data]: Details[1] extends undefined ? [] : [data: Details[1]]
      ) => {
        const keys = [name];

        const res = [];
        for (const key of keys)
          if (this.listeners.has(key))
            for (const listener of this.listeners.get(key)!)
              res.push(listener(data));

        return res as Details[2][];
      },
      {
        ifListening: <
          E extends T[number][0],
          Details extends FilterDetailsFromName<T, E>[number]
        >(
          name: E,
          data: () => Details[1]
        ): Details[2][] => {
          if (this.listeners.has(name)) return (emit as any)(name, data());

          return [];
        },
      }
    );

    return emit;
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
