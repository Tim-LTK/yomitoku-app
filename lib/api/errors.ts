import { ZodError } from "zod";

export type AnalyseClientErrorKind =
  | "configuration"
  | "network"
  | "http"
  | "response_shape"
  | "parse_json";

export class AnalyseClientError extends Error {
  readonly kind: AnalyseClientErrorKind;

  readonly statusCode?: number;

  readonly zodError?: ZodError;

  constructor(
    message: string,
    kind: AnalyseClientErrorKind,
    options?: { statusCode?: number; zodError?: ZodError; cause?: unknown },
  ) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "AnalyseClientError";
    this.kind = kind;
    this.statusCode = options?.statusCode;
    this.zodError = options?.zodError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
