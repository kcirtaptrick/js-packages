# `class-c`

> Chainable class name helper with first class CSS Module support

- [`class-c`](#class-c)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Basic](#basic)
    - [Chaining](#chaining)
    - [Conditionals](#conditionals)
    - [CSS Modules](#css-modules)
      - [Chaining](#chaining-1)
      - [Many references](#many-references)
      - [Multiple modules/styles objects](#multiple-modulesstyles-objects)
      - [Prefixing and suffixing](#prefixing-and-suffixing)

## Installation

```bash
$ npm install class-c
```

## Usage

### Basic

`c` uses the [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates) syntax

```ts
import c from "class-c";

c`a b`; // => "a b"

// Extra whitespace will be removed
c`   a     b    `; // => "a b"
c`
  a
  b
`; // => "a b"

// Calling with a string can be useful for class forwarding, see CSS Modules section
c("a b"); // => "a b"
```

### Chaining

You can chain as many scopes as you'd like

```ts
c`a`.c`b c`.c`d`; // => "a b c d"

// This is more useful when used with CSS Modules, see CSS Modules section for more details
const styles = {
  a: "scoped-a",
  b: "scoped-b",
};

c(styles)`a b`.c`a b`; // => "scoped-a scoped-b a b"
```

### Conditionals

Falsey values will be omitted, condition-by-class mapping is also supported. This can be useful with object shorthand. This also supports function conditions.

```ts
c`a ${condition && b}`; // => condition ? "a b" : "a"

c`a ${{ b: false, c: true }}`; // => "a c"

const focused = true;
const highlighted = false;
const open = true;

c`${{ focused, highlighted, open }}`; // => "focused open"

// Function conditions
const focused = () => true;
const highlighted = () => false;
const open = () => true;

c`${{ focused, highlighted, open }}`; // => "focused open"
```

### CSS Modules

Calling `c` with a styles object will create a scoped context

```ts
const styles = {
  a: "scoped-a",
  b: "scoped-b",
};

c(styles)`a b`; // => "scoped-a scoped-b"
```

#### Chaining

Chaining will reset context which can be useful for forwarding classes

```ts
c(styles)`a b`.c`a b`; // => "scoped-a scoped-b a b"

// Forwarding classes
const someExternalClasses = "external-a external-b";
c(styles)`a b`.c(someExternalClasses); // => "scoped-a scoped-b external-a external-b"
```

#### Many references

If you need to use a context in many places, it can be convenient to make a new helper

```ts
const cs = c(styles);

cs`a`; // => "scoped-a"

// Chaining will still reset context
cs`b`.c`c`; // => "scoped-b"
```

#### Multiple modules/styles objects

```ts
const otherStyles = {
  a: "other-a",
  b: "other-b",
};

c(styles)`a b`.c(otherStyles)`a b`; // => "scoped-a scoped-b other-a other-b"
```

```ts
// Non existant classes will be removed
c(styles)`a nonexistant b`; // => "scoped-a scoped-b"
```

#### Prefixing and suffixing

```ts
const styles = {
  variant_a: "scoped-variant_a",
  variant_b: "scoped-variant_b",
};

const variant: "a" | "b" = "a";

c(styles)`variant_${variant}`; // => "scoped-variant_a"

const suffixStyles = {
  a_suffix: "scoped-a_suffix",
  b_suffix: "scoped-b_suffix",
};

c(suffixStyles)`${variant}_suffix`; // => "scoped-variant_a"
```
