/* asyncIterator emit.ifListening emit.withContext */

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

export default class EventEmitterConfiguration<
  T extends EventDetails[] = any,
  Context extends any = never
> {
  listeners = new Map<T[number][0], Set<(...args: any) => any>>();

  constructor() {}

  get on() {
    const on = <
      E extends T[number][0],
      Details extends FilterDetailsFromName<T, E>[number]
    >(
      name: E,

      handler?: HandlerFromData<Details, Context>
    ) => {
      if (!this.listeners.has(name)) this.listeners.set(name, new Set());

      if (handler) {
        this.listeners.get(name)!.add(handler);
      }

      return {
        and: this as EventEmitterConfiguration<T, Context>,
        off: () => this.off(name, handler!),

        async *[Symbol.asyncIterator](): AsyncIterableIterator<Details[1]> {
          while (true) {
            yield await new Promise((resolve) => {
              const { off } = on(name, (data) => {
                resolve(data);
                off();
              });
            });
          }
        },
      };
    };

    const self = this;

    return Object.assign(on, {});
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
        and: this as EventEmitterConfiguration<T, Context>,
        removed,
      };
    };

    return Object.assign(off, {});
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
        const keys = [name];

        const res = [];
        for (const key of keys)
          if (this.listeners.has(key))
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
