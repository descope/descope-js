import { User } from './widget/api/types';

export const unflatten = (formData: Partial<User>, keyPrefix: string) =>
  Object.entries(formData).reduce((acc, [key, value]) => {
    const [prefix, ...rest] = key.split('.');

    if (keyPrefix !== prefix) {
      return Object.assign(acc, { [key]: value });
    }

    if (!acc[prefix]) {
      acc[prefix] = {};
    }

    acc[prefix][rest.join('.')] = value;

    return acc;
  }, {});

export const flatten = (
  vals: Record<string, string | boolean | number>,
  keyPrefix: string,
) =>
  Object.fromEntries(
    Object.entries(vals || {}).map(([key, val]) => [
      `${keyPrefix}.${key}`,
      val,
    ]),
  );
