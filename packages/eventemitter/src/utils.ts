export class Track<T> {
  constructor(public value: T) {}
}

export class Abort {
  constructor(public reason?: string) {}
}
