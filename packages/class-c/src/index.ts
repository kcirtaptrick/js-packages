type C = (<
  T extends
    | string
    | TemplateStringsArray
    | Readonly<Record<string, string>>
    | undefined
>(
  stringsOrClassMap: T,
  ...values: T extends TemplateStringsArray ? any[] : []
) => T extends TemplateStringsArray | string | undefined
  ? string & { c: C }
  : (strings: TemplateStringsArray, ...v: any[]) => string & { c: C }) &
  C.Options;

declare namespace C {
  type Options = {
    config: Config;
    clone(): C;
  };
  type Config = { transform(str: string): string };
}

const c = (function build(parent?: C) {
  const c = Object.assign(
    ((stringOrTemplateStringsOrClassMap, ...values) => {
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
    }) as C,
    {
      config: {
        transform: (str: string) => str,
        ...parent?.config,
      },
      clone: () => build(c),
    }
  );

  const extend = (str: string) =>
    Object.assign(c.config.transform(str), {
      c(...args) {
        const res = c(...args);

        // `res` will be a function when it's passed a class map: `typeof c(styles) === "function"`
        if (typeof res === "function")
          return (...args) => c`${str} ${res(...args)}`;

        return c`${str} ${res}`;
      },
    } as { c: C });

  const classNameFromTemplate =
    (transform = (str: string) => str) =>
    (strings: TemplateStringsArray, ...values: any[]) => {
      const classNames = transform(
        strings
          .reduce(
            (acc, curr, i) =>
              `${acc}${curr}${(function getString(value = values[i]): any {
                if (!value) return "";

                if (
                  typeof value === "string" ||
                  typeof value === "number" ||
                  value instanceof String
                )
                  return value;

                if (Array.isArray(value))
                  return value
                    .map((item) => getString(item))
                    .filter((item) => typeof item === "string")
                    .join(" ");

                if (typeof value === "function") return getString(value());

                if (typeof value === "object")
                  return Object.entries(value)
                    .flatMap(([className, condition]) =>
                      (
                        typeof condition === "function"
                          ? condition()
                          : condition
                      )
                        ? className
                        : []
                    )
                    .join(" ");

                return "";
              })()}`,
            ""
          )
          .replace(/\s+/g, " ")
          .trim()
      );

      return extend(classNames);
    };

  return c;
})();

export default c;
