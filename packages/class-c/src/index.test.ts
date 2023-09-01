import { suite } from "uvu";
import * as assert from "uvu/assert";
import c from ".";

const test = suite("c");
const matches = (actual: string, expects: string) =>
  assert.is(`${actual}`, expects);

test("Plain string", () => {
  matches(c`a`, "a");
  matches(c("a"), "a");
});

test("Chaining", () => {
  matches(c`a`.c`b`, "a b");
  matches(c`a`.c`b`.c`c`.c`d`, "a b c d");

  matches(c("a").c("b"), "a b");
  matches(c("a").c("b").c("c").c("d"), "a b c d");
});

test("Trimming", () => {
  matches(c`a `, "a");
  matches(c` a`, "a");
  matches(c` a `, "a");
  matches(c` a   b `, "a b");
  matches(
    c`
      class1
      class2
    `,
    "class1 class2"
  );

  matches(
    c`a `.c` b`.c` c `.c`  d    e   `.c`
      class1
      class2
    `,
    "a b c d e class1 class2"
  );
});

test("Interpolation", () => {
  matches(c`${"a"}`, "a");
  matches(c`a ${"b"}`, "a b");
  matches(c`${"a"} b`, "a b");
  matches(c`a ${"b"} c`, "a b c");

  matches(c`${"a"}`.c`b ${"c"}`.c`${"d"} e`.c`f ${"g"} h`, "a b c d e f g h");
});

test("Function value => Plain string", () => {
  matches(c`a ${() => "b"}`, "a b");
});

test("Conditionals", () => {
  matches(c`${false && "a"}`, "");
  matches(c`a ${false && "b"}`, "a");
  matches(c`${false && "a"} b`, "b");
  matches(c`a ${false && "b"} c`, "a c");

  matches(
    // prettier-ignore
    c`${false && "a"}`
    .c`b ${false && "c"}`
    .c`${false && "d"} e`
    .c`f ${false && "g"} h`,
    "b e f h"
  );
});

test("Conditional map", () => {
  matches(c`${{}}`, "");
  matches(c`${{ a: true }}`, "a");
  matches(c`${{ a: false }}`, "");
  matches(c`${{ a: true, b: true }}`, "a b");
  matches(c`${{ a: true, b: false }}`, "a");
  matches(c`${{ a: false, b: true }}`, "b");
  matches(c`${{ a: true, b: true, c: true }}`, "a b c");

  matches(c`${{ a: true, b: true }} c`, "a b c");
  matches(c`a ${{ b: true, c: true }}`, "a b c");
  matches(c`a ${{ b: true, c: true }} d`, "a b c d");
});

test("Function value => Conditional map", () => {
  matches(c`${() => ({ a: true, b: false, c: true })}`, "a c");
});

test("Conditional map: Function values", () => {
  const focused = () => true;
  const highlighted = () => false;
  const open = () => true;

  matches(c`${{ focused, highlighted, open }}`, "focused open");
});

const makeModule = (prefix: string) =>
  Object.fromEntries(
    Array.from({ length: 26 }, (_, i) => {
      const name = String.fromCharCode("a".charCodeAt(0) + i);

      return [name, `${prefix}.${name}`];
    })
  );

// CSS modules
const styles = makeModule("styles");
const otherStyles = makeModule("otherStyles");

test("Styles object (css module)", () => {
  matches(c(styles)`a`, "styles.a");
  matches(c(styles)`a b`, "styles.a styles.b");
  matches(c(styles)`nonexistant`, "");
  matches(c(styles)`nonexistant a`, "styles.a");
  matches(c(styles)`a nonexistant`, "styles.a");
  matches(c(styles)`a nonexistant b`, "styles.a styles.b");
});

test("Styles object: Trimming", () => {
  matches(c(styles)`a `, "styles.a");
  matches(c(styles)` a`, "styles.a");
  matches(c(styles)` a `, "styles.a");
  matches(c(styles)` a   b `, "styles.a styles.b");
  matches(
    c(styles)`
      a
      b
    `,
    "styles.a styles.b"
  );

  matches(
    // prettier-ignore
    c(styles)`a `
    .c(styles)` b`
    .c(styles)` c `
    .c(styles)`  d    e   `
    .c(styles)`
      f
      g
    `,
    "styles.a styles.b styles.c styles.d styles.e styles.f styles.g"
  );
});

test("Styles object: Chaining", () => {
  matches(c(styles)`a`.c`b`, "styles.a b");
  matches(c(styles)`a`.c(styles)`b`, "styles.a styles.b");
  matches(c(styles)`a`.c(otherStyles)`b`, "styles.a otherStyles.b");
  matches(c`a`.c(styles)`b`, "a styles.b");
  matches(c(styles)`nonexistant`.c`a`, "a");
  matches(c`a`.c(styles)`nonexistant`, "a");

  matches(
    // prettier-ignore
    c(styles)`a`
    .c`b`
    .c(otherStyles)`c`
    .c("d")
    .c(styles)`nonexistant`
    .c(styles)`e`,
    "styles.a b otherStyles.c d styles.e"
  );
});

test("Styles object: Interpolation", () => {
  matches(c(styles)`${"a"}`, "styles.a");
  matches(c(styles)`a ${"b"}`, "styles.a styles.b");
  matches(c(styles)`${"a"} b`, "styles.a styles.b");
  matches(c(styles)`a ${"b"} c`, "styles.a styles.b styles.c");

  matches(
    // prettier-ignore
    c(styles)`${"a"}`
    .c(styles)`b ${"c"}`
    .c(styles)`${"d"} e`
    .c(styles)`f ${"g"} h`,
    "styles.a styles.b styles.c styles.d styles.e styles.f styles.g styles.h"
  );
});

test("Styles object: Conditionals", () => {
  matches(c(styles)`${false && "a"}`, "");
  matches(c(styles)`a ${false && "b"}`, "styles.a");
  matches(c(styles)`${false && "a"} b`, "styles.b");
  matches(c(styles)`a ${false && "b"} c`, "styles.a styles.c");

  matches(
    // prettier-ignore
    c(styles)`${false && "a"}`
    .c(styles)`b ${false && "c"}`
    .c(styles)`${false && "d"} e`
    .c(styles)`f ${false && "g"} h`,
    "styles.b styles.e styles.f styles.h"
  );
});

test("Styles object: Conditional map", () => {
  matches(c(styles)`${{}}`, "");
  matches(c(styles)`${{ a: true }}`, "styles.a");
  matches(c(styles)`${{ a: false }}`, "");
  matches(c(styles)`${{ a: true, b: true }}`, "styles.a styles.b");
  matches(c(styles)`${{ a: true, b: false }}`, "styles.a");
  matches(c(styles)`${{ a: false, b: true }}`, "styles.b");
  matches(
    c(styles)`${{ a: true, b: true, c: true }}`,
    "styles.a styles.b styles.c"
  );

  matches(c(styles)`${{ a: true, b: true }} c`, "styles.a styles.b styles.c");
  matches(c(styles)`a ${{ b: true, c: true }}`, "styles.a styles.b styles.c");
  matches(
    c(styles)`a ${{ b: true, c: true }} d`,
    "styles.a styles.b styles.c styles.d"
  );
});

test.run();
