import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import api from '../api';
import './NavBar.css';

export default function NavBar({ user, onLogout }) {
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [keyword, setKeyword] = useState('');

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
  };

  useEffect(() => {
    loadUnreadCount();

    window.addEventListener('notifications:changed', loadUnreadCount);
    return () => window.removeEventListener('notifications:changed', loadUnreadCount);
  }, [user]);

  return (
    <header className="app-header">
      <div className="brand">
        <span>Shop</span>Zone
      </div>
      <nav className="topnav">
        <NavLink to="/" end>
          Home
        </NavLink>
        <Link to="/#shop">Shop</Link>
        <Link to="/#categories">Categories</Link>
        <Link to="/#shop">Deals</Link>
        <NavLink to="/orders">Orders</NavLink>
        <NavLink to="/profile">Profile</NavLink>
        {user && (
          <NavLink to="/notifications">
            Notifications
            {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          </NavLink>
        )}
        {canManage && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <form className="header-search" onSubmit={submitHeaderSearch}>
        <button type="submit" aria-label="Search products">
          Search
        </button>
        <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Search products..." />
      </form>
      <div className="user-panel">
        <NavLink className="icon-link" to="/cart" aria-label="Cart">
          Cart
        </NavLink>
        <NavLink className="icon-link" to="/wishlist" aria-label="Wishlist">
          Wish
        </NavLink>
        {user ? (
          <>
            <span>{user.fullName || user.username}</span>
            <button className="small" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <NavLink className="login-link" to="/login">
            Login
          </NavLink>
        )}
      </div>
    </header>
  );
}
