type JSONSerializable =
  | string
  | number
  | boolean
  | null
  | Array<JSONSerializable>;

export type FlowInput = Record<string, JSONSerializable>;
