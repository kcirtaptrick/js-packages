import fs from "fs-extra";
import prettier from "prettier";
import pkg from "../package.json" assert { type: "json" };

const rootPath = new URL("../src/full.ts", import.meta.url);
const full: string = await fs.readFile(rootPath, "utf-8");

const flagStr = full.slice(0, full.indexOf("\n"));
const rest = full.slice(full.indexOf("\n") + 1);

const flags = flagStr
  .split(" ")
  .filter((s) => s && !s.includes("*"))
  .sort();

const exports: Record<string, string> = {
  "./full": "./dist/full.js",
  "./minimal": "./dist/minimal.js",
};

await Promise.all([
  // Rewrite flags in alphabetical order
  fs.writeFile(rootPath, `/* ${flags.join(" ")} */\n${rest}`),
  // Generate minimal file
  fs.writeFile(new URL("minimal.ts", rootPath), withFlags([])),
  // Generate other configurations
  (async function nextCall(currentFlags: string[] = []) {
    const rest = flags.slice(flags.indexOf(currentFlags.at(-1)!) + 1);

    if (currentFlags.length > 0 && rest.length > 0) {
      try {
        await fs.mkdir(new URL(currentFlags.join("/"), rootPath));
      } catch (e) {
        // Do nothing
      }
    }

    const promises: Promise<void>[] = [];

    for (const flag of rest) {
      const next = [...currentFlags, flag];

      const path = next.join("/");

      exports[`./${path}`] = `./dist/${path}.js`;
      promises.push(
        fs.writeFile(new URL(`${path}.ts`, rootPath), withFlags(next))
      );

      promises.push(nextCall(next));
    }
    await Promise.all(promises);
  })(),
]);

await fs.writeFile(
  new URL("../package.json", rootPath),
  JSON.stringify(
    {
      ...pkg,
      exports: Object.fromEntries(
        Object.entries(exports).map(([path, file]) => [
          path,
          {
            // Must be first
            types: `${file.slice(0, file.lastIndexOf("."))}.d.ts`,
            import: file,
          },
        ])
      ),
    },
    null,
    2
  )
);

function withFlags(flags: string[]) {
  const sections = rest.split(/(\/\* [+/][\w.]+ \*\/)/);

  let body = "";
  const stack: string[] = [];
  const omitStack: string[] = [];

  const tagPattern = /\/\* ([+/])([\w.]+) \*\//;

  for (const section of sections) {
    if (tagPattern.test(section)) {
      const [, operator, flag] = section.match(tagPattern)!;

      if (operator === "+") {
        stack.push(flag);
        if (!flags.includes(flag)) {
          omitStack.push(flag);
        }
      } else if (operator === "/") {
        if (flag !== stack.at(-1))
          throw new Error(
            `Invalid closing tag "${flag}" with "${stack.at(
              -1
            )}" at top of stack`
          );

        stack.pop();
        if (flag === omitStack.at(-1)) {
          omitStack.pop();
        }
      }
      continue;
    }

    if (omitStack.length === 0) {
      body += section;
    }
  }

  return prettier.format(
    `/* ${flags.join(" ")} */\n${body}`.replace(/\/\/ prettier-ignore/g, ""),
    {
      parser: "typescript",
    }
  );
}
