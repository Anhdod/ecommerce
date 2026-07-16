import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../api';

export default function NavBar({ user, onLogout }) {
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const [unreadCount, setUnreadCount] = useState(0);

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

  useEffect(() => {
    loadUnreadCount();

    window.addEventListener('notifications:changed', loadUnreadCount);
    return () => window.removeEventListener('notifications:changed', loadUnreadCount);
  }, [user]);

  return (
    <header className="app-header">
      <div className="brand">Ecommerce React</div>
      <nav className="topnav">
        <NavLink to="/" end>
          Home
        </NavLink>
        {user && (
          <NavLink to="/notifications">
            Notifications
            {unreadCount > 0 && <span className="nav-badge">{unreadCount}</span>}
          </NavLink>
        )}
        <NavLink to="/cart">Cart</NavLink>
        <NavLink to="/orders">Orders</NavLink>
        <NavLink to="/wishlist">Wishlist</NavLink>
        <NavLink to="/addresses">Addresses</NavLink>
        <NavLink to="/payments">Payments</NavLink>
        <NavLink to="/profile">Profile</NavLink>
        {canManage && <NavLink to="/admin">Admin</NavLink>}
      </nav>
      <div className="user-panel">
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
