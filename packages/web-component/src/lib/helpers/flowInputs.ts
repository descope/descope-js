const flattenFormObject = (obj: any, prefix = '') =>
  Object.keys(obj).reduce((res, el) => {
    if (typeof obj[el] === 'object' && obj[el] !== null && !obj[el]?.value) {
      return { ...res, ...flattenFormObject(obj[el], `${prefix + el  }.`) };
    }
    const v = typeof obj[el] === 'object' ? obj[el] : { value: obj[el] };
    return { ...res, [prefix + el]: v, [`form.${prefix}${el}`]: v };
  }, []);

export const transformFlowInputFormData = (formData: string) => {
  try {
    return flattenFormObject(JSON.parse(formData));
  } catch (e) {
    return {};
  }
};

export const extractNestedAttribute = (
  formData: Record<string, string | Record<string, string>>,
  attr: string,
) =>
  Object.fromEntries(
    Object.entries(formData).map(([name, values]) => [name, values[attr]]),
  );
