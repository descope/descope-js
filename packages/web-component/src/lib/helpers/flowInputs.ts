export const transformFlowInputFormData = (data: string) => {
  try {
    const form = JSON.parse(data);

    let formData = form;
    const vals = Object.values(form);

    // transform values to object structure if needed
    if (vals.some((s) => typeof s === 'string')) {
      formData = Object.fromEntries(
        Object.keys(form).map((key) =>
          typeof form[key] !== 'string'
            ? [key, form[key]]
            : [key, { value: form[key] }],
        ),
      );
    }

    return Object.entries(formData).reduce(
      (prev, [name, value]) => ({
        ...prev,
        [`form.${name}`]: value,
      }),
      formData,
    );
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
