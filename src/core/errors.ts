/** Failure semantics a host can map to its transport (research R5): VALIDATION → 400,
 * NOT_FOUND → 404, CONFLICT → 409. */
export type LyceumErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT';

/**
 * Every domain-rule failure thrown by Lyceum's operations. Hosts branch on `code`,
 * never on the message (messages keep the path-naming `Lyceum: …` style for humans).
 */
export class LyceumDomainError extends Error {
  constructor(
    public readonly code: LyceumErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LyceumDomainError';
  }
}
