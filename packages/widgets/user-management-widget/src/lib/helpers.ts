import {
  CustomAttributeType,
  CustomAttributeTypeMap,
} from './widget/api/types';

// flatten/unflatten are shared with the access-key-management-widget
export { flatten, unflatten } from '@descope/sdk-helpers';

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
