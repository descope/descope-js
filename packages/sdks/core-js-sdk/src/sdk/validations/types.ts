export type ValidationRule = (val: any) => boolean;
export type Validator = (val: any) => string | false;
export type MakeValidator = (msg?: string) => Validator;
