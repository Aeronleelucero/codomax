// Deterministic repository double for offline API tests. It deliberately does
// not claim to validate PostgreSQL syntax; TEST_DATABASE_URL runs the same tests
// against a real, isolated PostgreSQL schema instead.
export function createMemoryPool() {
  let state = { users: [], blogs: [], sessions: [] };
  let snapshot;
  const buckets = new Map();
  const same = (a, b) => String(a) === String(b);
  const result = (rows = [], rowCount = rows.length) => ({ rows: structuredClone(rows), rowCount });
  async function query(sql, params = []) {
    if (typeof sql === 'object') sql = sql.text;
    const q = sql.replace(/\s+/g, ' ').trim();
    if (q.startsWith('INSERT INTO auth_rate_limits')) {
      const [key, max, windowMs] = params;
      let row = buckets.get(key);
      if (!row || row.reset_at <= new Date()) row = { attempts: 0, reset_at: new Date(Date.now() + windowMs) };
      row.attempts = Math.min(row.attempts + 1, max + 1); buckets.set(key, row);
      return result([{ ...row, retry_after: Math.max(1, Math.ceil((row.reset_at - Date.now()) / 1000)) }]);
    }
    if (q.startsWith('UPDATE auth_rate_limits')) {
      const row = buckets.get(params[0]);
      if (row && +row.reset_at === +new Date(params[1])) row.attempts = Math.max(0, row.attempts - 1);
      return result();
    }
    if (q === 'BEGIN') { snapshot = structuredClone(state); return result(); }
    if (q === 'COMMIT') { snapshot = undefined; return result(); }
    if (q === 'ROLLBACK') { if (snapshot) state = snapshot; snapshot = undefined; return result(); }
    if (q === 'SELECT 1') return result([{ '?column?': 1 }]);
    if (q.startsWith('INSERT INTO users')) {
      const [full_name, email, password_hash] = params;
      if (state.users.some((u) => u.email === email)) throw Object.assign(new Error('unique email'), { code: '23505' });
      const user = { id: String(state.users.length + 1), full_name, email, password_hash, created_at: new Date(), updated_at: new Date() };
      state.users.push(user); return result([{ id: user.id }]);
    }
    if (q.includes('FROM users') && !q.includes('JOIN')) {
      let rows = state.users;
      if (q.includes('WHERE email = $1')) rows = rows.filter((u) => u.email === params[0]);
      else if (q.includes('WHERE id = $1')) rows = rows.filter((u) => same(u.id, params[0]));
      return result(rows);
    }
    if (q.startsWith('UPDATE users SET full_name')) {
      if (state.users.some((u) => u.email === params[1] && !same(u.id, params[2]))) throw Object.assign(new Error('unique email'), { code: '23505' });
      const user = state.users.find((u) => same(u.id, params[2]));
      Object.assign(user, { full_name: params[0], email: params[1], updated_at: new Date() });
      return result([user]);
    }
    if (q.startsWith('UPDATE users SET password_hash')) {
      const user = state.users.find((u) => same(u.id, params[1]));
      user.password_hash = params[0]; return result([], 1);
    }
    if (q.startsWith('INSERT INTO user_sessions')) {
      state.sessions.push({ token_hash: params[0], user_id: String(params[1]), expires_at: params[2] });
      return result([], 1);
    }
    if (q.includes('FROM user_sessions s JOIN users')) {
      const session = state.sessions.find((s) => s.token_hash === params[0] && s.expires_at > new Date());
      return result(session ? state.users.filter((u) => same(u.id, session.user_id)) : []);
    }
    if (q.startsWith('SELECT') && q.includes('FROM user_sessions')) return result(state.sessions);
    if (q.startsWith('UPDATE user_sessions SET expires_at')) {
      state.sessions.forEach((s) => { if (s.token_hash === params[0]) s.expires_at = new Date(0); });
      return result([], 1);
    }
    if (q.startsWith('DELETE FROM user_sessions')) {
      const before = state.sessions.length;
      state.sessions = state.sessions.filter((s) => {
        if (q.includes('WHERE token_hash')) return s.token_hash !== params[0];
        if (q.includes('WHERE user_id')) return !same(s.user_id, params[0]);
        return s.expires_at > new Date();
      });
      return result([], before - state.sessions.length);
    }
    if (q.startsWith('INSERT INTO blogs')) {
      const [author_id, title, excerpt, content, category, cover_image, status, published_at] = params;
      const id = String(state.blogs.reduce((max, b) => Math.max(max, Number(b.id)), 0) + 1);
      state.blogs.push({ id, author_id: String(author_id), title, excerpt, content, category,
        cover_image, status, published_at, is_featured: false, created_at: new Date(), updated_at: new Date() });
      return result([{ id }]);
    }
    if (q.includes('FROM blogs b')) {
      let rows = state.blogs;
      if (q.includes('WHERE b.id = $1')) rows = rows.filter((b) => same(b.id, params[0]));
      if (q.includes('WHERE b.author_id = $1')) rows = rows.filter((b) => same(b.author_id, params[0]));
      if (q.includes("WHERE b.status = 'published'")) rows = rows.filter((b) => b.status === 'published');
      return result(rows.map((b) => ({ ...b, author_name: state.users.find((u) => same(u.id, b.author_id)).full_name })).reverse());
    }
    if (q.startsWith('UPDATE blogs')) {
      const blog = state.blogs.find((b) => same(b.id, params[6]) && same(b.author_id, params[7]));
      if (!blog) return result();
      Object.assign(blog, { title: params[0], excerpt: params[1], content: params[2], category: params[3], cover_image: params[4],
        status: params[5], published_at: params[8] ? blog.published_at || new Date() : null, updated_at: new Date() });
      return result([{ id: blog.id }]);
    }
    if (q.startsWith('DELETE FROM blogs')) {
      const blog = state.blogs.find((b) => same(b.id, params[0]) && same(b.author_id, params[1]));
      if (!blog) return result();
      state.blogs = state.blogs.filter((b) => b !== blog); return result([{ id: blog.id }]);
    }
    throw new Error(`Unimplemented test query: ${q}`);
  }
  return { query, connect: async () => ({ query, release() {} }), end: async () => {} };
}
