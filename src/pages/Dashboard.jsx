import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import ConfirmDialog from '../components/ConfirmDialog';
import CoverImage from '../components/CoverImage';
import Icon from '../components/Icon';
import { EmptyState, ErrorState, LoadingState } from '../components/PageState';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { deleteBlog, getBlogsByAuthor } from '../services/blogService';
import { formatDate, getFirstName } from '../utils/format';
import './Dashboard.css';

const FILTERS = [
  { value: 'all', label: 'All articles' },
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Drafts' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [posts, setPosts] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [reloadCount, setReloadCount] = useState(0);
  const [filter, setFilter] = useState('all');
  const [postToDelete, setPostToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let ignore = false;
    getBlogsByAuthor(user.id)
      .then((data) => {
        if (ignore) return;
        setPosts(data);
        setStatus('ready');
      })
      .catch(() => {
        if (!ignore) setStatus('error');
      });
    return () => {
      ignore = true;
    };
  }, [user.id, reloadCount]);

  const publishedCount = posts.filter((post) => post.status === 'published').length;
  const draftCount = posts.length - publishedCount;
  const visiblePosts = filter === 'all' ? posts : posts.filter((post) => post.status === filter);
  const countFor = (value) =>
    value === 'all' ? posts.length : value === 'published' ? publishedCount : draftCount;

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await deleteBlog(postToDelete.id, user.id);
      setPosts((current) => current.filter((post) => post.id !== postToDelete.id));
      showToast('Article deleted.');
      setPostToDelete(null);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  function handleRetry() {
    setStatus('loading');
    setReloadCount((count) => count + 1);
  }

  const stats = [
    { label: 'Total articles', value: posts.length, icon: 'file', tone: 'navy' },
    { label: 'Published', value: publishedCount, icon: 'send', tone: 'lime' },
    { label: 'Drafts', value: draftCount, icon: 'draft', tone: 'sand' },
  ];

  return (
    <div className="dashboard">
      <title>Creator Dashboard · Artikly</title>

      <header className="dashboard__header">
        <div>
          <p className="dashboard__eyebrow">Creator Dashboard</p>
          <h1 className="dashboard__title">Welcome back, {getFirstName(user.name)}</h1>
          <p className="dashboard__subtitle">Here’s an overview of every story you’ve written.</p>
        </div>
        <Button to="/create-blog" variant="primary" size="lg">
          <Icon name="plus" size={18} />
          Write an Article
        </Button>
      </header>

      <section aria-label="Article statistics" className="stats">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <span className={`stat-card__icon stat-card__icon--${stat.tone}`}>
              <Icon name={stat.icon} size={20} />
            </span>
            <div>
              <p className="stat-card__label">{stat.label}</p>
              <p className="stat-card__value">{status === 'ready' ? stat.value : '–'}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="posts-panel" aria-labelledby="posts-title">
        <div className="posts-panel__header">
          <h2 id="posts-title" className="posts-panel__title">
            My Articles
          </h2>
          <div className="segmented" role="group" aria-label="Filter articles by status">
            {FILTERS.map((option) => (
              <button
                key={option.value}
                type="button"
                className="segmented__option"
                aria-pressed={filter === option.value}
                onClick={() => setFilter(option.value)}
              >
                {option.label}
                <span className="segmented__count">{status === 'ready' ? countFor(option.value) : ''}</span>
              </button>
            ))}
          </div>
        </div>

        {status === 'loading' && <LoadingState label="Loading your articles…" />}

        {status === 'error' && (
          <ErrorState
            title="We couldn't load your articles"
            actions={<Button onClick={handleRetry}>Try again</Button>}
          />
        )}

        {status === 'ready' && visiblePosts.length === 0 && (
          <EmptyState
            icon={filter === 'draft' ? 'draft' : 'file'}
            title={
              posts.length === 0
                ? 'You haven’t written anything yet'
                : filter === 'draft'
                  ? 'No drafts right now'
                  : 'Nothing published yet'
            }
            actions={
              <Button to="/create-blog" variant="dark">
                <Icon name="plus" size={18} />
                Write your first article
              </Button>
            }
          >
            {posts.length === 0
              ? 'Your articles will appear here. Start with a draft — you can publish whenever you’re ready.'
              : 'Articles matching this filter will show up here.'}
          </EmptyState>
        )}

        {status === 'ready' && visiblePosts.length > 0 && (
          <ul className="post-list">
            {visiblePosts.map((post) => {
              const isPublished = post.status === 'published';
              return (
                <li key={post.id} className="post-row">
                  <div className="post-row__thumb">
                    <CoverImage src={post.coverImage} label={post.category?.[0] ?? 'C'} />
                  </div>

                  <div className="post-row__info">
                    <Link to={`/blog/${post.id}`} className="post-row__title">
                      {post.title}
                    </Link>
                    <p className="post-row__meta">
                      <span>{post.category || 'Uncategorized'}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {isPublished
                          ? `Published ${formatDate(post.publishedAt)}`
                          : `Edited ${formatDate(post.updatedAt)}`}
                      </span>
                    </p>
                  </div>

                  <span className={`badge badge--${isPublished ? 'published' : 'draft'} post-row__status`}>
                    {isPublished ? 'Published' : 'Draft'}
                  </span>

                  <div className="post-row__actions">
                    <Button
                      to={`/blog/${post.id}`}
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label={`${isPublished ? 'View' : 'Preview'} “${post.title}”`}
                      title={isPublished ? 'View' : 'Preview'}
                    >
                      <Icon name="eye" size={18} />
                    </Button>
                    <Button
                      to={`/edit-blog/${post.id}`}
                      variant="secondary"
                      size="sm"
                      aria-label={`Edit “${post.title}”`}
                    >
                      <Icon name="edit" size={16} />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      className="post-row__delete"
                      onClick={() => setPostToDelete(post)}
                      aria-label={`Delete “${post.title}”`}
                      title="Delete"
                    >
                      <Icon name="trash" size={18} />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(postToDelete)}
        title="Delete this article?"
        message={
          <>
            <strong>“{postToDelete?.title}”</strong> will be removed for good. This can’t be undone.
          </>
        }
        confirmLabel="Delete article"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setPostToDelete(null)}
      />
    </div>
  );
}
