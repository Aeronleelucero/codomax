import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { Client, startFixture } from './support/fixture.js';

let fixture, a, b, guest, userA, userB, draftA, draftB, publicB;
const password = `Password1-${randomBytes(12).toString('hex')}`;
const identity = (name) => ({ fullName: `${name} Writer`, email: `${name}-${randomBytes(8).toString('hex')}@example.com`, password, confirmPassword: password });
const detailsA = identity('Alice');
const detailsB = identity('Bob');
const tokenHash = (token) => createHash('sha256').update(token).digest('hex');

before(async () => {
  fixture = await startFixture();
  a = new Client(fixture.base); b = new Client(fixture.base); guest = new Client(fixture.base);
  userA = (await a.request('/auth/register', { method: 'POST', body: detailsA })).data.user;
  userB = (await b.request('/auth/register', { method: 'POST', body: detailsB })).data.user;
  assert.equal((await a.request('/auth/login', { method: 'POST', body: detailsA })).status, 200);
  assert.equal((await b.request('/auth/login', { method: 'POST', body: detailsB })).status, 200);
  draftA = (await a.request('/blogs', { method: 'POST', body: { title: 'Alice private story', authorId: userB.id } })).data.blog;
  draftB = (await b.request('/blogs', { method: 'POST', body: { title: 'Bob private story' } })).data.blog;
  publicB = (await b.request('/blogs', { method: 'POST', body: { title: 'Bob public story', status: 'published',
    excerpt: 'A complete public story for readers.', category: 'Design', content: 'word '.repeat(55) } })).data.blog;
});
after(async () => { await fixture?.close(); });

test('registration normalizes input, hashes passwords, and returns only public fields', async () => {
  const input = identity('New');
  input.fullName = '  New Writer  '; input.email = input.email.toUpperCase();
  const response = await guest.request('/auth/register', { method: 'POST', body: input });
  assert.equal(response.status, 201);
  assert.deepEqual(Object.keys(response.data.user).sort(), ['createdAt', 'email', 'id', 'name']);
  assert.equal(response.data.user.name, 'New Writer');
  assert.equal(response.data.user.email, input.email.toLowerCase());
  const { rows: [stored] } = await fixture.pool.query('SELECT * FROM users WHERE id = $1', [response.data.user.id]);
  assert.notEqual(stored.password_hash, password);
  assert.match(stored.password_hash, /^\$2[ab]\$12\$/);
  assert.equal(await bcrypt.compare(password, stored.password_hash), true);
});

test('registration rejects duplicate emails, malformed fields and bcrypt byte truncation', async () => {
  assert.equal((await guest.request('/auth/register', { method: 'POST', body: detailsA })).status, 409);
  const input = { fullName: 42, email: 'invalid', password: 'weak', confirmPassword: 'different' };
  const response = await guest.request('/auth/register', { method: 'POST', body: input });
  assert.equal(response.status, 400);
  assert.ok(response.errors.fullName && response.errors.email && response.errors.password && response.errors.confirmPassword);
  const long = `${'é'.repeat(36)}1a`;
  assert.equal((await guest.request('/auth/register', { method: 'POST', body: { ...identity('Long'), password: long, confirmPassword: long } })).status, 400);
});

test('login uses an HttpOnly SameSite cookie, excludes the raw token, persists across clients', async () => {
  const client = new Client(fixture.base);
  const response = await client.request('/auth/login', { method: 'POST', body: detailsA });
  assert.equal(response.status, 200);
  assert.equal(response.data.token, undefined);
  assert.match(response.headers.getSetCookie().join(';'), /HttpOnly/);
  assert.match(response.headers.getSetCookie().join(';'), /SameSite=Lax/);
  const token = client.cookies.get('artikly-session');
  assert.match(token, /^[a-f0-9]{64}$/);
  const { rows } = await fixture.pool.query('SELECT * FROM user_sessions');
  assert.ok(rows.some((row) => row.token_hash === tokenHash(token)));
  assert.ok(rows.every((row) => row.token_hash !== token));
  const refreshed = new Client(fixture.base);
  refreshed.cookies = new Map(client.cookies);
  assert.equal((await refreshed.request('/auth/me')).data.user.id, userA.id);
  assert.equal(response.headers.get('cache-control'), 'no-store');
});

test('wrong passwords and unknown emails return the same generic error', async () => {
  const wrong = await guest.request('/auth/login', { method: 'POST', body: { email: detailsA.email, password: 'wrong1234' } });
  const unknown = await guest.request('/auth/login', { method: 'POST', body: identity('Unknown') });
  assert.equal(wrong.status, 401); assert.equal(unknown.status, 401);
  assert.equal(wrong.message, unknown.message);
  assert.equal((await guest.request('/auth/login', { method: 'POST', body: { email: detailsA.email, password: `${password}${'x'.repeat(72)}` } })).status, 400);
});

test('private APIs reject anonymous requests and legacy bearer tokens', async () => {
  for (const path of ['/auth/me', '/blogs/mine']) assert.equal((await guest.request(path)).status, 401);
  for (const [path, method] of [['/blogs', 'POST'], [`/blogs/${draftA.id}`, 'PUT'], [`/blogs/${draftA.id}`, 'DELETE'], ['/auth/profile', 'PATCH'], ['/auth/password', 'PUT']]) {
    assert.equal((await guest.request(path, { method, body: {} })).status, 401);
  }
  assert.equal((await guest.request('/auth/me', { headers: { Authorization: 'Bearer legacy-token' } })).status, 401);
});

test('CSRF checks cover anonymous login, registration, blog writes, profile, password and logout', async () => {
  for (const [path, method] of [['/auth/login', 'POST'], ['/auth/register', 'POST'], ['/auth/logout', 'POST'], ['/blogs', 'POST'], ['/auth/profile', 'PATCH'], ['/auth/password', 'PUT']]) {
    assert.equal((await a.request(path, { method, body: {}, csrf: false })).status, 403);
  }
  assert.equal((await a.request('/auth/logout', { method: 'POST', headers: { Origin: 'https://attacker.example' } })).status, 403);
  assert.equal((await a.request('/auth/logout', { method: 'POST', headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await a.request('/auth/me')).status, 200);
});

test('CSRF rejects forged signatures and tokens belonging to another session', async () => {
  const bootstrap = await a.request('/auth/csrf');
  const token = bootstrap.data.csrfToken;
  const forged = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
  a.cookies.set('artikly-csrf', forged);
  assert.equal((await a.request('/auth/logout', { method: 'POST', csrf: false, headers: { 'X-CSRF-Token': forged } })).status, 403);
  b.cookies.set('artikly-csrf', token);
  assert.equal((await b.request('/auth/logout', { method: 'POST', csrf: false, headers: { 'X-CSRF-Token': token } })).status, 403);
});

test('dashboard queries filter by the verified user and ignore frontend IDs', async () => {
  const response = await a.request(`/blogs/mine?authorId=${userB.id}&userId=${userB.id}`);
  assert.equal(response.status, 200);
  assert.equal(response.data.blogs.length, 1);
  assert.ok(response.data.blogs.every((blog) => blog.authorId === userA.id));
  assert.equal(draftA.authorId, userA.id);
  assert.ok(!(await guest.request('/blogs')).data.blogs.some((blog) => blog.status === 'draft'));
});

test('drafts are private to their author while published blogs remain public', async () => {
  assert.equal((await a.request(`/blogs/${draftA.id}`)).status, 200);
  assert.equal((await a.request(`/blogs/${draftB.id}`)).status, 404);
  assert.equal((await guest.request(`/blogs/${draftB.id}`)).status, 404);
  assert.equal((await guest.request(`/blogs/${publicB.id}`)).status, 200);
  assert.equal((await a.request('/blogs/9223372036854775808')).status, 404);
});

test('manually crafted requests cannot edit or delete another user’s draft or published blog', async () => {
  for (const blog of [draftB, publicB]) {
    assert.equal((await a.request(`/blogs/${blog.id}`, { method: 'PUT', body: { title: 'Stolen article', authorId: userA.id } })).status, 403);
    assert.equal((await a.request(`/blogs/${blog.id}`, { method: 'DELETE', body: { userId: userB.id } })).status, 403);
    assert.equal((await b.request(`/blogs/${blog.id}`)).data.blog.title, blog.title);
  }
});

test('authors can create, edit, publish, unpublish and delete their own blogs', async () => {
  const created = await a.request('/blogs', { method: 'POST', body: { title: 'Working draft story', userId: userB.id, featured: true } });
  assert.equal(created.status, 201); assert.equal(created.data.blog.featured, false);
  const id = created.data.blog.id;
  assert.equal((await a.request(`/blogs/${id}`, { method: 'PUT', body: { title: 'Edited own story', status: 'published' } })).status, 400);
  const published = await a.request(`/blogs/${id}`, { method: 'PUT', body: { title: 'Edited own story', status: 'published',
    excerpt: 'A complete public story for readers.', category: 'Design', content: 'word '.repeat(55), authorId: userB.id } });
  assert.equal(published.status, 200); assert.ok(published.data.blog.publishedAt);
  const draft = await a.request(`/blogs/${id}`, { method: 'PUT', body: { title: 'Unpublished own story' } });
  assert.equal(draft.status, 200); assert.equal(draft.data.blog.publishedAt, null);
  assert.equal((await a.request(`/blogs/${id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await a.request(`/blogs/${id}`)).status, 404);
});

test('invalid, unknown and expired sessions are rejected and cleared', async () => {
  const client = new Client(fixture.base);
  client.cookies.set('artikly-session', 'malformed');
  assert.equal((await client.request('/auth/me')).status, 401);
  client.cookies.set('artikly-session', randomBytes(32).toString('hex'));
  assert.equal((await client.request('/blogs/mine')).status, 401);
  await client.request('/auth/login', { method: 'POST', body: detailsA });
  const hash = tokenHash(client.cookies.get('artikly-session'));
  await fixture.pool.query("UPDATE user_sessions SET expires_at = '2000-01-01' WHERE token_hash = $1", [hash]);
  assert.equal((await client.request('/auth/me')).status, 401);
  assert.equal(client.cookies.has('artikly-session'), false);
});

test('login rotates and revokes the previous cookie', async () => {
  const client = new Client(fixture.base);
  await client.request('/auth/login', { method: 'POST', body: detailsA });
  const old = new Client(fixture.base); old.cookies = new Map(client.cookies);
  await client.request('/auth/login', { method: 'POST', body: detailsA });
  assert.notEqual(client.cookies.get('artikly-session'), old.cookies.get('artikly-session'));
  assert.equal((await old.request('/auth/me')).status, 401);
  assert.equal((await client.request('/auth/me')).status, 200);
});

test('profile updates validate fields, require password for email, and ignore target user IDs', async () => {
  const updated = await a.request('/auth/profile', { method: 'PATCH', body: { fullName: 'Alice Updated', email: detailsA.email, userId: userB.id, password_hash: 'malicious' } });
  assert.equal(updated.status, 200); assert.equal(updated.data.user.id, userA.id);
  assert.equal(updated.data.user.name, 'Alice Updated'); assert.equal(updated.data.user.password_hash, undefined);
  assert.equal((await b.request('/auth/me')).data.user.name, detailsB.fullName);
  assert.equal((await a.request('/auth/profile', { method: 'PATCH', body: { fullName: '', email: 'bad' } })).status, 400);
  assert.equal((await a.request('/auth/profile', { method: 'PATCH', body: { fullName: 'Alice', email: detailsB.email, currentPassword: 'wrong' } })).status, 400);
  assert.equal((await a.request('/auth/profile', { method: 'PATCH', body: { fullName: 'Alice', email: detailsB.email, currentPassword: password } })).status, 409);
  const nextEmail = identity('AliceUpdated').email;
  assert.equal((await a.request('/auth/profile', { method: 'PATCH', body: { fullName: 'Alice Updated', email: nextEmail, currentPassword: password } })).status, 200);
  detailsA.email = nextEmail;
});

test('logout revokes the server session, rejects replay and remains idempotent', async () => {
  const client = new Client(fixture.base);
  await client.request('/auth/login', { method: 'POST', body: detailsA });
  const replay = new Client(fixture.base); replay.cookies = new Map(client.cookies);
  assert.equal((await client.request('/auth/logout', { method: 'POST' })).status, 200);
  assert.equal(client.cookies.has('artikly-session'), false);
  assert.equal((await replay.request('/blogs/mine')).status, 401);
  assert.equal((await client.request('/auth/logout', { method: 'POST' })).status, 200);
});

test('password changes require the current password and revoke all devices without touching other accounts', async () => {
  const otherDevice = new Client(fixture.base);
  await otherDevice.request('/auth/login', { method: 'POST', body: detailsA });
  const next = `Changed1-${randomBytes(12).toString('hex')}`;
  assert.equal((await a.request('/auth/password', { method: 'PUT', body: { currentPassword: 'wrong', password: next, confirmPassword: next } })).status, 400);
  assert.equal((await a.request('/auth/password', { method: 'PUT', body: { currentPassword: password, password: 'weak', confirmPassword: 'weak' } })).status, 400);
  assert.equal((await a.request('/auth/password', { method: 'PUT', body: { currentPassword: password, password: next, confirmPassword: 'mismatch' } })).status, 400);
  assert.equal((await a.request('/auth/password', { method: 'PUT', body: { currentPassword: password, password: next, confirmPassword: next, userId: userB.id } })).status, 200);
  assert.equal((await a.request('/auth/me')).status, 401);
  assert.equal((await otherDevice.request('/auth/me')).status, 401);
  assert.equal((await b.request('/auth/me')).status, 200);
  assert.equal((await a.request('/auth/login', { method: 'POST', body: detailsA })).status, 401);
  assert.equal((await a.request('/auth/login', { method: 'POST', body: { email: detailsA.email, password: next } })).status, 200);
});

test('failed logins are rate limited with Retry-After', async () => {
  let response;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    response = await guest.request('/auth/login', { method: 'POST', body: { email: detailsB.email, password: 'wrong1234' } });
    if (response.status === 429) break;
  }
  assert.equal(response.status, 429);
  assert.ok(Number(response.headers.get('retry-after')) > 0);
});
