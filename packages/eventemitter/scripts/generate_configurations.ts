import fs from "fs-extra";
import prettier from "prettier";
import pkg from "../package.json" assert { type: "json" };

const rootPath = new URL("../src/full.ts", import.meta.url);
const full: string = await fs.readFile(rootPath, "utf-8");
const fullTest: string = await fs.readFile(
  new URL("full.test.ts", rootPath),
  "utf-8"
);

const flagStr = full.slice(0, full.indexOf("\n"));
const body = full.slice(full.indexOf("\n") + 1);

const flags = flagStr
  .split(" ")
  .filter((s) => s && !s.includes("*"))
  .sort();

const exports: Record<string, string> = {
  "./full": "full",
  "./minimal": "generated/minimal",
};

// Rewrite flags in alphabetical order
await fs.writeFile(rootPath, `/* ${flags.join(" ")} */\n${body}`);

const generatedPath = new URL("generated/", rootPath);

await fs.rm(generatedPath, { recursive: true, force: true });
await fs.mkdir(generatedPath);

await Promise.all([
  // Generate minimal
  fs.writeFile(
    new URL("minimal.ts", generatedPath),
    generateWithFlags(body, [])
  ),
  fs.writeFile(
    new URL("minimal.test.ts", generatedPath),
    generateWithFlags(fullTest, []).replace("./full", "./minimal")
  ),
  // Generate other configurations
  (async function nextCall(currentFlags: string[] = []) {
    const rest = flags.slice(flags.indexOf(currentFlags.at(-1)!) + 1);

    if (currentFlags.length > 0 && rest.length > 0) {
      try {
        await fs.mkdir(new URL(currentFlags.join("/"), generatedPath));
      } catch (e) {
        // Do nothing
      }
    }

    const promises: Promise<void>[] = [];

    for (const flag of rest) {
      const next = [...currentFlags, flag];

      const path = next.join("/");

      exports[`./${path}`] = `generated/${path}`;
      promises.push(
        fs.writeFile(
          new URL(`${path}.ts`, generatedPath),
          generateWithFlags(body, next)
        ),
        fs.writeFile(
          new URL(`${path}.test.ts`, generatedPath),
          generateWithFlags(fullTest, next).replace("./full", `./${flag}`)
        )
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
            types: `./dist/${file}.d.ts`,
            import: `./dist/${file}.js`,
          },
        ])
      ),
    },
    null,
    2
  )
);

function generateWithFlags(input: string, flags: string[]) {
  const sections = input.split(/(\/\* [+/][\w.]+ \*\/)/);

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

  if (stack.length > 0) throw new Error(`Unclosed tags: ${stack.join(", ")}`);

  return prettier.format(
    `/* ${flags.join(" ")} */\n${body
      .replace(/\/\/ prettier-ignore/g, "")
      .replace("./utils", `${"../".repeat(flags.length || 1)}utils`)}`,
    {
      parser: "typescript",
    }
  );
}
