import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Check, ChevronRight, CreditCard, Heart, LockKeyhole, Mail, MapPin, Package, Phone, Save, ShieldCheck, UserRound } from 'lucide-react';
import api from '../../api';
import './ProfilePage.css';

const accountLinks = [
  { to: '/orders', label: 'Đơn hàng', description: 'Theo dõi lịch sử mua sắm', icon: Package },
  { to: '/payments', label: 'Thanh toán', description: 'Xem lịch sử giao dịch', icon: CreditCard },
  { to: '/addresses', label: 'Địa chỉ', description: 'Quản lý nơi nhận hàng', icon: MapPin },
  { to: '/wishlist', label: 'Yêu thích', description: 'Sản phẩm đã lưu', icon: Heart },
  { to: '/notifications', label: 'Thông báo', description: 'Cập nhật mới nhất', icon: Bell },
];

export default function ProfilePage({ user, onProfileUpdate }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', address: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const initials = useMemo(() => {
    const source = profile?.fullName || profile?.username || 'U';
    return source.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
  }, [profile]);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const result = await api('/api/users/me');
      setProfile(result.data);
      setForm({ fullName: result.data.fullName || '', phoneNumber: result.data.phoneNumber || '', address: result.data.address || '' });
    } catch (error) {
      showMessage(error?.message || 'Không tải được thông tin người dùng');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  const handleUpdate = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const result = await api('/api/users/me', { method: 'PUT', body: form });
      setProfile(result.data);
      onProfileUpdate?.(result.data);
      showMessage('Đã cập nhật hồ sơ');
    } catch (error) {
      showMessage(error?.message || 'Không cập nhật được hồ sơ');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (field) => (event) => {
    setPasswordForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showMessage('Mật khẩu xác nhận không khớp');
      return;
    }
    try {
      setChangingPassword(true);
      await api('/api/users/me/password', { method: 'PUT', body: passwordForm });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      localStorage.removeItem('refreshToken');
      showMessage('Đã đổi mật khẩu. Phiên đăng nhập khác đã bị vô hiệu hóa.');
    } catch (error) {
      showMessage(error?.message || 'Không thể đổi mật khẩu');
    } finally {
      setChangingPassword(false);
    }
  };

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  if (!user) {
    return (
      <main className="profile-page">
        <section className="profile-auth-state">
          <span><UserRound size={36} /></span><h1>Hồ sơ cá nhân</h1><p>Đăng nhập để quản lý thông tin tài khoản.</p><Link to="/login">Đăng nhập</Link>
        </section>
      </main>
    );
  }

  if (loading && !profile) {
    return <main className="profile-page"><div className="profile-skeleton"><span /><span /></div></main>;
  }

  return (
    <main className="profile-page antialiased">
      <div className="profile-container">
        <header className="profile-heading">
          <div><span>Tài khoản</span><h1>Hồ sơ cá nhân</h1><p>Quản lý thông tin và các hoạt động mua sắm.</p></div>
          <span className={`account-status ${profile?.enabled ? 'enabled' : 'disabled'}`}><ShieldCheck size={15} /> {profile?.enabled ? 'Tài khoản hoạt động' : 'Tài khoản bị khóa'}</span>
        </header>

        <div className="profile-layout">
          <aside className="profile-sidebar">
            <section className="profile-identity">
              <span className="profile-avatar">{initials}</span>
              <h2>{profile?.fullName || profile?.username}</h2>
              <p>@{profile?.username}</p>
              <span className="profile-role">{profile?.role}</span>
              <div className="identity-contact"><span><Mail size={15} /> {profile?.email}</span>{profile?.phoneNumber && <span><Phone size={15} /> {profile.phoneNumber}</span>}</div>
            </section>
            <nav className="profile-navigation" aria-label="Quản lý tài khoản">
              {accountLinks.map((item) => {
                const Icon = item.icon;
                return <Link to={item.to} key={item.to}><span><Icon size={18} /></span><div><strong>{item.label}</strong><small>{item.description}</small></div><ChevronRight size={16} /></Link>;
              })}
            </nav>
          </aside>

          <motion.section className="profile-form-section" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="profile-section-heading"><div><h2>Thông tin cá nhân</h2><p>Cập nhật thông tin được sử dụng khi đặt hàng.</p></div><UserRound size={20} /></div>
            <form className="profile-form" onSubmit={handleUpdate}>
              <label>Tên đăng nhập<input value={profile?.username || ''} disabled /><small>Tên đăng nhập không thể thay đổi.</small></label>
              <label>Email<input type="email" value={profile?.email || ''} disabled /><small>Email liên kết với tài khoản.</small></label>
              <label>Họ và tên<input value={form.fullName} onChange={handleChange('fullName')} placeholder="Nhập họ và tên" /></label>
              <label>Số điện thoại<input value={form.phoneNumber} onChange={handleChange('phoneNumber')} placeholder="Nhập số điện thoại" /></label>
              <label className="profile-address-field">Địa chỉ liên hệ<textarea value={form.address} onChange={handleChange('address')} placeholder="Nhập địa chỉ liên hệ" /></label>
              <div className="profile-form-footer"><span><ShieldCheck size={15} /> Thông tin của bạn được bảo mật.</span><button type="submit" disabled={saving}><Save size={16} /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></div>
            </form>

            <div className="profile-security-block">
              <div className="profile-section-heading"><div><h2>Đổi mật khẩu</h2><p>Dùng mật khẩu mạnh và không chia sẻ với người khác.</p></div><LockKeyhole size={20} /></div>
              <form className="profile-password-form" onSubmit={handleChangePassword}>
                <label>Mật khẩu hiện tại<input type="password" value={passwordForm.currentPassword} onChange={handlePasswordChange('currentPassword')} autoComplete="current-password" minLength={6} required /></label>
                <label>Mật khẩu mới<input type="password" value={passwordForm.newPassword} onChange={handlePasswordChange('newPassword')} autoComplete="new-password" minLength={6} required /></label>
                <label>Xác nhận mật khẩu mới<input type="password" value={passwordForm.confirmPassword} onChange={handlePasswordChange('confirmPassword')} autoComplete="new-password" minLength={6} required /></label>
                <button type="submit" disabled={changingPassword}><LockKeyhole size={16} /> {changingPassword ? 'Đang đổi...' : 'Đổi mật khẩu'}</button>
              </form>
            </div>
          </motion.section>
        </div>
      </div>

      <AnimatePresence>{message && <motion.div className="profile-toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}><Check size={18} /> {message}</motion.div>}</AnimatePresence>
    </main>
  );
}
