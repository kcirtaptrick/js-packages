/* asyncIterator clone emit.if emit.withContext once */
import { suite } from "uvu";
import * as assert from "uvu/assert";

import EventEmitter from "./once";

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

test("Returns from handlers passed to emit in order", () => {
  const events = new EventEmitter<[["event", undefined, string]]>();

  events.on("event", () => "a");
  events.on("event", () => "b");
  events.on("event", () => "c");

  assert.equal(events.emit("event"), ["a", "b", "c"]);
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

  events.off("event", handler);

  events.emit("event");
  assert.equal(handles, ["a"]);
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

test("emit.if: Emits if event tuple is truthy", () => {
  const events = new EventEmitter<[["event", string]]>();

  const handles: string[] = [];

  events.on("event", (data) => {
    handles.push(data);
  });

  events.emit.if(["event", "a"]);
  assert.equal(handles, ["a"]);

  events.emit.if(null);
  assert.equal(handles, ["a"]);
});

{
  type Context = { metadata: Record<string, any> };

  test("emit.withContext: Provide non-data context to event handlers", () => {
    const events = new EventEmitter<[["event", string]], Context>();

    const handles: [string, Context][] = [];

    events.on("event", (data, context) => {
      handles.push([data, context!]);
    });
    events.emit.withContext({ metadata: { prop1: "value1" } })("event", "data");
    assert.equal(handles, [["data", { metadata: { prop1: "value1" } }]]);
  });
}

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

test.run();
