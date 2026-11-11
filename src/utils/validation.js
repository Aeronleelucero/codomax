// Pure validation functions. Each returns an object of { fieldName: message }.
// An empty object means the values are valid.
//
// Keeping validation outside the components makes it easy to reuse and test,
// and the same rules can later be mirrored on the backend.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const PASSWORD_MIN_LENGTH = 8;

export const BLOG_LIMITS = {
  titleMin: 5,
  titleMax: 120,
  excerptMin: 20,
  excerptMax: 220,
  contentMinWords: 50,
};

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(value.trim());
}

export function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function countWords(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function validateEmailField(email) {
  if (!email.trim()) return 'Email is required.';
  if (!isValidEmail(email)) return 'Enter a valid email address, like name@example.com.';
  return null;
}

export function validateLogin({ email, password }) {
  const errors = {};
  const emailError = validateEmailField(email);
  if (emailError) errors.email = emailError;
  if (!password) errors.password = 'Password is required.';
  return errors;
}

export function validateRegister({ fullName, email, password, confirmPassword }) {
  const errors = {};

  if (!fullName.trim()) errors.fullName = 'Full name is required.';
  else if (fullName.trim().length < 2) errors.fullName = 'Name must be at least 2 characters.';

  const emailError = validateEmailField(email);
  if (emailError) errors.email = emailError;

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  } else if (!/[a-z]/i.test(password) || !/\d/.test(password)) {
    errors.password = 'Password must include at least one letter and one number.';
  }

  if (!confirmPassword) errors.confirmPassword = 'Please confirm your password.';
  else if (confirmPassword !== password) errors.confirmPassword = 'Passwords do not match.';

  return errors;
}

// Drafts only need a title so writers can save early. Publishing requires
// every field so readers never see an incomplete article.
export function validateBlog(values, { publish }) {
  const errors = {};
  const title = values.title.trim();
  const excerpt = values.excerpt.trim();
  const coverImage = values.coverImage.trim();
  const { titleMin, titleMax, excerptMin, excerptMax, contentMinWords } = BLOG_LIMITS;

  if (!title) errors.title = 'Title is required.';
  else if (title.length < titleMin) errors.title = `Title must be at least ${titleMin} characters.`;
  else if (title.length > titleMax) errors.title = `Title must be ${titleMax} characters or fewer.`;

  if (excerpt.length > excerptMax) {
    errors.excerpt = `Description must be ${excerptMax} characters or fewer.`;
  } else if (publish && !excerpt) {
    errors.excerpt = 'A short description is required to publish.';
  } else if (publish && excerpt.length < excerptMin) {
    errors.excerpt = `Description must be at least ${excerptMin} characters.`;
  }

  if (publish) {
    const words = countWords(values.content);
    if (words === 0) errors.content = 'Content is required to publish.';
    else if (words < contentMinWords) {
      errors.content = `Write at least ${contentMinWords} words to publish (currently ${words}).`;
    }
  }

  if (publish && !values.category) errors.category = 'Choose a category to publish.';

  if (coverImage && !isValidUrl(coverImage)) {
    errors.coverImage = 'Enter a full image URL starting with http:// or https://.';
  }

  return errors;
}

export function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

// Moves keyboard focus to the first invalid field, e.g. "login-email".
export function focusFirstError(errors, idPrefix) {
  const [firstField] = Object.keys(errors);
  if (firstField) document.getElementById(`${idPrefix}-${firstField}`)?.focus();
}
