type JSONSerializable =
  | string
  | number
  | boolean
  | null
  | Array<JSONSerializable>;

export type FlowInput = Record<string, JSONSerializable>;

export type FlowVersions = {
  version: number;
  componentsVersion: string;
  allVersions: Record<string, number>;
};
