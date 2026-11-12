import { useState } from 'react';
import { flushSync } from 'react-dom';
import Alert from './Alert';
import ArticleContent from './ArticleContent';
import Button from './Button';
import ConfirmDialog from './ConfirmDialog';
import CoverImage from './CoverImage';
import FormField from './FormField';
import Icon from './Icon';
import { CATEGORIES, PRESET_COVERS } from '../data/categories';
import { useFormState } from '../hooks/useFormState';
import { formatDate, getReadingTime } from '../utils/format';
import {
  BLOG_LIMITS,
  countWords,
  focusFirstError,
  hasErrors,
  validateBlog,
} from '../utils/validation';
import './BlogForm.css';

const FIELDS = ['title', 'excerpt', 'content', 'category', 'coverImage'];

function toFormValues(blog) {
  return {
    title: blog?.title ?? '',
    excerpt: blog?.excerpt ?? '',
    content: blog?.content ?? '',
    category: blog?.category ?? '',
    coverImage: blog?.coverImage ?? '',
  };
}

// The editor used by both "Create Blog" and "Edit Blog".
// It owns the form state and validation; the page decides what saving means
// (create vs. update) through the onSave prop, which must return a Promise.
export default function BlogForm({ initialBlog, onSave, onCancel }) {
  const [initialValues] = useState(() => toFormValues(initialBlog));
  const { values, touched, handleChange, handleBlur, setFieldValue } = useFormState(initialValues);

  // Which button the user last pressed: decides draft vs. publish rules.
  const [attemptedStatus, setAttemptedStatus] = useState(null);
  const [savingStatus, setSavingStatus] = useState(null);
  const [formError, setFormError] = useState('');
  const [editorTab, setEditorTab] = useState('write');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isPublished = initialBlog?.status === 'published';
  const isSaving = savingStatus !== null;
  const isDirty = FIELDS.some((field) => values[field] !== initialValues[field]);

  const errors = validateBlog(values, { publish: attemptedStatus === 'published' });
  const visibleError = (field) => (attemptedStatus || touched[field] ? errors[field] : undefined);

  const wordCount = countWords(values.content);

  async function handleSave(status) {
    setAttemptedStatus(status);
    setFormError('');

    const validationErrors = validateBlog(values, { publish: status === 'published' });
    if (hasErrors(validationErrors)) {
      setFormError(
        status === 'published'
          ? 'Please complete the highlighted fields before publishing.'
          : 'Please fix the highlighted fields before saving your draft.',
      );
      // The content textarea is hidden while previewing; switch back first so
      // it can receive focus. flushSync applies the tab change immediately.
      if (validationErrors.content && editorTab === 'preview') {
        flushSync(() => setEditorTab('write'));
      }
      focusFirstError(validationErrors, 'blog');
      return;
    }

    setSavingStatus(status);
    try {
      await onSave({ ...values, status });
      // On success the page navigates away, so there is nothing to reset here.
    } catch (error) {
      setFormError(error.message || 'Something went wrong while saving. Please try again.');
      setSavingStatus(null);
    }
  }

  function handleCancel() {
    if (isDirty) setConfirmDiscard(true);
    else onCancel();
  }

  const statusBadge = !initialBlog
    ? { className: 'badge--new', label: 'New article' }
    : isPublished
      ? { className: 'badge--published', label: 'Published' }
      : { className: 'badge--draft', label: 'Draft' };

  return (
    <form className="blog-form" onSubmit={(event) => event.preventDefault()} noValidate>
      <div className="blog-form__main">
        {formError && <Alert variant="error">{formError}</Alert>}

        <div className="panel">
          <FormField
            id="blog-title"
            name="title"
            label="Title"
            className="field--title"
            placeholder="A clear, specific title"
            value={values.title}
            onChange={handleChange}
            onBlur={handleBlur}
            error={visibleError('title')}
            counter={`${values.title.trim().length}/${BLOG_LIMITS.titleMax}`}
            maxLength={BLOG_LIMITS.titleMax + 20}
            required
          />

          <FormField
            id="blog-excerpt"
            as="textarea"
            name="excerpt"
            label="Short description"
            rows={3}
            placeholder="One or two sentences that make readers want to click."
            hint="Shown on blog cards and at the top of your article."
            value={values.excerpt}
            onChange={handleChange}
            onBlur={handleBlur}
            error={visibleError('excerpt')}
            counter={`${values.excerpt.trim().length}/${BLOG_LIMITS.excerptMax}`}
          />
        </div>

        <div className="panel editor">
          <div className="editor__toolbar">
            {/* Visual label only; the textarea has its own (visually hidden) label. */}
            <span className="field__label" aria-hidden="true">
              Content
            </span>
            <div className="editor__tabs" role="group" aria-label="Editor mode">
              <button
                type="button"
                aria-pressed={editorTab === 'write'}
                onClick={() => setEditorTab('write')}
              >
                <Icon name="edit" size={16} />
                Write
              </button>
              <button
                type="button"
                aria-pressed={editorTab === 'preview'}
                onClick={() => setEditorTab('preview')}
              >
                <Icon name="eye" size={16} />
                Preview
              </button>
            </div>
          </div>

          {/* The textarea stays mounted while previewing so nothing is lost. */}
          <div hidden={editorTab !== 'write'}>
            <FormField
              id="blog-content"
              as="textarea"
              name="content"
              label="Content"
              className="field--editor"
              rows={16}
              placeholder={'Start writing your story…\n\nTip: leave a blank line between paragraphs.'}
              hint="Formatting: blank line = new paragraph · “## ” = heading · “- ” = bullet point."
              value={values.content}
              onChange={handleChange}
              onBlur={handleBlur}
              error={visibleError('content')}
            />
          </div>

          {editorTab === 'preview' && (
            <div className="editor__preview" aria-label="Article preview">
              {values.title.trim() && <h2 className="editor__preview-title">{values.title}</h2>}
              <ArticleContent content={values.content} />
            </div>
          )}

          <p className="editor__stats">
            {wordCount} {wordCount === 1 ? 'word' : 'words'} · about {getReadingTime(values.content)} min
            read
          </p>
        </div>
      </div>

      <aside className="blog-form__side">
        <div className="panel">
          <h2 className="panel__title">Details</h2>
          <FormField
            id="blog-category"
            as="select"
            name="category"
            label="Category"
            value={values.category}
            onChange={handleChange}
            onBlur={handleBlur}
            error={visibleError('category')}
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </FormField>
        </div>

        <div className="panel">
          <h2 className="panel__title">Cover image</h2>
          <div className="cover-picker__preview">
            <CoverImage src={values.coverImage.trim()} label={values.category || 'No cover yet'} />
          </div>

          <FormField
            id="blog-coverImage"
            name="coverImage"
            type="url"
            label="Image URL"
            placeholder="https://…"
            value={values.coverImage}
            onChange={handleChange}
            onBlur={handleBlur}
            error={visibleError('coverImage')}
            inputMode="url"
          />

          <fieldset className="cover-picker">
            <legend className="field__label">Or choose a cover</legend>
            <div className="cover-picker__grid">
              {PRESET_COVERS.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  className="cover-picker__option"
                  aria-pressed={values.coverImage === url}
                  aria-label={`Use preset cover ${index + 1}`}
                  onClick={() => setFieldValue('coverImage', url)}
                >
                  <CoverImage src={url.replace('/1200/750', '/240/150')} label={String(index + 1)} />
                </button>
              ))}
            </div>
          </fieldset>

          {values.coverImage && (
            <Button variant="ghost" size="sm" onClick={() => setFieldValue('coverImage', '')}>
              <Icon name="close" size={16} />
              Remove cover
            </Button>
          )}
        </div>

        <div className="panel publish-panel">
          <div className="publish-panel__status">
            <h2 className="panel__title">Publishing</h2>
            <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
          </div>
          {initialBlog && (
            <p className="publish-panel__meta">
              Last saved {formatDate(initialBlog.updatedAt)}
              {isDirty && ' · unsaved changes'}
            </p>
          )}
          <p className="publish-panel__help">
            Drafts only need a title. Publishing requires a description, category and at least{' '}
            {BLOG_LIMITS.contentMinWords} words.
          </p>

          <div className="publish-panel__actions">
            <Button
              variant="primary"
              fullWidth
              onClick={() => handleSave('published')}
              loading={savingStatus === 'published'}
              disabled={isSaving}
            >
              <Icon name="send" size={16} />
              {isPublished ? 'Update Article' : 'Publish Article'}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={() => handleSave('draft')}
              loading={savingStatus === 'draft'}
              disabled={isSaving}
            >
              <Icon name="draft" size={16} />
              {isPublished ? 'Unpublish & save as draft' : 'Save as draft'}
            </Button>
            <Button variant="ghost" fullWidth onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmDiscard}
        variant="warning"
        title="Discard your changes?"
        message="You have unsaved changes. If you leave now, they will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={onCancel}
        onCancel={() => setConfirmDiscard(false)}
      />
    </form>
  );
}
