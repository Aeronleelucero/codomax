import { Link } from 'react-router-dom';
import Avatar from './Avatar';
import CoverImage from './CoverImage';
import { formatDate, getReadingTime } from '../utils/format';
import './BlogCard.css';

// variant: "default" (grid card) | "lead" (large featured) | "compact" (side list)
export default function BlogCard({ blog, variant = 'default' }) {
  const { id, title, excerpt, category, coverImage, authorName, publishedAt, content } = blog;

  return (
    <article className={`blog-card blog-card--${variant}`}>
      <div className="blog-card__media">
        {/* The title link already describes the card, so the image is decorative. */}
        <CoverImage src={coverImage} label={category} />
      </div>

      <div className="blog-card__body">
        <span className="badge badge--category">{category}</span>

        <h3 className="blog-card__title">
          {/* This link stretches over the whole card (see BlogCard.css). */}
          <Link to={`/blog/${id}`} className="blog-card__link">
            {title}
          </Link>
        </h3>

        {variant !== 'compact' && <p className="blog-card__excerpt">{excerpt}</p>}

        <footer className="blog-card__meta">
          <Avatar name={authorName} size="sm" />
          <span className="blog-card__author">{authorName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={publishedAt}>{formatDate(publishedAt)}</time>
          {variant !== 'compact' && (
            <>
              <span aria-hidden="true" className="blog-card__extra">
                ·
              </span>
              <span className="blog-card__extra">{getReadingTime(content)} min read</span>
            </>
          )}
        </footer>
      </div>
    </article>
  );
}
