/* asyncIterator copyWith emit.if emit.ifListening emit.withContext on.all */

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
  listeners = new Map<
    T[number][0] | typeof LISTEN_ALL,
    Set<(...args: any) => any>
  >();

  constructor() {
    this.off = this.off.bind(this);
    this.destroy = this.destroy.bind(this);

    this.copyWith = this.copyWith.bind(this);

    this.asyncIteratorFor = this.asyncIteratorFor.bind(this);
  }

  get on() {
    const on = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,
      handler: HandlerFromData<Details, Context>
    ) => {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());

      this.listeners.get(name)!.add(handler);

      return {
        self: this as EventEmitterConfiguration<T, Context>,
        off: () => this.off(name, handler),
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
        ) => void | typeof EventEmitterConfiguration.Track
      ) => on(LISTEN_ALL, handler as any),
    });
  }

  async *asyncIteratorFor<E extends T[number][0]>(
    name: E
  ): AsyncIterableIterator<FilterDetailsFromName<T, E>[number]> {
    while (true) {
      yield await new Promise((resolve) => {
        const { off } = this.on(name, (data) => {
          resolve(data);
          off();
        });
      });
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<
    [name: T[number][0], data: T[number][1]]
  > {
    while (true) {
      yield await new Promise((resolve) => {
        const { off } = this.on(name, (data) => {
          resolve(data);
          off();
        });
      });
    }
  }

  off<
    E extends T[number][0],
    Details extends FilterDetailsFromName<T, E>[number]
  >(name: E, handler: HandlerFromData<Details>) {
    this.listeners.get(name)?.delete(handler);
  }

  destroy(name: T[number][0] = DESTROY_ALL) {
    if (name === DESTROY_ALL) this.listeners.clear();
    else this.listeners.delete(name);
  }

  get emit() {
    let ctx: Context | null = null;

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
                const r = listener(
                  name,
                  data,

                  ctx
                );
                if (r instanceof EventEmitterConfiguration.Track)
                  res.push(r.value);
              }
            else
              for (const listener of this.listeners.get(key)!)
                res.push(
                  listener(
                    data,

                    ctx
                  )
                );

        return res as Details[2][];
      },
      {
        withContext(context: Context) {
          ctx = context;
          return emit;
        },

        ifListening: <
          E extends T[number][0],
          Details extends FilterDetailsFromName<T, E>[number]
        >(
          name: E,
          data: () => Details[1]
        ): Details[2][] => {
          if (this.listeners.has(name) || this.listeners.has(LISTEN_ALL))
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

  copyWith(data: Partial<Pick<this, "listeners">>) {
    const clone = new (this.constructor as any)() as typeof this;

    for (const [key, value] of this.listeners)
      clone.listeners.set(key, new Set(value));
    if (data.listeners)
      for (const [key, value] of data.listeners)
        clone.listeners.set(key, new Set(value));

    return clone;
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
