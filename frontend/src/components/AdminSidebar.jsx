import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Boxes,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Images,
  LayoutDashboard,
  Menu,
  PackageSearch,
  ReceiptText,
  ShoppingBag,
  Star,
  Tags,
  TicketPercent,
  UsersRound,
  X,
} from 'lucide-react';
import './AdminSidebar.css';

const navigationGroups = [
  {
    label: 'Tổng quan',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    label: 'Danh mục',
    items: [
      { to: '/admin/products', label: 'Sản phẩm', icon: PackageSearch },
      { to: '/admin/categories', label: 'Danh mục', icon: Tags },
      { to: '/admin/inventory', label: 'Kho hàng', icon: Boxes },
    ],
  },
  {
    label: 'Kinh doanh',
    items: [
      { to: '/admin/orders', label: 'Đơn hàng', icon: ShoppingBag },
      { to: '/admin/payments', label: 'Thanh toán', icon: CircleDollarSign },
      { to: '/admin/expenses', label: 'Chi phí', icon: ReceiptText },
      { to: '/admin/coupons', label: 'Mã giảm giá', icon: TicketPercent },
    ],
  },
  {
    label: 'Nội dung',
    items: [
      { to: '/admin/banners', label: 'Banner', icon: Images },
      { to: '/admin/reviews', label: 'Đánh giá', icon: Star },
    ],
  },
];

export default function AdminSidebar({ user }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const groups = user?.role === 'ADMIN'
    ? [...navigationGroups, { label: 'Hệ thống', items: [{ to: '/admin/users', label: 'Người dùng', icon: UsersRound }] }]
    : navigationGroups;

  return (
    <>
      <button className="admin-mobile-menu" type="button" onClick={() => setMobileOpen(true)} aria-label="Mở menu quản trị"><Menu size={20} /></button>
      {mobileOpen && <button className="admin-sidebar-overlay" type="button" aria-label="Đóng menu quản trị" onClick={() => setMobileOpen(false)} />}
      <aside className={`admin-sidebar ${collapsed ? 'is-collapsed' : ''} ${mobileOpen ? 'is-mobile-open' : ''}`}>
        <div className="admin-sidebar-brand">
          <Link to="/admin"><span><ChartNoAxesCombined size={19} /></span><strong>ShopZone <small>Admin</small></strong></Link>
          <button type="button" className="admin-sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Đóng menu"><X size={18} /></button>
        </div>

        <nav className="admin-sidebar-nav" aria-label="Điều hướng quản trị">
          {groups.map((group) => (
            <div className="admin-nav-group" key={group.label}>
              <span className="admin-nav-label">{group.label}</span>
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink to={item.to} end={item.end} onClick={() => setMobileOpen(false)} title={collapsed ? item.label : undefined} key={item.to}>
                    <Icon size={18} /><span>{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <div className="admin-user-summary"><span>{(user?.fullName || user?.username || 'A').charAt(0).toUpperCase()}</span><div><strong>{user?.fullName || user?.username}</strong><small>{user?.role}</small></div></div>
          <button className="admin-collapse-button" type="button" onClick={() => setCollapsed((value) => !value)} title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}>{collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17} /><span>Thu gọn</span></>}</button>
        </div>
      </aside>
    </>
  );
}
