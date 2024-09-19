# record-tuple

## 1.3.5

### Patch Changes

- d71249f8: Support CommonJS, bundle with Rollup

## 1.3.4

### Patch Changes

- 83b072ee: Fix exports field

## 1.3.3

### Patch Changes

- f890600e: Add exports field

## 1.3.2

### Patch Changes

- 7d1b650: Iterative tuple resolution

## 1.3.1

### Patch Changes

- ccccf78: Remove ??= syntax

## 1.3.0

### Minor Changes

- d0036f8: RecordTuple.deep stops at record or tuple
  isTuple and isRecord symbols were unset, this is no longer the case

## 1.2.0

### Minor Changes

- 0b1ad53: Use symbols instead of type branding

### Patch Changes

- be13075: Finalizer tests

## 1.1.1

### Patch Changes

- d1d2b3e: Improved types for Record.entries and Record.fromEntries

## 1.1.0

### Minor Changes

- 913f864: Tuple.from, Record.entries, Record.fromEntries

### Patch Changes

- 913f864: Add Record return type
- 913f864: No longer expose caches
- 913f864: Record creation with symbol key throws

## 1.0.2

### Patch Changes

- Fix finalizer generation logic

## 1.0.1

### Patch Changes

- Fix imports

## 1.0.0

### Major Changes

- 4dbc80c: Allow for garbage collection

### Minor Changes

- 7277b9d: Added RecordTuple: Generic immutable data structure factory
