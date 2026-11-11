import { useLocation } from 'react-router-dom';
import Button from '../components/Button';
import Icon from '../components/Icon';

// Fallback for any URL that does not match a route.
export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <section className="not-found">
      <title>Page not found · Codomax</title>
      <div className="container">
        <p className="not-found__code" aria-hidden="true">
          4<span>0</span>4
        </p>
        <h1 className="not-found__title">This page wandered off</h1>
        <p className="not-found__text">
          We couldn’t find anything at <strong>{pathname}</strong>. Check the address, or head back
          to the articles.
        </p>
        <div className="not-found__actions">
          <Button to="/" variant="dark">
            <Icon name="home" size={18} />
            Back to home
          </Button>
          <Button to="/#latest" variant="secondary">
            Browse articles
          </Button>
        </div>
      </div>
    </section>
  );
}
