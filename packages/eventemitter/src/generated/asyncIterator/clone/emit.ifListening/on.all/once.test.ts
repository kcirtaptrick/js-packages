/* asyncIterator clone emit.ifListening on.all once */
import { suite } from "uvu";
import * as assert from "uvu/assert";
import EventEmitter from "./once";

import { Track } from "../../../../../utils";

const test = suite("EventEmitter");

test("Can be constructed", () => {
  const events = new EventEmitter();
});

test("Calls correct listeners for events", () => {
  const events = new EventEmitter<[["event1"], ["event2"]]>();

  const timesHandled = {
    event1: 0,
    event2: 0,
  };
  events.on("event1", () => {
    timesHandled.event1++;
  });
  events.on("event2", () => {
    timesHandled.event2++;
  });

  events.emit("event1");
  assert.equal(timesHandled, { event1: 1, event2: 0 });

  events.emit("event2");
  assert.equal(timesHandled, { event1: 1, event2: 1 });

  events.on("event1", () => {
    timesHandled.event1++;
  });

  events.emit("event1");
  assert.equal(timesHandled, { event1: 3, event2: 1 });

  events.emit("event2");
  assert.equal(timesHandled, { event1: 3, event2: 2 });
});

test("Calls correct listeners for events in order", () => {
  const events = new EventEmitter<[["event1"], ["event2"]]>();

  const handles: string[] = [];
  events.on("event1", () => {
    handles.push("a");
  });
  events.on("event2", () => {
    handles.push("b");
  });

  events.emit("event1");
  assert.equal(handles, ["a"]);

  events.emit("event2");
  assert.equal(handles, ["a", "b"]);

  events.on("event1", () => {
    handles.push("c");
  });

  events.emit("event1");
  assert.equal(handles, ["a", "b", "a", "c"]);

  events.emit("event2");
  assert.equal(handles, ["a", "b", "a", "c", "b"]);
});

test("Passes data to correct listeners", () => {
  const events = new EventEmitter<[["event1", string], ["event2", string]]>();

  const handles: string[] = [];

  events.on("event1", (data) => {
    handles.push(`event1:${data}`);
  });
  events.on("event1", (data) => {
    handles.push(`event1-2:${data}`);
  });
  events.on("event2", (data) => {
    handles.push(`event2:${data}`);
  });

  events.emit("event1", "data1");
  assert.equal(handles, ["event1:data1", "event1-2:data1"]);

  events.emit("event2", "data2");
  assert.equal(handles, ["event1:data1", "event1-2:data1", "event2:data2"]);
});

test("Allows for chaining with .and", () => {
  const events = new EventEmitter<[["event1"], ["event2"]]>();

  const handles: string[] = [];

  events
    .on("event1", () => {
      handles.push("a");
    })
    .and.on("event2", () => {
      handles.push("b");
    })
    .and.emit("event1")
    .and.emit("event2");

  assert.equal(handles, ["a", "b"]);
});

test("Returns from handlers passed to emit in order", () => {
  const events = new EventEmitter<[["event", undefined, string]]>();

  events.on("event", () => "a");
  events.on("event", () => "b");
  events.on("event", () => "c");

  assert.equal(events.emit("event").result, ["a", "b", "c"]);
});

test("Removes listeners with .off", () => {
  const events = new EventEmitter<[["event"]]>();

  const handles: string[] = [];

  const handler = () => {
    handles.push("a");
  };
  events.on("event", handler);

  events.emit("event");
  assert.equal(handles, ["a"]);

  assert.ok(events.off("event", handler).removed);
  events.emit("event");
  assert.equal(handles, ["a"]);

  assert.not.ok(events.off("event", handler).removed);

  events
    .on("event", () => {
      handles.push("b");
    })
    .off();
  events.emit("event");
  assert.equal(handles, ["a"]);
});

test("destroy(name): Destroys listeners for event with .destroy", () => {
  const events = new EventEmitter<[["event"]]>();

  const handles: string[] = [];
  events.on("event", () => {
    handles.push("a");
  });
  events.on("event", () => {
    handles.push("b");
  });

  events.emit("event");
  assert.equal(handles, ["a", "b"]);

  events.destroy("event");

  events.emit("event");
  assert.equal(handles, ["a", "b"]);
});

test("destroy(): Destroys all listeners with no arguements", () => {
  const events = new EventEmitter<[["event1"], ["event2"]]>();

  const handles: string[] = [];
  events.on("event1", () => {
    handles.push("a");
  });
  events.on("event2", () => {
    handles.push("b");
  });

  events.emit("event1");
  events.emit("event2");
  assert.equal(handles, ["a", "b"]);

  events.destroy();

  events.emit("event1");
  events.emit("event2");
  assert.equal(handles, ["a", "b"]);
});

{
  const wait = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };
  test("on(...)[Symbol.asyncIterator]: Provides asyncIterator", async () => {
    const events = new EventEmitter<[["event", string]]>();

    const handles: string[] = [];
    (async () => {
      for await (const data of events.on("event")) {
        handles.push(data);
      }
    })();

    events.emit("event", "a");
    await wait();
    assert.equal(handles, ["a"]);

    events.emit("event", "b");
    await wait();
    assert.equal(handles, ["a", "b"]);

    events.emit("event", "c");
    events.emit("event", "d");
    await wait();
    await wait();
    assert.equal(handles, ["a", "b", "c", "d"]);

    events.emit("event", "e");
    events.emit("event", "f");
    events.emit("event", "g");
    events.emit("event", "h");
    events.emit("event", "i");
    events.emit("event", "j");
    await wait();
    await wait();
    await wait();
    await wait();
    await wait();
    await wait();
    assert.equal(handles, ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]);

    events.destroy("event");

    events.emit("event", "k");
    await wait();
    assert.equal(handles, ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]);
  });

  test("on.all(...)[Symbol.asyncIterator]: Provides asyncIterator for all events", async () => {
    const events = new EventEmitter<[["event1", string], ["event2", string]]>();

    const rootHandles: string[] = [];
    const allHandles: string[] = [];

    (async () => {
      for await (const [name, data] of events) {
        rootHandles.push(`${name}:${data}`);
      }
    })();

    (async () => {
      for await (const [name, data] of events.on.all()) {
        allHandles.push(`${name}:${data}`);
      }
    })();

    events.emit("event1", "a");
    events.emit("event2", "b");
    await wait();
    await wait();
    assert.equal(rootHandles, ["event1:a", "event2:b"]);
    assert.equal(allHandles, ["event1:a", "event2:b"]);

    events.emit("event1", "c");
    events.emit("event2", "d");
    await wait();
    await wait();
    assert.equal(rootHandles, ["event1:a", "event2:b", "event1:c", "event2:d"]);
    assert.equal(allHandles, ["event1:a", "event2:b", "event1:c", "event2:d"]);

    events.destroy();
    events.emit("event1", "e");
    events.emit("event2", "f");
    assert.equal(rootHandles, ["event1:a", "event2:b", "event1:c", "event2:d"]);
    assert.equal(allHandles, ["event1:a", "event2:b", "event1:c", "event2:d"]);
  });
}

test("clone: Can immutably clone", () => {
  const events = new EventEmitter<[["event1"], ["event2"]]>();

  let handles: string[] = [];

  events.on("event1", () => {
    handles.push("a");
  });
  events.on("event2", () => {
    handles.push("b");
  });

  const events2 = events.clone();

  events2.emit("event1");
  events2.emit("event2");

  assert.equal(handles, ["a", "b"]);

  events2.on("event1", () => {
    handles.push("c");
  });

  events2.emit("event1");
  events2.emit("event2");
  assert.equal(handles, ["a", "b", "a", "c", "b"]);

  events.emit("event1");
  events.emit("event2");
  assert.equal(handles, ["a", "b", "a", "c", "b", "a", "b"]);

  handles = [];

  events.on("event1", () => {
    handles.push("d");
  });

  events.emit("event1");
  events.emit("event2");
  assert.equal(handles, ["a", "d", "b"]);

  events2.emit("event1");
  events2.emit("event2");
  assert.equal(handles, ["a", "d", "b", "a", "c", "b"]);
});

test("emit.ifListening: Only executes data function if listener is attatched", () => {
  const events = new EventEmitter<[["event1", string], ["event2", string]]>();

  const handles: string[] = [];

  let runs = 0;
  const emit = () => {
    events.emit.ifListening("event1", () => {
      runs++;
      return "expensive";
    });
  };

  emit();
  assert.is(runs, 0);

  events.on("event2", () => {});
  emit();
  assert.is(runs, 0);

  events.on("event1", (data) => {
    handles.push(data);
  });
  emit();
  assert.is(runs, 1);
  assert.equal(handles, ["expensive"]);

  events.destroy("event1");
  emit();
  assert.is(runs, 1);
  assert.equal(handles, ["expensive"]);

  events.on.all((name, data) => {
    handles.push(`all:${data}`);
  });
  emit();
  assert.is(runs, 2);
  assert.equal(handles, ["expensive", "all:expensive"]);

  events.destroy();
  emit();
  assert.is(runs, 2);
  assert.equal(handles, ["expensive", "all:expensive"]);
});

test("on.all: Handle all events, provide extra event-name arg", () => {
  const events = new EventEmitter<
    [["event1", string, string], ["event2", string]]
  >();

  const handles: [string, string][] = [];

  // @ts-expect-error
  events.on.all((name, data) => {
    handles.push([name, data]);
    return "untracked";
  });

  assert.equal(events.emit("event1", "a").result, []);
  assert.equal(handles, [["event1", "a"]]);

  assert.equal(events.emit("event2", "b").result, []);
  assert.equal(handles, [
    ["event1", "a"],
    ["event2", "b"],
  ]);

  events.on.all(() => {
    return new Track("returned");
  });
  assert.equal(events.emit("event1", "a").result, ["returned"]);
});

test("once: Handle event once", () => {
  const events = new EventEmitter<[["event"]]>();

  let runs = 0;

  events.once("event", () => {
    runs++;
  });

  events.emit("event");
  assert.is(runs, 1);
  events.emit("event");
  assert.is(runs, 1);
});

test("once.all: Handle all events once", () => {
  const events = new EventEmitter<[["event"]]>();

  let runs = 0;

  events.once.all((name, data) => {
    runs++;
  });

  events.emit("event");
  assert.is(runs, 1);
  events.emit("event");
  assert.is(runs, 1);
});

test.run();
