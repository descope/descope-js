
export const transformKey = (key: string) => {
  // eslint-disable-next-line no-sparse-arrays
  const [, trimmedKey, category] = /(.*)\.(prop|attr)$/.exec(key) || [
    ,
    key,
    'rest',
  ];
  return { trimmedKey, category };
};

export const transformAttrValue = (value: any) =>
  typeof value === 'string' || value == null
    ? value
    : JSON.stringify(value);
