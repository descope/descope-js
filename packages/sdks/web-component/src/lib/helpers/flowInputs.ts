const flattenFormObject = (obj: any, prefix = '') =>
  Object.keys(obj).reduce((res, el) => {
    if (Array.isArray(obj[el])) {
      return {
        ...res,
        [el]: { value: obj[el] },
      };
    }
    if (typeof obj[el] === 'object' && obj[el] !== null && !obj[el]?.value) {
      return { ...res, ...flattenFormObject(obj[el], `${prefix + el}.`) };
    }
    const v = typeof obj[el] === 'object' ? obj[el] : { value: obj[el] };
    const fl = { ...res, [prefix + el]: v, [`form.${prefix}${el}`]: v };
    if (el === 'displayName') {
      return { ...fl, [`${prefix}fullName`]: v, [`form.${prefix}fullName`]: v };
    }
    return fl;
  }, []);

export const transformFlowInputFormData = (formData: string) => {
  try {
    return flattenFormObject(JSON.parse(formData));
  } catch (e) {
    return {};
  }
};

export const extractNestedAttribute = (
  formData: Record<string, string | Record<string, string> | string[] | any[]>,
  attr: string,
) =>
  Object.fromEntries(
    Object.entries(formData).map(([name, values]) => {
      return [name, values[attr]];
    }),
  );
