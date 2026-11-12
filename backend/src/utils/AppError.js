// An error that knows which HTTP status it should produce.
//
// Services throw AppError for expected problems (bad input, wrong password,
// missing permissions). The centralized error handler in app.js turns it into
// a JSON response. Any other error is treated as an unexpected 500.
export class AppError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    // Optional field-level messages, e.g. { email: 'Email is required.' }
    if (errors && Object.keys(errors).length > 0) this.errors = errors;
  }
}

// Throws a 400 when the errors object is not empty. The first message becomes
// the summary so clients that only show `message` still say something useful.
export function throwIfInvalid(errors, summary) {
  const messages = Object.values(errors);
  if (messages.length === 0) return;
  throw new AppError(400, summary ?? messages[0], errors);
}
