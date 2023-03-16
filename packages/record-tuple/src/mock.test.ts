const registrations = new WeakMap<any, Set<() => void>>();

declare global {
  interface FinalizationRegistryConstructor {
    disposerFor(target: object): () => void;
  }
}

global.FinalizationRegistry = class<T> extends FinalizationRegistry<T> {
  static disposerFor(target: object) {
    const cleanups = registrations.get(target);

    return () => {
      if (!cleanups) return;

      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }

  callback: (heldValue: T) => void;

  constructor(cleanupCallback: (heldValue: T) => void) {
    super(cleanupCallback);
    this.callback = cleanupCallback;
  }

  override register(
    target: object,
    heldValue: T,
    unregisterToken?: object
  ): void {
    if (!registrations.has(target)) registrations.set(target, new Set());

    registrations.get(target)!.add(() => this.callback(heldValue));

    super.register(target, heldValue, unregisterToken);
  }
};

export {};
