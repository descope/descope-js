type JSONSerializable =
  | string
  | number
  | boolean
  | null
  | Array<JSONSerializable>;

export type FlowInput = Record<string, JSONSerializable>;

/** One client-side form validation failure, reported after the flow started. */
export type FlowValidationEvent = {
  id: string;
  field: string;
  rule: string;
  message: string;
  screenId: string;
  screenName: string;
  ts: number;
};

/** Options for a flow next call */
export type NextOptions = {
  // current session JWT, exposing its validated claims to the flow via the sessionJwtClaims context key
  sessionJwt?: string;
};
