/* many */

import {} from "../utils.js";

export {};

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

type HandlerFromData<Details extends EventDetails> = (
  data: Details[1]
) => Details[2] extends undefined ? void : Details[2];

const DESTROY_ALL = Symbol("EventEmitter.DESTROY_ALL");

class EventEmitterConfiguration<T extends EventDetails[] = any> {
  #listeners = new Map<T[number][0], Set<(...args: any) => any>>();

  constructor() {
    this.destroy = this.destroy.bind(this);
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
      }

      return {
        and: this as Self,
        off: () => this.off(name, handler!),
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
          ...[data]: Details[1] extends undefined
            ? [data?: undefined]
            : [data: Details[1]]
        ): {
          result: Details[2] | undefined;
          results: Details[2][];
          and: EventEmitterConfiguration<T>;
        } => {
          const [_name, _data] = [name, data];

          const keys = [_name];

          const results: Details[2][] = [];
          for (const key of keys)
            if (this.#listeners.has(key))
              for (const listener of this.#listeners.get(key)!)
                results.push(listener(_data));

          return {
            result: results[0],
            results,
            and: this,
          };
        },
        {}
      );
      return emit;
    };

    return createEmitter({});
  }
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
