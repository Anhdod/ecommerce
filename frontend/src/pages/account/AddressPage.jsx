import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Edit3,
  Home,
  MapPin,
  Navigation,
  Phone,
  Plus,
  Save,
  Trash2,
  UserRound,
  X,
} from 'lucide-react';
import api from '../../api';
import './AddressPage.css';

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
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturnTo = searchParams.get('returnTo') || '';
  const returnToCheckout = requestedReturnTo === '/checkout' || requestedReturnTo.startsWith('/checkout?')
    ? requestedReturnTo
    : '';
  const [addresses, setAddresses] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const formRef = useRef(null);
  const messageTimer = useRef(null);

  const showMessage = (text, type = 'success') => {
    window.clearTimeout(messageTimer.current);
    setMessage({ text, type });
    messageTimer.current = window.setTimeout(() => setMessage(null), 4000);
  };

  const loadAddresses = async () => {
    try {
      setLoading(true);
      const result = await api('/api/users/addresses');
      setAddresses(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được danh sách địa chỉ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
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
    window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      if (editingId) {
        await api(`/api/users/addresses/${editingId}`, { method: 'PUT', body: form });
        showMessage('Đã cập nhật địa chỉ.');
      } else {
        await api('/api/users/addresses', { method: 'POST', body: form });
        showMessage('Đã thêm địa chỉ mới.');
      }
      resetForm();
      await loadAddresses();
    } catch (error) {
      showMessage(error?.message || 'Không thể lưu địa chỉ.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDefault = async (addressId) => {
    try {
      setBusyId(addressId);
      await api(`/api/users/addresses/${addressId}/default`, { method: 'PUT' });
      showMessage('Đã đặt làm địa chỉ mặc định.');
      await loadAddresses();
    } catch (error) {
      showMessage(error?.message || 'Không thể đổi địa chỉ mặc định.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (address) => {
    if (!window.confirm(`Xóa địa chỉ "${address.label || 'giao hàng'}"?`)) return;
    try {
      setBusyId(address.id);
      await api(`/api/users/addresses/${address.id}`, { method: 'DELETE' });
      if (editingId === address.id) resetForm();
      showMessage('Đã xóa địa chỉ.');
      await loadAddresses();
    } catch (error) {
      showMessage(error?.message || 'Không thể xóa địa chỉ.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleSelectForCheckout = (addressId) => {
    if (!returnToCheckout) return;
    const [pathname, query = ''] = returnToCheckout.split('?');
    const checkoutParams = new URLSearchParams(query);
    checkoutParams.set('addressId', String(addressId));
    navigate(`${pathname}?${checkoutParams.toString()}`, {
      state: location.state,
      replace: true,
    });
  };

  useEffect(() => {
    if (user) loadAddresses();
    return () => window.clearTimeout(messageTimer.current);
  }, [user]);

  if (!user) {
    return (
      <main className="address-page">
        <section className="address-auth-state">
          <span><MapPin size={34} /></span>
          <h1>Địa chỉ giao hàng</h1>
          <p>Đăng nhập để quản lý địa chỉ nhận hàng của bạn.</p>
          <Link to="/login">Đăng nhập</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="address-page antialiased">
      <div className="address-container">
        {returnToCheckout && (
          <Link className="address-checkout-return" to={returnToCheckout} state={location.state}>
            <ArrowLeft size={15} /> Quay lại thanh toán
          </Link>
        )}
        <header className="address-heading">
          <div>
            <span>Tài khoản</span>
            <h1>Địa chỉ giao hàng</h1>
            <p>Quản lý thông tin nhận hàng để thanh toán nhanh hơn.</p>
          </div>
          <button type="button" onClick={() => { resetForm(); formRef.current?.scrollIntoView({ behavior: 'smooth' }); }}>
            <Plus size={17} /> Thêm địa chỉ
          </button>
        </header>

        <div className="address-layout">
          <section className="address-list-section">
            <div className="address-section-heading">
              <div><h2>Địa chỉ đã lưu</h2><p>{addresses.length} địa chỉ trong tài khoản</p></div>
              <MapPin size={20} />
            </div>

            {loading && !addresses.length ? (
              <div className="address-skeleton"><span /><span /></div>
            ) : addresses.length ? (
              <div className="address-card-list">
                {addresses.map((address, index) => (
                  <motion.article
                    className={`address-card ${address.defaultAddress ? 'is-default' : ''}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    key={address.id}
                  >
                    <div className="address-card-icon"><Home size={19} /></div>
                    <div className="address-card-content">
                      <div className="address-card-title">
                        <h3>{address.label || 'Địa chỉ giao hàng'}</h3>
                        {address.defaultAddress && <span><CheckCircle2 size={13} /> Mặc định</span>}
                      </div>
                      <strong><UserRound size={14} /> {address.recipientName}</strong>
                      <p><Navigation size={14} /> <span>{[address.addressLine, address.city, address.province, address.postalCode].filter(Boolean).join(', ')}</span></p>
                      <p><Phone size={14} /> <span>{address.phoneNumber}</span></p>
                      <div className="address-card-actions">
                        {returnToCheckout && (
                          <button className="select-checkout-address" type="button" onClick={() => handleSelectForCheckout(address.id)}>
                            <Check size={15} /> Chọn giao đến đây
                          </button>
                        )}
                        {!address.defaultAddress && (
                          <button type="button" disabled={busyId === address.id} onClick={() => handleDefault(address.id)}>
                            <Check size={15} /> Đặt mặc định
                          </button>
                        )}
                        <button type="button" title="Chỉnh sửa địa chỉ" disabled={busyId === address.id} onClick={() => handleEdit(address)}><Edit3 size={16} /> Sửa</button>
                        <button className="delete-address" type="button" title="Xóa địa chỉ" disabled={busyId === address.id} onClick={() => handleDelete(address)}><Trash2 size={16} /> Xóa</button>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            ) : (
              <div className="address-empty-state">
                <span><MapPin size={30} /></span>
                <h3>Chưa có địa chỉ</h3>
                <p>Thêm địa chỉ nhận hàng đầu tiên của bạn.</p>
              </div>
            )}
          </section>

          <motion.section className="address-form-section" ref={formRef} layout>
            <div className="address-section-heading">
              <div><h2>{editingId ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}</h2><p>Điền đầy đủ thông tin người nhận.</p></div>
              {editingId ? <Edit3 size={20} /> : <Plus size={20} />}
            </div>
            <form className="address-form" onSubmit={handleSubmit}>
              <label className="address-wide-field">Tên gợi nhớ<input value={form.label} onChange={handleChange('label')} placeholder="Ví dụ: Nhà riêng, Văn phòng" /></label>
              <label>Họ và tên người nhận<input value={form.recipientName} onChange={handleChange('recipientName')} placeholder="Nguyễn Văn A" required /></label>
              <label>Số điện thoại<input type="tel" value={form.phoneNumber} onChange={handleChange('phoneNumber')} placeholder="0901 234 567" required /></label>
              <label className="address-wide-field">Địa chỉ cụ thể<input value={form.addressLine} onChange={handleChange('addressLine')} placeholder="Số nhà, tên đường, phường/xã" required /></label>
              <label>Tỉnh / Thành phố<input value={form.province} onChange={handleChange('province')} placeholder="TP. Hồ Chí Minh" /></label>
              <label>Quận / Huyện<input value={form.city} onChange={handleChange('city')} placeholder="Quận 1" /></label>
              <label className="address-wide-field">Mã bưu chính<input value={form.postalCode} onChange={handleChange('postalCode')} placeholder="700000" /></label>
              <label className="address-default-control">
                <input type="checkbox" checked={form.defaultAddress} onChange={(event) => setForm((current) => ({ ...current, defaultAddress: event.target.checked }))} />
                <span><strong>Đặt làm địa chỉ mặc định</strong><small>Tự động chọn địa chỉ này khi thanh toán.</small></span>
              </label>
              <div className="address-form-actions">
                {editingId && <button className="address-cancel-button" type="button" onClick={resetForm}><X size={16} /> Hủy</button>}
                <button className="address-save-button" type="submit" disabled={saving}><Save size={16} /> {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm địa chỉ'}</button>
              </div>
            </form>
          </motion.section>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div className={`address-toast ${message.type}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
            {message.type === 'success' ? <CheckCircle2 size={18} /> : <X size={18} />} {message.text}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
