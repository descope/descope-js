export const transformFlowInputFormData = (formData: string) => {
  try {
    const data = JSON.parse(formData);

    return Object.fromEntries(
      Object.keys(data)
        .map((key) =>
          typeof data[key] !== 'string'
            ? [key, data[key]]
            : [key, { value: data[key] }],
        )
        .flatMap(([name, value]) => [
          [name, value],
          [`form.${name}`, value],
        ]),
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
