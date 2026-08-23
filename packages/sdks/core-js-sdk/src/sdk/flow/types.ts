type JSONSerializable =
  | string
  | number
  | boolean
  | null
  | Array<JSONSerializable>;

export type FlowInput = Record<string, JSONSerializable>;

/** Options for a flow next call */
export type NextOptions = {
  // current session JWT, exposing its validated claims to the flow via the sessionJwtClaims context key
  sessionJwt?: string;
};
