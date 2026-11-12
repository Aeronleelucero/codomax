
import mysqlPool from '../src/config/db.js';
import postgresPool from '../src/config/postgres.js';

const migrate = async () => {
  let client;

  try {
    console.log('Reading source MariaDB records...');

    // Read all source records without modifying MariaDB.
    const [users] = await mysqlPool.query(`
      SELECT id, full_name, email, password_hash, created_at, updated_at
      FROM users
      ORDER BY id
    `);

    const [blogs] = await mysqlPool.query(`
      SELECT
        id, author_id, title, excerpt, content, category,
        cover_image, status, is_featured, published_at,
        created_at, updated_at
      FROM blogs
      ORDER BY id
    `);

    console.log(`Source users: ${users.length}`);
    console.log(`Source blogs: ${blogs.length}`);

    // Confirm that every blog has an existing author.
    const userIds = new Set(users.map(user => String(user.id)));

    const orphanedBlogs = blogs.filter(
      blog => !userIds.has(String(blog.author_id))
    );

    if (orphanedBlogs.length > 0) {
      throw new Error(
        `${orphanedBlogs.length} blogs have missing authors.`
      );
    }

    client = await postgresPool.connect();

    await client.query('BEGIN');

    // Do not overwrite existing destination data.
    const destination = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM public.users) AS users,
        (SELECT COUNT(*) FROM public.blogs) AS blogs
    `);

    const destinationUsers = Number(destination.rows[0].users);
    const destinationBlogs = Number(destination.rows[0].blogs);

    if (destinationUsers !== 0 || destinationBlogs !== 0) {
      throw new Error(
        'Supabase tables are not empty. Migration stopped to prevent overwriting data.'
      );
    }

    // Migrate users, preserving IDs and password hashes.
    for (const user of users) {
      await client.query(
        `INSERT INTO public.users (
          id, full_name, email, password_hash, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          user.id,
          user.full_name,
          user.email,
          user.password_hash,
          user.created_at,
          user.updated_at,
        ]
      );
    }

    console.log('Users migrated successfully.');

    // Migrate blogs, preserving author relationships and timestamps.
    for (const blog of blogs) {
      await client.query(
        `INSERT INTO public.blogs (
          id, author_id, title, excerpt, content, category,
          cover_image, status, is_featured, published_at,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11, $12
        )`,
        [
          blog.id,
          blog.author_id,
          blog.title,
          blog.excerpt,
          blog.content,
          blog.category,
          blog.cover_image,
          blog.status,
          Boolean(blog.is_featured),
          blog.published_at,
          blog.created_at,
          blog.updated_at,
        ]
      );
    }

    console.log('Blogs migrated successfully.');

    // Reset identity sequences so future inserts use unused IDs.
    await client.query(`
      SELECT setval(
        pg_get_serial_sequence('public.users', 'id'),
        COALESCE((SELECT MAX(id) FROM public.users), 1),
        EXISTS(SELECT 1 FROM public.users)
      )
    `);

    await client.query(`
      SELECT setval(
        pg_get_serial_sequence('public.blogs', 'id'),
        COALESCE((SELECT MAX(id) FROM public.blogs), 1),
        EXISTS(SELECT 1 FROM public.blogs)
      )
    `);

    // Verify destination counts before committing.
    const verification = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM public.users) AS users,
        (SELECT COUNT(*) FROM public.blogs) AS blogs
    `);

    const migratedUsers = Number(verification.rows[0].users);
    const migratedBlogs = Number(verification.rows[0].blogs);

    if (
      migratedUsers !== users.length ||
      migratedBlogs !== blogs.length
    ) {
      throw new Error('Migration verification failed.');
    }

    await client.query('COMMIT');

    console.log('\nMigration completed successfully.');
    console.log(`Users migrated: ${migratedUsers}`);
    console.log(`Blogs migrated: ${migratedBlogs}`);

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }

    console.error('\nMigration failed:', error.message);
    process.exitCode = 1;

  } finally {
    client?.release();
    await Promise.all([
      mysqlPool.end(),
      postgresPool.end(),
    ]);
  }
};

await migrate();
