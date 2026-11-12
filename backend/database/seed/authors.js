// Accounts created by `npm run db:seed`.
//
// The demo account has a published password so reviewers can log in.
// The other authors exist only so sample articles have real authors: they get
// a random password nobody knows, so they cannot be logged into.

export const DEMO_ACCOUNT = {
  key: 'user-demo',
  name: 'Jordan Rivera',
  email: 'demo@artikly.dev',
  password: 'artikly123',
};

export const SEED_AUTHORS = [
  DEMO_ACCOUNT,
  { key: 'user-priya', name: 'Priya Nair', email: 'priya.nair@example.com' },
  { key: 'user-elena', name: 'Elena Petrova', email: 'elena.petrova@example.com' },
  { key: 'user-samuel', name: 'Samuel Okafor', email: 'samuel.okafor@example.com' },
  { key: 'user-marcus', name: 'Marcus Chen', email: 'marcus.chen@example.com' },
  { key: 'user-hana', name: 'Hana Kobayashi', email: 'hana.kobayashi@example.com' },
];
