import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Alert from '../components/Alert';
import ArticleContent from '../components/ArticleContent';
import Avatar from '../components/Avatar';
import BlogCard from '../components/BlogCard';
import Button from '../components/Button';
import CoverImage from '../components/CoverImage';
import Icon from '../components/Icon';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../hooks/useAuth';
import { getBlogById, getPublishedBlogs } from '../services/blogService';
import { formatDate, getReadingTime } from '../utils/format';
import './BlogDetail.css';

export default function BlogDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  // `result.requestedId` records which article the data belongs to. When the
  // URL changes to another article, the old data is ignored until the new one
  // arrives — so we never show the wrong post.
  const [result, setResult] = useState(null);

  useEffect(() => {
    let ignore = false;
    Promise.all([getBlogById(id), getPublishedBlogs()])
      .then(([blog, published]) => {
        if (ignore) return;
        const related = blog
          ? published.filter((b) => b.id !== blog.id && b.category === blog.category).slice(0, 3)
          : [];
        setResult({ requestedId: id, blog, related, error: null });
      })
      .catch((error) => {
        if (!ignore) setResult({ requestedId: id, blog: null, related: [], error: error.message });
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  if (!result || result.requestedId !== id) {
    return <LoadingState label="Loading article…" />;
  }

  if (result.error) {
    return (
      <div className="container">
        <ErrorState actions={<Button to="/">Back to articles</Button>}>{result.error}</ErrorState>
      </div>
    );
  }

  const { blog, related } = result;
  const isOwner = Boolean(user && blog && blog.authorId === user.id);

  // Drafts are private: only their author may preview them.
  if (!blog || (blog.status !== 'published' && !isOwner)) {
    return (
      <div className="container">
        <title>Article not found · Artikly</title>
        <EmptyState
          icon="file"
          title="Article not found"
          actions={<Button to="/">Browse all articles</Button>}
        >
          This article may have been removed or is not published yet.
        </EmptyState>
      </div>
    );
  }

  const isDraft = blog.status !== 'published';

  return (
    <>
      <title>{`${blog.title} · Artikly`}</title>

      <article className="article">
        <header className="article__header container">
          <Link to={isOwner ? '/dashboard' : '/'} className="article__back">
            <Icon name="arrowLeft" size={18} />
            {isOwner ? 'Back to dashboard' : 'All articles'}
          </Link>

          {isDraft && (
            <Alert variant="warning" title="Draft preview">
              Only you can see this article. Publish it from the editor to make it public.
            </Alert>
          )}

          <span className="badge badge--category">{blog.category || 'Uncategorized'}</span>
          <h1 className="article__title">{blog.title}</h1>
          {blog.excerpt && <p className="article__excerpt">{blog.excerpt}</p>}

          <div className="article__meta">
            <Avatar name={blog.authorName} size="lg" />
            <div>
              <p className="article__author">{blog.authorName}</p>
              <p className="article__info">
                {isDraft ? (
                  <>Last edited {formatDate(blog.updatedAt)}</>
                ) : (
                  <time dateTime={blog.publishedAt}>{formatDate(blog.publishedAt)}</time>
                )}
                <span aria-hidden="true"> · </span>
                {getReadingTime(blog.content)} min read
              </p>
            </div>
            {isOwner && (
              <Button to={`/edit-blog/${blog.id}`} variant="secondary" size="sm" className="article__edit">
                <Icon name="edit" size={16} />
                Edit article
              </Button>
            )}
          </div>
        </header>

        <div className="container">
          <div className="article__cover">
            <CoverImage src={blog.coverImage} alt="" label={blog.category || 'Artikly'} />
          </div>
        </div>

        <div className="article__body container">
          <ArticleContent content={blog.content} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="section article__related" aria-labelledby="related-title">
          <div className="container">
            <div className="section__header">
              <h2 id="related-title" className="section__title">
                More in {blog.category}
              </h2>
            </div>
            <div className="card-grid">
              {related.map((item) => (
                <BlogCard key={item.id} blog={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
