import { lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar';
import api from './api';
import './styles.css';

const AuthPage = lazy(() => import('./pages/auth/AuthPage'));
const ProductListPage = lazy(() => import('./pages/catalog/ProductListPage'));
const ProductDetailPage = lazy(() => import('./pages/catalog/ProductDetailPage'));
const ProductReviewsPage = lazy(() => import('./pages/catalog/ProductReviewsPage'));
const CartPage = lazy(() => import('./pages/checkout/CartPage'));
const AddressPage = lazy(() => import('./pages/account/AddressPage'));
const OrdersPage = lazy(() => import('./pages/account/OrdersPage'));
const WishlistPage = lazy(() => import('./pages/account/WishlistPage'));
const CheckoutPage = lazy(() => import('./pages/checkout/CheckoutPage'));
const OrderPaymentPage = lazy(() => import('./pages/checkout/OrderPaymentPage'));
const PaymentsPage = lazy(() => import('./pages/checkout/PaymentsPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminProductsPage = lazy(() => import('./pages/admin/AdminProductsPage'));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminCouponsPage = lazy(() => import('./pages/admin/AdminCouponsPage'));
const AdminInventoryPage = lazy(() => import('./pages/admin/AdminInventoryPage'));
const AdminBannersPage = lazy(() => import('./pages/admin/AdminBannersPage'));
const AdminReviewsPage = lazy(() => import('./pages/admin/AdminReviewsPage'));
const AdminOrdersPage = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminPaymentsPage = lazy(() => import('./pages/admin/AdminPaymentsPage'));
const AdminExpensesPage = lazy(() => import('./pages/admin/AdminExpensesPage'));
const NotificationsPage = lazy(() => import('./pages/account/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/account/ProfilePage'));
const OrderDetailPage = lazy(() => import('./pages/account/OrderDetailPage'));
const NotFoundPage = lazy(() => import('./pages/system/NotFoundPage'));

function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

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
      <ScrollToTop />
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
