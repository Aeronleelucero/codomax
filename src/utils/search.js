export const ALL_CATEGORIES = 'All';

// Filters blogs by a free-text query and an optional category.
// The query matches the title, description, author and category.
export function filterBlogs(blogs, { query = '', category = ALL_CATEGORIES }) {
  const normalizedQuery = query.trim().toLowerCase();

  return blogs.filter((blog) => {
    const matchesCategory = category === ALL_CATEGORIES || blog.category === category;
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;

    const searchableText = [blog.title, blog.excerpt, blog.authorName, blog.category]
      .join(' ')
      .toLowerCase();
    return searchableText.includes(normalizedQuery);
  });
}
