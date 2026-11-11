import { Route, Routes } from 'react-router-dom';
import GuestRoute from './components/GuestRoute';
import ProtectedRoute from './components/ProtectedRoute';
import ScrollManager from './components/ScrollManager';
import DashboardLayout from './layouts/DashboardLayout';
import MainLayout from './layouts/MainLayout';
import BlogDetail from './pages/BlogDetail';
import CreateBlog from './pages/CreateBlog';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import Register from './pages/Register';
import './App.css';

// App.jsx only describes the routes. Each page lives in src/pages and each
// shared piece of UI in src/components.
//
//   Public       /                  Home
//                /blog/:id          Article page
//   Guests only  /login, /register  (logged-in users go to the dashboard)
//   Logged in    /dashboard, /create-blog, /edit-blog/:id
//   Fallback     *                  404 page
export default function App() {
  return (
    <>
      <ScrollManager />
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="blog/:id" element={<BlogDetail />} />

          <Route element={<GuestRoute />}>
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="create-blog" element={<CreateBlog />} />
            <Route path="edit-blog/:id" element={<CreateBlog />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
