import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BlogForm from '../components/BlogForm';
import Button from '../components/Button';
import Icon from '../components/Icon';
import { EmptyState, LoadingState } from '../components/PageState';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { createBlog, getBlogById, updateBlog } from '../services/blogService';
import './CreateBlog.css';

// Handles two routes:
//   /create-blog      -> empty editor for a new post
//   /edit-blog/:id    -> editor pre-filled with an existing post
export default function CreateBlog() {
  const { id } = useParams();
  const isEditing = Boolean(id);
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // For edit mode: which post was loaded and whether it can be edited.
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    getBlogById(id)
      .then((blog) => {
        if (ignore) return;
        const canEdit = blog && blog.authorId === user.id;
        setLoaded({ requestedId: id, blog: canEdit ? blog : null });
      })
      .catch(() => {
        if (!ignore) setLoaded({ requestedId: id, blog: null });
      });
    return () => {
      ignore = true;
    };
  }, [id, user.id]);

  async function handleSave(values) {
    const wasPublished = isEditing && loaded?.blog?.status === 'published';
    if (isEditing) {
      await updateBlog(id, values, user.id);
    } else {
      await createBlog(values, user);
    }

    let message;
    if (values.status === 'published') {
      message = isEditing && wasPublished ? 'Article updated.' : 'Your article is now published!';
    } else {
      message = wasPublished ? 'Article unpublished and saved as a draft.' : 'Draft saved.';
    }
    showToast(message);
    navigate('/dashboard');
  }

  const goToDashboard = () => navigate('/dashboard');

  if (isEditing && loaded?.requestedId !== id) {
    return <LoadingState label="Loading your article…" />;
  }

  if (isEditing && !loaded.blog) {
    return (
      <>
        <title>Article not found · Artikly</title>
        <EmptyState
          icon="file"
          title="We couldn’t open this article"
          actions={<Button to="/dashboard">Back to dashboard</Button>}
        >
          It may have been deleted, or it belongs to another writer.
        </EmptyState>
      </>
    );
  }

  return (
    <div className="create-blog">
      <title>{isEditing ? 'Edit Article · Artikly' : 'Write an Article · Artikly'}</title>

      <header className="create-blog__header">
        <Link to="/dashboard" className="create-blog__back">
          <Icon name="arrowLeft" size={18} />
          Back to dashboard
        </Link>
        <h1 className="create-blog__title">{isEditing ? 'Edit Article' : 'Write an Article'}</h1>
        <p className="create-blog__subtitle">
          {isEditing
            ? 'Update your article, then save it as a draft or publish your changes.'
            : 'Every idea deserves a story. Save a draft at any time and publish when it’s ready.'}
        </p>
      </header>

      {/* The key gives each article its own fresh form state. */}
      <BlogForm
        key={id ?? 'new'}
        initialBlog={isEditing ? loaded?.blog : undefined}
        onSave={handleSave}
        onCancel={goToDashboard}
      />
    </div>
  );
}
