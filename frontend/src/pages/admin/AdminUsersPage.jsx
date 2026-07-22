import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Edit3,
  Mail,
  Moon,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShieldOff,
  Sun,
  Trash2,
  UserCheck,
  UserCog,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import Pagination from '../../components/Pagination';
import api from '../../api';
import usePagination from '../../hooks/usePagination';
import './AdminUsersPage.css';

const roles = ['USER', 'STAFF', 'ADMIN'];
const roleLabels = { USER: 'Khách hàng', STAFF: 'Nhân viên', ADMIN: 'Quản trị viên' };
const initialForm = {
  username: '',
  password: '',
  email: '',
  fullName: '',
  phoneNumber: '',
  address: '',
  role: 'USER',
  enabled: true,
};

export default function AdminUsersPage({ user }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingUser, setEditingUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'light');
  const messageTimer = useRef(null);
  const canManage = user?.role === 'ADMIN';

  const showMessage = (text, type = 'success') => {
    window.clearTimeout(messageTimer.current);
    setMessage({ text, type });
    messageTimer.current = window.setTimeout(() => setMessage(null), 4000);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const result = await api('/api/users/admin');
      setUsers(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được danh sách người dùng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => ({
    total: users.length,
    enabled: users.filter((item) => item.enabled).length,
    staff: users.filter((item) => item.role === 'STAFF').length,
    admins: users.filter((item) => item.role === 'ADMIN').length,
  }), [users]);

  const visibleUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((item) => {
      const matchesSearch = !keyword || [item.username, item.email, item.fullName, item.phoneNumber]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(keyword));
      const matchesRole = roleFilter === 'all' || item.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'enabled' ? item.enabled : !item.enabled);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [roleFilter, search, statusFilter, users]);

  const userPagination = usePagination(visibleUsers, 12, `${search}|${roleFilter}|${statusFilter}`);

  const closeDrawer = () => {
    setEditingUser(null);
    setForm(initialForm);
    setDrawerOpen(false);
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm(initialForm);
    setDrawerOpen(true);
  };

  const openEdit = (item) => {
    setEditingUser(item);
    setForm({
      username: item.username || '',
      password: '',
      email: item.email || '',
      fullName: item.fullName || '',
      phoneNumber: item.phoneNumber || '',
      address: item.address || '',
      role: item.role || 'USER',
      enabled: item.enabled !== false,
    });
    setDrawerOpen(true);
  };

  const saveUser = async (event) => {
    event.preventDefault();
    const isSelf = editingUser?.username === user.username;
    if (isSelf && (form.role !== 'ADMIN' || !form.enabled)) {
      showMessage('Không thể tự hạ quyền hoặc khóa tài khoản đang đăng nhập.', 'error');
      return;
    }

    const profile = {
      email: form.email.trim(),
      fullName: form.fullName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      address: form.address.trim(),
      role: form.role,
      enabled: form.enabled,
    };

    try {
      setSaving(true);
      if (editingUser) {
        await api(`/api/users/admin/${editingUser.id}`, { method: 'PUT', body: profile });
        showMessage('Đã cập nhật người dùng.');
      } else {
        await api('/api/users/admin', {
          method: 'POST',
          body: {
            ...profile,
            username: form.username.trim(),
            password: form.password,
          },
        });
        showMessage('Đã tạo tài khoản mới.');
      }
      closeDrawer();
      await loadUsers();
    } catch (error) {
      showMessage(error?.message || (editingUser ? 'Không thể cập nhật người dùng.' : 'Không thể tạo người dùng.'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const setRole = async (item, role) => {
    if (item.username === user.username) {
      showMessage('Không thể tự thay đổi quyền của tài khoản đang đăng nhập.', 'error');
      return;
    }
    try {
      setBusyId(item.id);
      await api(`/api/users/admin/${item.id}/role?role=${role}`, { method: 'PUT' });
      showMessage(`Đã chuyển vai trò thành ${roleLabels[role]}.`);
      await loadUsers();
    } catch (error) {
      showMessage(error?.message || 'Không thể cập nhật vai trò.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const setEnabled = async (item, enabled) => {
    if (item.username === user.username) {
      showMessage('Không thể khóa tài khoản đang đăng nhập.', 'error');
      return;
    }
    if (!enabled && !window.confirm(`Khóa tài khoản "${item.username}"?`)) return;
    try {
      setBusyId(item.id);
      await api(`/api/users/admin/${item.id}/enabled?enabled=${enabled}`, { method: 'PUT' });
      showMessage(enabled ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.');
      await loadUsers();
    } catch (error) {
      showMessage(error?.message || 'Không thể cập nhật trạng thái.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (item) => {
    if (item.username === user.username) {
      showMessage('Không thể xóa tài khoản đang đăng nhập.', 'error');
      return;
    }
    if (!window.confirm(`Xóa tài khoản "${item.username}"? Lịch sử đơn hàng vẫn được giữ lại.`)) return;
    try {
      setBusyId(item.id);
      await api(`/api/users/admin/${item.id}`, { method: 'DELETE' });
      showMessage('Đã xóa tài khoản.');
      await loadUsers();
    } catch (error) {
      showMessage(error?.message || 'Không thể xóa tài khoản.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const toggleTheme = () => setTheme((current) => {
    const next = current === 'light' ? 'dark' : 'light';
    localStorage.setItem('adminTheme', next);
    return next;
  });

  useEffect(() => {
    if (canManage) loadUsers();
    return () => window.clearTimeout(messageTimer.current);
  }, [user]);

  if (!canManage) {
    return (
      <main className="admin-users-access">
        <section><span><UsersRound size={34} /></span><h1>Không có quyền truy cập</h1><p>Chỉ ADMIN có thể quản lý người dùng và phân quyền.</p><Link to={user ? '/admin' : '/login'}>{user ? 'Về Dashboard' : 'Đăng nhập'}</Link></section>
      </main>
    );
  }

  return (
    <main className={`admin-users-shell admin-theme-${theme}`}>
      <AdminSidebar user={user} />
      <div className="admin-users-content">
        <header className="admin-users-topbar">
          <div><span>Quản trị / Hệ thống</span><h1>Người dùng</h1></div>
          <button className="admin-user-icon-button" type="button" onClick={toggleTheme} title="Đổi giao diện">{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button>
        </header>

        <div className="admin-users-inner">
          <section className="admin-users-heading">
            <div><h2>Quản lý người dùng</h2><p>Tạo tài khoản, cập nhật hồ sơ và quản lý quyền truy cập.</p></div>
            <span className="admin-users-heading-actions">
              <button type="button" onClick={loadUsers} disabled={loading} title="Làm mới"><RefreshCw size={16} className={loading ? 'admin-user-spinning' : ''} /></button>
              <button className="primary" type="button" onClick={openCreate}><Plus size={16} /> Thêm người dùng</button>
            </span>
          </section>

          <section className="admin-user-stats">
            <article><span><UsersRound size={18} /></span><div><strong>{stats.total}</strong><small>Tổng tài khoản</small></div></article>
            <article><span className="enabled"><UserCheck size={18} /></span><div><strong>{stats.enabled}</strong><small>Đang hoạt động</small></div></article>
            <article><span className="staff"><UserCog size={18} /></span><div><strong>{stats.staff}</strong><small>Nhân viên</small></div></article>
            <article><span className="admins"><ShieldCheck size={18} /></span><div><strong>{stats.admins}</strong><small>Quản trị viên</small></div></article>
          </section>

          <section className="admin-users-panel">
            <div className="admin-users-toolbar">
              <label><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên, username, email hoặc số điện thoại..." /></label>
              <div>
                <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">Tất cả vai trò</option>{roles.map((role) => <option value={role} key={role}>{roleLabels[role]}</option>)}</select>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Tất cả trạng thái</option><option value="enabled">Hoạt động</option><option value="disabled">Đã khóa</option></select>
              </div>
            </div>

            {loading && !users.length ? (
              <div className="admin-users-loading"><span /><span /><span /><span /></div>
            ) : visibleUsers.length ? (
              <div className="admin-users-table-wrap">
                <table className="admin-users-table">
                  <thead><tr><th>Người dùng</th><th>Liên hệ</th><th>Vai trò</th><th>Địa chỉ</th><th>Trạng thái</th><th aria-label="Thao tác" /></tr></thead>
                  <tbody>{userPagination.pageItems.map((item) => {
                    const isSelf = item.username === user.username;
                    return (
                      <tr key={item.id}>
                        <td><div className="admin-user-identity"><span>{(item.fullName || item.username || 'U').charAt(0).toUpperCase()}</span><div><strong>{item.fullName || item.username}</strong><small>@{item.username} · #{item.id}{isSelf ? ' · Bạn' : ''}</small></div></div></td>
                        <td><div className="admin-user-contact"><span><Mail size={12} />{item.email}</span><small>{item.phoneNumber || 'Chưa có số điện thoại'}</small></div></td>
                        <td><select className={`admin-user-role ${item.role?.toLowerCase()}`} value={item.role || 'USER'} onChange={(event) => setRole(item, event.target.value)} disabled={busyId === item.id || isSelf}>{roles.map((role) => <option value={role} key={role}>{roleLabels[role]}</option>)}</select></td>
                        <td><p className="admin-user-address">{item.address || 'Chưa cập nhật địa chỉ'}</p></td>
                        <td><span className={`admin-user-status ${item.enabled ? 'enabled' : 'disabled'}`}>{item.enabled ? 'Hoạt động' : 'Đã khóa'}</span></td>
                        <td><div className="admin-user-actions">
                          <button type="button" title="Chỉnh sửa" onClick={() => openEdit(item)} disabled={busyId === item.id}><Edit3 size={15} /></button>
                          <button className={item.enabled ? 'disable' : 'enable'} type="button" title={item.enabled ? 'Khóa tài khoản' : 'Mở khóa'} onClick={() => setEnabled(item, !item.enabled)} disabled={busyId === item.id || isSelf}>{item.enabled ? <ShieldOff size={15} /> : <ShieldCheck size={15} />}</button>
                          <button className="delete" type="button" title="Xóa tài khoản" onClick={() => deleteUser(item)} disabled={busyId === item.id || isSelf}><Trash2 size={15} /></button>
                        </div></td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            ) : (
              <div className="admin-users-empty"><span><UserRound size={28} /></span><h3>Không tìm thấy người dùng</h3><p>Thử thay đổi từ khóa hoặc bộ lọc.</p></div>
            )}
            <Pagination {...userPagination} onPageChange={userPagination.setPage} label="tài khoản" />
          </section>
        </div>
      </div>

      <AnimatePresence>{drawerOpen && <>
        <motion.button className="admin-user-drawer-overlay" type="button" onClick={closeDrawer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
        <motion.aside className="admin-user-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .22 }}>
          <header><div><span>{editingUser ? `Tài khoản #${editingUser.id}` : 'Tài khoản mới'}</span><h2>{editingUser ? 'Chỉnh sửa người dùng' : 'Thêm người dùng'}</h2></div><button type="button" onClick={closeDrawer} title="Đóng"><X size={18} /></button></header>
          <section className="admin-user-drawer-summary"><span>{(form.fullName || form.username || 'U').charAt(0).toUpperCase()}</span><div><strong>{form.fullName || form.username || 'Người dùng mới'}</strong><small>{form.username ? `@${form.username}` : 'Nhập thông tin tài khoản'}</small></div></section>
          <form onSubmit={saveUser}>
            {editingUser ? (
              <label>Username<input value={form.username} disabled /></label>
            ) : (
              <div className="admin-user-form-row">
                <label>Username<input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} minLength={3} maxLength={50} required /></label>
                <label>Mật khẩu<input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} minLength={6} maxLength={100} autoComplete="new-password" required /></label>
              </div>
            )}
            <label>Email<input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></label>
            <label>Họ và tên<input value={form.fullName} onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))} maxLength={100} /></label>
            <div className="admin-user-form-row">
              <label>Số điện thoại<input value={form.phoneNumber} onChange={(event) => setForm((current) => ({ ...current, phoneNumber: event.target.value }))} maxLength={20} /></label>
              <label>Vai trò<select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))} disabled={editingUser?.username === user.username}>{roles.map((role) => <option value={role} key={role}>{roleLabels[role]}</option>)}</select></label>
            </div>
            <label>Địa chỉ<textarea value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} maxLength={255} /></label>
            <label className="admin-user-enabled-control"><input type="checkbox" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} disabled={editingUser?.username === user.username} /><span><strong>Tài khoản hoạt động</strong><small>Người dùng có thể đăng nhập và sử dụng hệ thống.</small></span></label>
            {editingUser?.username === user.username && <p className="admin-user-self-note"><ShieldCheck size={14} /> Không thể tự đổi quyền hoặc khóa tài khoản đang đăng nhập.</p>}
            <footer><button type="button" onClick={closeDrawer}>Hủy</button><button type="submit" disabled={saving}><Check size={16} /> {saving ? 'Đang lưu...' : editingUser ? 'Lưu thay đổi' : 'Tạo tài khoản'}</button></footer>
          </form>
        </motion.aside>
      </>}</AnimatePresence>

      <AnimatePresence>{message && <motion.div className={`admin-users-toast ${message.type}`} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 14 }}>{message.type === 'success' ? <Check size={17} /> : <X size={17} />} {message.text}</motion.div>}</AnimatePresence>
    </main>
  );
}
