import { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import BlogCard from '../components/BlogCard';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { CATEGORIES } from '../data/categories';
import { useAuth } from '../hooks/useAuth';
import { getPublishedBlogs } from '../services/blogService';
import { ALL_CATEGORIES, filterBlogs } from '../utils/search';
import './Home.css';

function scrollToLatest() {
  document.getElementById('latest')?.scrollIntoView();
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { hash } = useLocation();
  const [blogs, setBlogs] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [reloadCount, setReloadCount] = useState(0);

  // Search and filter live in the URL (?q=react&category=Design), so results
  // can be bookmarked or shared and the Back button works as expected.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  const activeCategory = searchParams.get('category') ?? ALL_CATEGORIES;

  useEffect(() => {
    // `ignore` prevents updating state if the component unmounts first.
    let ignore = false;
    getPublishedBlogs()
      .then((data) => {
        if (ignore) return;
        setBlogs(data);
        setStatus('ready');
      })
      .catch(() => {
        if (!ignore) setStatus('error');
      });
    return () => {
      ignore = true;
    };
  }, [reloadCount]);

  // Links such as "/#latest" should land on the article list once it has
  // loaded (the featured section above it changes the page height).
  useEffect(() => {
    if (status === 'ready' && hash === '#latest') scrollToLatest();
  }, [status, hash]);

  function updateFilters(changes) {
    const params = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (!value || value === ALL_CATEGORIES) params.delete(key);
      else params.set(key, value);
    });
    setSearchParams(params, { replace: true });
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    scrollToLatest();
  }

  function handleTopicClick(category) {
    updateFilters({ category });
    scrollToLatest();
  }

  function handleRetry() {
    setStatus('loading');
    setReloadCount((count) => count + 1);
  }

  const isFiltering = query.trim() !== '' || activeCategory !== ALL_CATEGORIES;
  const featuredBlogs = blogs.filter((blog) => blog.featured).slice(0, 3);
  const featuredIds = new Set(featuredBlogs.map((blog) => blog.id));
  const visibleBlogs = isFiltering
    ? filterBlogs(blogs, { query, category: activeCategory })
    : blogs.filter((blog) => !featuredIds.has(blog.id));
  const [leadBlog, ...sideBlogs] = featuredBlogs;

  const authorCount = new Set(blogs.map((blog) => blog.authorId)).size;
  const countByCategory = (category) => blogs.filter((blog) => blog.category === category).length;

  return (
    <>
      <title>Artikly — Every idea deserves a story</title>

      {/* Hero ------------------------------------------------------ */}
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__content">
            <p className="hero__eyebrow">Every idea deserves a story</p>
            <h1 className="hero__title">
              Give Your Ideas a <em>Voice</em>.
            </h1>
            <p className="hero__lead">
              Share your thoughts, tell your stories, and discover something worth reading.
            </p>

            <form className="hero-search" role="search" onSubmit={handleSearchSubmit}>
              <label htmlFor="article-search" className="visually-hidden">
                Search articles
              </label>
              <Icon name="search" size={20} className="hero-search__icon" />
              <input
                id="article-search"
                type="search"
                className="hero-search__input"
                placeholder="Search stories, topics or writers…"
                value={query}
                onChange={(event) => updateFilters({ q: event.target.value })}
                autoComplete="off"
              />
              <Button type="submit" variant="primary" className="hero-search__button">
                Search
              </Button>
            </form>

            {status === 'ready' && (
              <dl className="hero__stats">
                <div>
                  <dt>Articles</dt>
                  <dd>{blogs.length}</dd>
                </div>
                <div>
                  <dt>Writers</dt>
                  <dd>{authorCount}</dd>
                </div>
                <div>
                  <dt>Topics</dt>
                  <dd>{CATEGORIES.length}</dd>
                </div>
              </dl>
            )}
          </div>

          <aside className="hero-topics" aria-labelledby="hero-topics-title">
            <h2 id="hero-topics-title" className="hero-topics__title">
              Article categories
            </h2>
            <ul className="hero-topics__list">
              {CATEGORIES.map((category) => (
                <li key={category}>
                  <button
                    type="button"
                    className="hero-topics__item"
                    onClick={() => handleTopicClick(category)}
                  >
                    <span>{category}</span>
                    <span className="hero-topics__count">
                      {status === 'ready' ? countByCategory(category) : '–'}
                      <Icon name="arrowRight" size={16} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {status === 'loading' && <LoadingState label="Loading articles…" />}

      {status === 'error' && (
        <div className="container">
          <ErrorState
            title="We couldn't load the articles"
            actions={<Button onClick={handleRetry}>Try again</Button>}
          />
        </div>
      )}

      {status === 'ready' && (
        <>
          {/* Featured ------------------------------------------------ */}
          {!isFiltering && leadBlog && (
            <section className="section featured" aria-labelledby="featured-title">
              <div className="container">
                <div className="section__header">
                  <div>
                    <p className="eyebrow">Editor’s picks</p>
                    <h2 id="featured-title" className="section__title">
                      Featured Stories
                    </h2>
                  </div>
                </div>
                <div className="featured__grid">
                  <div className="featured__lead">
                    <BlogCard blog={leadBlog} variant="lead" />
                  </div>
                  <div className="featured__side">
                    {sideBlogs.map((blog) => (
                      <BlogCard key={blog.id} blog={blog} variant="compact" />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Latest / search results --------------------------------- */}
          <section
            id="latest"
            className={`section latest ${isFiltering ? 'latest--filtering' : ''}`}
            aria-labelledby="latest-title"
          >
            <div className="container">
              <div className="section__header">
                <div>
                  <p className="eyebrow">{isFiltering ? 'Search results' : 'Fresh off the press'}</p>
                  <h2 id="latest-title" className="section__title">
                    {isFiltering ? 'Matching articles' : 'Latest Stories'}
                  </h2>
                  <p className="section__subtitle" aria-live="polite">
                    {isFiltering
                      ? `${visibleBlogs.length} ${visibleBlogs.length === 1 ? 'article' : 'articles'}${
                          query.trim() ? ` for “${query.trim()}”` : ''
                        }${activeCategory !== ALL_CATEGORIES ? ` in ${activeCategory}` : ''}`
                      : 'New writing from the Artikly community, newest first.'}
                  </p>
                </div>
                {isFiltering && (
                  <Button variant="secondary" size="sm" onClick={() => updateFilters({ q: '', category: '' })}>
                    <Icon name="close" size={16} />
                    Clear filters
                  </Button>
                )}
              </div>

              <ul className="chip-list latest__filters" aria-label="Filter by category">
                {[ALL_CATEGORIES, ...CATEGORIES].map((category) => (
                  <li key={category}>
                    <button
                      type="button"
                      className="chip"
                      aria-pressed={activeCategory === category}
                      onClick={() => updateFilters({ category })}
                    >
                      {category}
                    </button>
                  </li>
                ))}
              </ul>

              {visibleBlogs.length > 0 ? (
                <div className="card-grid">
                  {visibleBlogs.map((blog) => (
                    <BlogCard key={blog.id} blog={blog} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon="search"
                  title="No articles found"
                  actions={
                    <Button variant="dark" onClick={() => updateFilters({ q: '', category: '' })}>
                      Show all articles
                    </Button>
                  }
                >
                  Try a different keyword or pick another topic.
                </EmptyState>
              )}
            </div>
          </section>
        </>
      )}

      {/* Call to action -------------------------------------------- */}
      <section className="cta">
        <div className="container">
          <div className="cta__inner">
            <div>
              <h2 className="cta__title">Your story starts with a single sentence.</h2>
              <p className="cta__text">
                Draft privately, publish when you’re ready, and share your perspective with readers.
              </p>
            </div>
            <Button to={isAuthenticated ? '/create-blog' : '/register'} variant="primary" size="lg">
              {isAuthenticated ? 'Write an Article' : 'Start writing for free'}
              <Icon name="arrowRight" size={18} />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
