export type TutorErrorKind = 'network' | 'timeout' | 'server' | 'bad_response' | 'cancelled';

/** The only error type the tutor services reject with. The UI maps `kind` to friendly copy. */
export class TutorError extends Error {
  readonly kind: TutorErrorKind;
  readonly status?: number;

  constructor(kind: TutorErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'TutorError';
    this.kind = kind;
    this.status = status;
  }
}
