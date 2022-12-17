type C = <
  T extends string | TemplateStringsArray | Record<string, string> | undefined
>(
  stringsOrClassMap: T,
  ...values: T extends TemplateStringsArray ? any[] : never
) => T extends TemplateStringsArray | string | undefined
  ? string & { c: C }
  : (strings: TemplateStringsArray, ...v: any) => string & { c: C };

const c = ((stringOrTemplateStringsOrClassMap, ...values) => {
  // Undefined
  if (!stringOrTemplateStringsOrClassMap)
    return Object.assign("", {
      c,
    });

  // String
  if (
    typeof stringOrTemplateStringsOrClassMap === "string" ||
    stringOrTemplateStringsOrClassMap instanceof String
  )
    return extend(stringOrTemplateStringsOrClassMap as string);

  // Template
  if (stringOrTemplateStringsOrClassMap instanceof Array)
    return classNameFromTemplate()(
      stringOrTemplateStringsOrClassMap,
      ...values
    );

  // Class map
  return classNameFromTemplate((str) =>
    str
      .split(" ")
      .map((cls) => stringOrTemplateStringsOrClassMap[cls])
      .filter(Boolean)
      .join(" ")
  );
}) as C;

export default c;

const extend = (str: string) =>
  Object.assign(str, {
    c: (...args) => {
      const res = c(...args);

      if (typeof res === "function")
        return (...args) => c`${str} ${res(...args)}`;

      return c`${str} ${c(...args)}`;
    },
  } as { c: C });

const classNameFromTemplate =
  (transform = (str: string) => str) =>
  (strings: TemplateStringsArray, ...values: any[]) => {
    const classNames = transform(
      strings
        .reduce(
          (acc, curr, i) =>
            `${acc}${curr}${(function getString(value): any {
              if (!value) return "";

              if (value instanceof Array)
                return value
                  .map((item) => getString(item))
                  .filter((item) => typeof item === "string")
                  .join(" ");

              if (
                typeof value === "string" ||
                typeof value === "number" ||
                value instanceof String
              )
                return value;

              if (typeof value === "object")
                return Object.entries(value)
                  .flatMap(([className, condition]) =>
                    condition ? className : []
                  )
                  .join(" ");

              return "";
            })(values[i])}`,
          ""
        )
        .replaceAll(/\s+/g, " ")
        .trim()
    );

    return extend(classNames);
  };
