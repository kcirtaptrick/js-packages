/* destroy emit.if many on.all */

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
  listeners = new Map<
    T[number][0] | typeof LISTEN_ALL,
    Set<(...args: any) => any>
  >();

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

    return Object.assign(on, {
      // Cannot return this type: The inferred type of 'on' references an
      // inaccessible 'this' type. A type annotation is necessary.
      all: (
        handler: (
          name: T[number][0],
          data: T[number][1]
        ) => void | typeof EventEmitterConfiguration.Track
      ) => ({
        ...on(LISTEN_ALL, handler as any),
      }),
    });
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

    return Object.assign(many, {
      all: (count: number, handler: Parameters<this["on"]["all"]>[0]) => {
        const { off, and } = this.on.all((...args) => {
          if (count-- === 0) off();

          return handler?.(...args);
        });

        return { off, and };
      },
    });
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

    return Object.assign(off, {
      all: (handler: Parameters<this["on"]["all"]>[0]) =>
        off(LISTEN_ALL, handler as any),
    });
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
        const keys = [name, LISTEN_ALL];

        const res = [];
        for (const key of keys)
          if (this.listeners.has(key))
            if (key === LISTEN_ALL)
              for (const listener of this.listeners.get(key)!) {
                const r = listener(name, data);
                if (r instanceof EventEmitterConfiguration.Track)
                  res.push(r.value);
              }
            else
              for (const listener of this.listeners.get(key)!)
                res.push(listener(data));

        return res as Details[2][];
      },
      {
        /**
         * Too difficult to type fully, this method assumes that argument already has
         * types enforced
         */
        if<
          E extends T[number][0],
          Details extends FilterDetailsFromName<T, E>[number]
        >(
          event: [
            name: E,
            ...maybeData: Details[1] extends undefined ? [] : [data: Details[1]]
          ]
        ) {
          if (event) return emit(...event);
        },
      }
    );

    return emit;
  }

  static Track = class {
    constructor(public value: any) {}
  };
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
