import { defineConfig } from "rollup";
import typescript from "@rollup/plugin-typescript";

const input = "src/index.ts";

export default defineConfig([
  {
    input,
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
        composite: false,
      }),
    ],
    output: [
      { dir: "dist/cjs", format: "cjs" },
      { dir: "dist/esm", format: "esm" },
    ],
  },
  {
    input,
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: true,
        declarationDir: "dist/types",
      }),
    ],
    output: [{ dir: "dist/types", format: "es" }],
  },
]);
