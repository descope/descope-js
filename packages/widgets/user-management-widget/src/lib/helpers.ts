import {
  CustomAttributeType,
  CustomAttributeTypeMap,
  User,
} from './widget/api/types';

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

export const formatDate = (val: string) =>
  new Date(Number(val)).toLocaleDateString('en-US');

export const formatCustomAttrValue = (
  type: CustomAttributeTypeMap,
  val: CustomAttributeType,
) => {
  switch (type) {
    case CustomAttributeTypeMap['date']:
      return formatDate(`${val}`);
    default:
      return val;
  }
};

export function getUrlParam(paramName: string) {
  const urlParams = new URLSearchParams(window.location.search);

  return urlParams.get(paramName);
}

export function resetUrlParam(paramName: string) {
  if (window.history.replaceState && getUrlParam(paramName)) {
    const newUrl = new URL(window.location.href);
    const search = new URLSearchParams(newUrl.search);
    search.delete(paramName);
    newUrl.search = search.toString();
    window.history.replaceState({}, '', newUrl.toString());
  }
}
