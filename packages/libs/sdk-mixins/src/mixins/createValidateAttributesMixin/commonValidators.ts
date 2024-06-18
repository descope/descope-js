export const missingAttrValidator = (attrName: string, value: string | null) =>
  !value &&
  `${attrName} cannot be empty, please make sure to set this attribute`;
