import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import api from './api';
import AuthPage from './pages/AuthPage';
import ProductListPage from './pages/ProductListPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import AddressPage from './pages/AddressPage';
import OrdersPage from './pages/OrdersPage';
import WishlistPage from './pages/WishlistPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentsPage from './pages/PaymentsPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminCategoriesPage from './pages/AdminCategoriesPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminCouponsPage from './pages/AdminCouponsPage';
import AdminInventoryPage from './pages/AdminInventoryPage';
import AdminBannersPage from './pages/AdminBannersPage';
import AdminReviewsPage from './pages/AdminReviewsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import OrderDetailPage from './pages/OrderDetailPage';
import NotFoundPage from './pages/NotFoundPage';
import './styles.css';

function App() {
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const setUserFromProfile = (profile) => {
    setUser({ username: profile.username, fullName: profile.fullName, role: profile.role });
  };

  const loadCurrentUser = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) return;

    try {
      const result = await api('/api/users/me');
      setUserFromProfile(result.data);
    } catch {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  };

  const handleAuthSuccess = (authResponse) => {
    localStorage.setItem('authToken', authResponse.token);
    if (authResponse.refreshToken) {
      localStorage.setItem('refreshToken', authResponse.refreshToken);
    }
    setUserFromProfile(authResponse);
    showMessage('Dang nhap thanh cong');
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken');

    if (refreshToken) {
      try {
        await api('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
        });
      } catch {
        // Local cleanup still logs the user out if the token was already invalid.
      }
    }

    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    showMessage('Da dang xuat');
  };

  const handleProfileUpdate = (updatedProfile) => {
    setUserFromProfile(updatedProfile);
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  return (
    <BrowserRouter>
      <NavBar user={user} onLogout={handleLogout} />
      {message && <div className="message page-notice">{message}</div>}
      <Routes>
        <Route path="/" element={<ProductListPage user={user} />} />
        <Route path="/login" element={<AuthPage user={user} onAuthSuccess={handleAuthSuccess} />} />
        <Route path="/products/:id" element={<ProductDetailPage user={user} />} />
        <Route path="/cart" element={<CartPage user={user} />} />
        <Route path="/addresses" element={<AddressPage user={user} />} />
        <Route path="/orders" element={<OrdersPage user={user} />} />
        <Route path="/orders/:id" element={<OrderDetailPage user={user} />} />
        <Route path="/wishlist" element={<WishlistPage user={user} />} />
        <Route path="/checkout" element={<CheckoutPage user={user} />} />
        <Route path="/payments" element={<PaymentsPage user={user} />} />
        <Route path="/notifications" element={<NotificationsPage user={user} />} />
        <Route path="/admin" element={<AdminDashboardPage user={user} />} />
        <Route path="/admin/products" element={<AdminProductsPage user={user} />} />
        <Route path="/admin/categories" element={<AdminCategoriesPage user={user} />} />
        <Route path="/admin/users" element={<AdminUsersPage user={user} />} />
        <Route path="/admin/coupons" element={<AdminCouponsPage user={user} />} />
        <Route path="/admin/inventory" element={<AdminInventoryPage user={user} />} />
        <Route path="/admin/banners" element={<AdminBannersPage user={user} />} />
        <Route path="/admin/reviews" element={<AdminReviewsPage user={user} />} />
        <Route path="/profile" element={<ProfilePage user={user} onProfileUpdate={handleProfileUpdate} />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
