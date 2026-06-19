import { useEffect, useState } from 'react';
import api from '../api';

export default function ProfilePage({ user, onProfileUpdate }) {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ fullName: '', phoneNumber: '', address: '' });
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadProfile = async () => {
    try {
      const result = await api('/api/users/me');
      setProfile(result.data);
      setForm({
        fullName: result.data.fullName || '',
        phoneNumber: result.data.phoneNumber || '',
        address: result.data.address || '',
      });
    } catch (error) {
      showMessage(error?.message || 'Không tải được thông tin người dùng');
    }
  };

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleUpdate = async (event) => {
    event.preventDefault();
    try {
      const result = await api('/api/users/me', {
        method: 'PUT',
        body: form,
      });
      setProfile(result.data);
      onProfileUpdate?.(result.data);
      showMessage('Cập nhật hồ sơ thành công');
    } catch (error) {
      showMessage(error?.message || 'Không cập nhật được hồ sơ');
    }
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  if (!user) {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Profile</h2>
          <p>Đăng nhập để xem thông tin cá nhân.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel profile-panel">
        <h2>Profile</h2>
        {profile ? (
          <div className="split">
            <div className="sidebar">
              <p>
                <strong>Username:</strong> {profile.username}
              </p>
              <p>
                <strong>Email:</strong> {profile.email}
              </p>
              <p>
                <strong>Role:</strong> {profile.role}
              </p>
            </div>
            <div>
              <form onSubmit={handleUpdate} className="form-grid">
                <label>
                  Full name
                  <input value={form.fullName} onChange={handleChange('fullName')} />
                </label>
                <label>
                  Phone number
                  <input value={form.phoneNumber} onChange={handleChange('phoneNumber')} />
                </label>
                <label>
                  Address
                  <input value={form.address} onChange={handleChange('address')} />
                </label>
                <button type="submit">Update profile</button>
              </form>
            </div>
          </div>
        ) : (
          <p>Loading profile...</p>
        )}
        {message && <div className="message">{message}</div>}
      </section>
    </main>
  );
}
