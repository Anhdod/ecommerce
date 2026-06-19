import { useEffect, useState } from 'react';
import api from '../api';

const initialForm = {
  label: '',
  recipientName: '',
  phoneNumber: '',
  addressLine: '',
  city: '',
  province: '',
  postalCode: '',
  defaultAddress: false,
};

export default function AddressPage({ user }) {
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadAddresses = async () => {
    try {
      const result = await api('/api/users/addresses');
      setAddresses(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được địa chỉ');
    }
  };

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleEdit = (address) => {
    setEditingId(address.id);
    setForm({
      label: address.label || '',
      recipientName: address.recipientName || '',
      phoneNumber: address.phoneNumber || '',
      addressLine: address.addressLine || '',
      city: address.city || '',
      province: address.province || '',
      postalCode: address.postalCode || '',
      defaultAddress: address.defaultAddress === true,
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await api(`/api/users/addresses/${editingId}`, {
          method: 'PUT',
          body: form,
        });
        showMessage('Cập nhật địa chỉ thành công');
      } else {
        await api('/api/users/addresses', {
          method: 'POST',
          body: form,
        });
        showMessage('Tạo địa chỉ thành công');
      }
      setForm(initialForm);
      setEditingId(null);
      loadAddresses();
    } catch (error) {
      showMessage(error?.message || 'Không lưu được địa chỉ');
    }
  };

  const handleDefault = async (addressId) => {
    try {
      await api(`/api/users/addresses/${addressId}/default`, { method: 'PUT' });
      showMessage('Đã đặt thành địa chỉ mặc định');
      loadAddresses();
    } catch (error) {
      showMessage(error?.message || 'Không chọn được địa chỉ mặc định');
    }
  };

  const handleDelete = async (addressId) => {
    if (!window.confirm('Delete this address?')) return;
    try {
      await api(`/api/users/addresses/${addressId}`, { method: 'DELETE' });
      showMessage('Xóa địa chỉ thành công');
      loadAddresses();
    } catch (error) {
      showMessage(error?.message || 'Không xóa được địa chỉ');
    }
  };

  useEffect(() => {
    if (user) {
      loadAddresses();
    }
  }, [user]);

  if (!user) {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Địa chỉ</h2>
          <p>Đăng nhập để quản lý địa chỉ giao hàng.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel split">
        <div className="sidebar">
          <h2>Địa chỉ của tôi</h2>
          <ul>
            {addresses.map((address) => (
              <li key={address.id} className={address.defaultAddress ? 'active' : ''}>
                <strong>{address.label}</strong>
                <p>{address.recipientName}</p>
                <p>{address.addressLine}, {address.city}, {address.province}</p>
                <p>{address.phoneNumber}</p>
                <div className="row-actions">
                  <button className="small" onClick={() => handleEdit(address)}>
                    Edit
                  </button>
                  <button className="small" onClick={() => handleDefault(address.id)}>
                    Default
                  </button>
                  <button className="small danger" onClick={() => handleDelete(address.id)}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
            {!addresses.length && <p>Chưa có địa chỉ nào.</p>}
          </ul>
        </div>

        <div>
          <h2>{editingId ? 'Update Address' : 'Create Address'}</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Label
              <input value={form.label} onChange={handleChange('label')} required />
            </label>
            <label>
              Recipient name
              <input value={form.recipientName} onChange={handleChange('recipientName')} required />
            </label>
            <label>
              Phone number
              <input value={form.phoneNumber} onChange={handleChange('phoneNumber')} required />
            </label>
            <label>
              Address line
              <input value={form.addressLine} onChange={handleChange('addressLine')} required />
            </label>
            <label>
              City
              <input value={form.city} onChange={handleChange('city')} required />
            </label>
            <label>
              Province
              <input value={form.province} onChange={handleChange('province')} required />
            </label>
            <label>
              Postal code
              <input value={form.postalCode} onChange={handleChange('postalCode')} required />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.defaultAddress}
                onChange={(event) => setForm((prev) => ({ ...prev, defaultAddress: event.target.checked }))}
              />
              Default address
            </label>
            <button type="submit">{editingId ? 'Update address' : 'Add address'}</button>
            {editingId && (
              <button type="button" className="small" onClick={() => {
                setEditingId(null);
                setForm(initialForm);
              }}>
                Cancel
              </button>
            )}
          </form>
          {message && <div className="message">{message}</div>}
        </div>
      </section>
    </main>
  );
}
