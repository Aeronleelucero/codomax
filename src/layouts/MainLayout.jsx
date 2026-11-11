import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Public pages: navbar on top, page content in the middle, footer at the bottom.
export default function MainLayout() {
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" className="main-layout">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
