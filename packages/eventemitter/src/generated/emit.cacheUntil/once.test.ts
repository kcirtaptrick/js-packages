/* emit.cacheUntil once */
import { suite } from "uvu";
import * as assert from "uvu/assert";
import EventEmitter from "./once";

import {} from "../../utils";

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
  const waitFor = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  test("emit.cacheUntil: Can cache emitted events for amount of time", async () => {
    const events = new EventEmitter<[["event1", string], ["event2", string]]>();

    let handles: string[] = [];

    const emits = [
      ["a", waitFor(50)],
      ["b", waitFor(100)],
    ] as const;
    const complete = { a: false, b: false };

    for (const [name, cacheUntil] of emits) {
      events.emit.cacheUntil(cacheUntil)("event1", name);
      cacheUntil.then(() => {
        complete[name] = true;

        handles = [];
        events.on("event1", (data) => {
          handles.push(data);
        });

        assert.not.ok(handles.includes(name));
      });
    }

    events.on("event1", (data) => {
      handles.push(`event1:${data}`);
    });
    events.on("event2", (data) => {
      handles.push(`event2:${data}`);
    });
    assert.equal(handles, ["event1:a", "event1:b"]);

    while (!Object.values(complete).every(Boolean)) {
      handles = [];
      events.on("event1", (data) => {
        handles.push(data);
      });

      for (const [name] of emits) {
        assert.is(complete[name], !handles.includes(name));
      }

      await new Promise((resolve) => {
        setTimeout(resolve, 1);
      });
    }
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
