import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import NavBar from './components/NavBar';
import api from './api';
import './styles.css';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const ProductListPage = lazy(() => import('./pages/ProductListPage'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const ProductReviewsPage = lazy(() => import('./pages/ProductReviewsPage'));
const CartPage = lazy(() => import('./pages/CartPage'));
const AddressPage = lazy(() => import('./pages/AddressPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const WishlistPage = lazy(() => import('./pages/WishlistPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const OrderPaymentPage = lazy(() => import('./pages/OrderPaymentPage'));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('./pages/AdminProductsPage'));
const AdminCategoriesPage = lazy(() => import('./pages/AdminCategoriesPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));
const AdminCouponsPage = lazy(() => import('./pages/AdminCouponsPage'));
const AdminInventoryPage = lazy(() => import('./pages/AdminInventoryPage'));
const AdminBannersPage = lazy(() => import('./pages/AdminBannersPage'));
const AdminReviewsPage = lazy(() => import('./pages/AdminReviewsPage'));
const AdminOrdersPage = lazy(() => import('./pages/AdminOrdersPage'));
const AdminPaymentsPage = lazy(() => import('./pages/AdminPaymentsPage'));
const AdminExpensesPage = lazy(() => import('./pages/AdminExpensesPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const OrderDetailPage = lazy(() => import('./pages/OrderDetailPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

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
      <Suspense fallback={<div className="route-loading" role="status"><span /></div>}>
        <Routes>
          <Route path="/" element={<ProductListPage user={user} />} />
          <Route path="/login" element={<AuthPage user={user} onAuthSuccess={handleAuthSuccess} />} />
          <Route path="/products/:id" element={<ProductDetailPage user={user} />} />
          <Route path="/products/:id/reviews" element={<ProductReviewsPage />} />
          <Route path="/cart" element={<CartPage user={user} />} />
          <Route path="/addresses" element={<AddressPage user={user} />} />
          <Route path="/orders" element={<OrdersPage user={user} />} />
          <Route path="/orders/:id" element={<OrderDetailPage user={user} />} />
          <Route path="/wishlist" element={<WishlistPage user={user} />} />
          <Route path="/checkout" element={<CheckoutPage user={user} />} />
          <Route path="/checkout/payment/:orderId" element={<OrderPaymentPage user={user} />} />
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
          <Route path="/admin/orders" element={<AdminOrdersPage user={user} />} />
          <Route path="/admin/payments" element={<AdminPaymentsPage user={user} />} />
          <Route path="/admin/expenses" element={<AdminExpensesPage user={user} />} />
          <Route path="/profile" element={<ProfilePage user={user} onProfileUpdate={handleProfileUpdate} />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
