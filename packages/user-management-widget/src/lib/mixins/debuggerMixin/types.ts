export type DebuggerMessage = {
  title: string;
  description?: string;
};

type Boundary = number | 'all'; // all means that all the element is visible

export type Boundaries = {
  top?: Boundary;
  left?: Boundary;
  right?: Boundary;
  bottom?: Boundary;
};

