import { useEffect, useMemo, useState } from 'react';
import api from '../api';

const roles = ['USER', 'STAFF', 'ADMIN'];
const initialForm = {
  email: '',
  fullName: '',
  phoneNumber: '',
  address: '',
  role: 'USER',
  enabled: true,
};

export default function AdminUsersPage({ user }) {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');

  const filteredUsers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return users;
    return users.filter((item) =>
      [item.username, item.email, item.fullName, item.phoneNumber, item.role]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(value))
    );
  }, [users, query]);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadUsers = async () => {
    try {
      const result = await api('/api/users/admin');
      setUsers(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Cannot load users');
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      email: item.email || '',
      fullName: item.fullName || '',
      phoneNumber: item.phoneNumber || '',
      address: item.address || '',
      role: item.role || 'USER',
      enabled: item.enabled !== false,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const saveUser = async (event) => {
    event.preventDefault();
    if (!editingId) return;

    try {
      await api(`/api/users/admin/${editingId}`, { method: 'PUT', body: form });
      showMessage('User updated');
      resetForm();
      loadUsers();
    } catch (error) {
      showMessage(error?.message || 'Cannot update user');
    }
  };

  const setRole = async (userId, role) => {
    try {
      await api(`/api/users/admin/${userId}/role?role=${role}`, { method: 'PUT' });
      showMessage('Role updated');
      loadUsers();
    } catch (error) {
      showMessage(error?.message || 'Cannot update role');
    }
  };

  const setEnabled = async (userId, enabled) => {
    try {
      await api(`/api/users/admin/${userId}/enabled?enabled=${enabled}`, { method: 'PUT' });
      showMessage(enabled ? 'User enabled' : 'User disabled');
      loadUsers();
    } catch (error) {
      showMessage(error?.message || 'Cannot update user status');
    }
  };

  const disableUser = async (userId) => {
    if (!window.confirm('Disable this user?')) return;
    try {
      await api(`/api/users/admin/${userId}`, { method: 'DELETE' });
      showMessage('User disabled');
      loadUsers();
    } catch (error) {
      showMessage(error?.message || 'Cannot disable user');
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      loadUsers();
    }
  }, [user]);

  if (user?.role !== 'ADMIN') {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>User Management</h2>
          <p>Admin access required.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel split wide-split">
        <aside className="sidebar">
          <h2>User Management</h2>
          <div className="stat-card">
            <strong>{users.length}</strong>
            <span>Total users</span>
          </div>
          <div className="stat-card">
            <strong>{users.filter((item) => item.enabled !== false).length}</strong>
            <span>Enabled</span>
          </div>
          <div className="stat-card">
            <strong>{users.filter((item) => item.role === 'ADMIN').length}</strong>
            <span>Admins</span>
          </div>

          {editingId && (
            <form onSubmit={saveUser} className="form-grid user-edit-form">
              <h3>Edit User</h3>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </label>
              <label>
                Full name
                <input
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                />
              </label>
              <label>
                Phone
                <input
                  value={form.phoneNumber}
                  onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                />
              </label>
              <label>
                Address
                <input
                  value={form.address}
                  onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                />
              </label>
              <label>
                Role
                <select
                  value={form.role}
                  onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
                >
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(event) => setForm((prev) => ({ ...prev, enabled: event.target.checked }))}
                />
                Enabled
              </label>
              <button type="submit">Save user</button>
              <button type="button" className="small" onClick={resetForm}>
                Cancel
              </button>
            </form>
          )}
        </aside>

        <div>
          <div className="toolbar">
            <div className="search-group">
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search users" />
              <button className="small" onClick={loadUsers}>
                Refresh
              </button>
            </div>
          </div>

          <div className="table-list">
            {filteredUsers.map((item) => (
              <article className="card compact-card" key={item.id}>
                <div className="card-header">
                  <div>
                    <h3>{item.fullName || item.username}</h3>
                    <span className="muted">
                      {item.username} - {item.email}
                    </span>
                  </div>
                  <div className="tag-group">
                    <span className="tag">{item.role}</span>
                    <span className={`tag ${item.enabled === false ? 'danger-tag' : 'success-tag'}`}>
                      {item.enabled === false ? 'Disabled' : 'Enabled'}
                    </span>
                  </div>
                </div>
                <div className="meta-grid">
                  <span>ID: {item.id}</span>
                  <span>Phone: {item.phoneNumber || 'N/A'}</span>
                  <span>Address: {item.address || 'N/A'}</span>
                </div>
                <div className="row-actions">
                  <button className="small" onClick={() => startEdit(item)}>
                    Edit
                  </button>
                  <select value={item.role || 'USER'} onChange={(event) => setRole(item.id, event.target.value)}>
                    {roles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                  {item.enabled === false ? (
                    <button className="small" onClick={() => setEnabled(item.id, true)}>
                      Enable
                    </button>
                  ) : (
                    <button className="small danger" onClick={() => disableUser(item.id)}>
                      Disable
                    </button>
                  )}
                </div>
              </article>
            ))}
            {!filteredUsers.length && <p>No users found.</p>}
          </div>
        </div>
        {message && <div className="message full-row">{message}</div>}
      </section>
    </main>
  );
}
