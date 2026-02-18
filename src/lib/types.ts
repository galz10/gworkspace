export type Primitive = string | boolean;
export type OptValue = Primitive | Primitive[];
export type Options = Record<string, OptValue>;
export type JsonObject = Record<string, unknown>;
export type AnyRecord = Record<string, any>;
