// MOCK DATA ONLY.
// Passwords are stored in plain text here because there is no backend yet.
// A real backend must hash passwords and never send them to the browser.

export const DEMO_CREDENTIALS = {
  email: 'demo@codomax.dev',
  password: 'codomax123',
};

export const SEED_USERS = [
  {
    id: 'user-demo',
    name: 'Jordan Rivera',
    email: DEMO_CREDENTIALS.email,
    password: DEMO_CREDENTIALS.password,
    createdAt: '2026-08-14T10:00:00.000Z',
  },
];
