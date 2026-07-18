import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, CreditCard, Heart, LayoutDashboard, LogIn, LogOut, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../api';
import './NavBar.css';

const navItems = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/orders', label: 'Đơn hàng' },
  { to: '/payments', label: 'Thanh toán', icon: CreditCard },
];

export default function NavBar({ user, onLogout }) {
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const loadUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const result = await api('/api/notifications/unread-count');
      setUnreadCount(Number(result.data || 0));
    } catch {
      setUnreadCount(0);
    }
  };

  const submitHeaderSearch = (event) => {
    event.preventDefault();
    const query = keyword.trim();
    navigate(query ? `/?keyword=${encodeURIComponent(query)}` : '/');
    setMenuOpen(false);
  };

  useEffect(() => {
    loadUnreadCount();
    window.addEventListener('notifications:changed', loadUnreadCount);
    return () => window.removeEventListener('notifications:changed', loadUnreadCount);
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setKeyword(location.pathname === '/' ? params.get('keyword') || '' : '');
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  return (
    <motion.header className="app-header" initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
      <div className="nav-container">
        <Link className="brand" to="/" aria-label="ShopZone home">
          <span className="brand-mark">S</span>
          <span>ShopZone</span>
        </Link>

        <nav className={`topnav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink to={item.to} end={item.end} key={item.label}>
              {item.icon && <item.icon size={15} />} {item.label}
            </NavLink>
          ))}
          {canManage && (
            <NavLink className="admin-nav-link" to="/admin">
              <LayoutDashboard size={16} /> Admin
            </NavLink>
          )}
        </nav>

        <form className="header-search" onSubmit={submitHeaderSearch} role="search">
          <Search aria-hidden="true" size={18} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="Tìm sản phẩm..."
            aria-label="Tìm sản phẩm"
          />
          <span className="search-hint">Enter</span>
        </form>

        <div className="user-panel">
          {user && (
            <NavLink className="nav-icon-button" to="/notifications" aria-label="Thông báo" title="Thông báo">
              <Bell size={19} />
              {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
            </NavLink>
          )}
          <NavLink className="nav-icon-button" to="/wishlist" aria-label="Yêu thích" title="Yêu thích">
            <Heart size={19} />
          </NavLink>
          <NavLink className="nav-icon-button" to="/cart" aria-label="Giỏ hàng" title="Giỏ hàng">
            <ShoppingBag size={19} />
          </NavLink>
          {user ? (
            <div className="account-menu">
              <NavLink className="account-link" to="/profile" title="Tài khoản">
                <span className="account-avatar"><UserRound size={17} /></span>
                <span>{user.fullName || user.username}</span>
              </NavLink>
              <button className="nav-icon-button" onClick={onLogout} aria-label="Đăng xuất" title="Đăng xuất" type="button">
                <LogOut size={18} />
              </button>
            </div>
          ) : (
            <NavLink className="login-link" to="/login">
              <LogIn size={17} /> Đăng nhập
            </NavLink>
          )}
          <button
            className="mobile-menu-button"
            type="button"
            aria-label={menuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </motion.header>
  );
}
