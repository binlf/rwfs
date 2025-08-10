type Config = {
  [pattern: string]: string;
};
/**
 * Recursively replaces all patterns in a string matching those found in `config` with their corresponding replacements.
 *
 * @param {string} str - The string to be operated on.
 * @param {Config} config - A configuration object for setting the patterns and their corresponding replacements.
 * @returns {string} The formatted string.
 */
// todo: support RegEx keys
export const replaceAll = (
  str: string,
  config: { [pattern: string]: string }
): string => {
  let newString = "";
  Object.entries(config).forEach(([pattern, replacement]) => {
    newString = newString
      ? newString.replaceAll(pattern, replacement)
      : str.replaceAll(pattern, replacement);
  });
  return newString;
};

export const isObjectLiteral = (
  value: unknown
): value is Record<string, unknown> => {
  if (value === null || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};
