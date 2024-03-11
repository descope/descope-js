export const missingAttrValidator = (attrName: string, value: string | null) =>
  !value && `${attrName} cannot be empty`;
