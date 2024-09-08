export const capitalize = (s: string) => s && s[0].toUpperCase() + s.slice(1);

export const conditionalObj = <T extends any>(key: string, val: T) =>
  val ? { [key]: val } : {};

export const conditionalJsonParse = (str: string) => {
  if (!str) return undefined;

  const res = JSON.parse(str);

  if (Array.isArray(res) && res.length === 0) return undefined;

  return res;
};
