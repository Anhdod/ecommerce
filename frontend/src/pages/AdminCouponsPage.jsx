import { useEffect, useState } from 'react';
import api from '../api';

const initialForm = {
  code: '',
  description: '',
  discountType: 'PERCENT',
  discountValue: '',
  minOrderAmount: '',
  maxDiscountAmount: '',
  usageLimit: '',
  active: true,
  expiresAt: '',
};

export default function AdminCouponsPage({ user }) {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadCoupons = async () => {
    try {
      const result = await api('/api/coupons');
      setCoupons(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Cannot load coupons');
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
  };

  const toPayload = () => ({
    code: form.code,
    description: form.description,
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
    maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : null,
    usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
    active: form.active,
    expiresAt: form.expiresAt ? `${form.expiresAt}:00` : null,
  });

  const saveCoupon = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await api(`/api/coupons/${editingId}`, { method: 'PUT', body: toPayload() });
        showMessage('Coupon updated');
      } else {
        await api('/api/coupons', { method: 'POST', body: toPayload() });
        showMessage('Coupon created');
      }
      resetForm();
      loadCoupons();
    } catch (error) {
      showMessage(error?.message || 'Cannot save coupon');
    }
  };

  const editCoupon = (coupon) => {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code || '',
      description: coupon.description || '',
      discountType: coupon.discountType || 'PERCENT',
      discountValue: coupon.discountValue || '',
      minOrderAmount: coupon.minOrderAmount || '',
      maxDiscountAmount: coupon.maxDiscountAmount || '',
      usageLimit: coupon.usageLimit || '',
      active: coupon.active,
      expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 16) : '',
    });
  };

  const disableCoupon = async (couponId) => {
    if (!window.confirm('Disable this coupon?')) return;
    try {
      await api(`/api/coupons/${couponId}`, { method: 'DELETE' });
      showMessage('Coupon disabled');
      loadCoupons();
    } catch (error) {
      showMessage(error?.message || 'Cannot disable coupon');
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
      loadCoupons();
    }
  }, [user]);

  if (user?.role !== 'ADMIN' && user?.role !== 'STAFF') {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Coupons</h2>
          <p>Admin access required.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel split wide-split">
        <aside className="sidebar">
          <h2>{editingId ? 'Edit Coupon' : 'Create Coupon'}</h2>
          <form onSubmit={saveCoupon} className="form-grid">
            <label>
              Code
              <input value={form.code} onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value }))} required />
            </label>
            <label>
              Type
              <select value={form.discountType} onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value }))}>
                <option value="PERCENT">Percent</option>
                <option value="FIXED">Fixed amount</option>
              </select>
            </label>
            <label>
              Value
              <input type="number" min="1" value={form.discountValue} onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))} required />
            </label>
            <label>
              Min order
              <input type="number" min="0" value={form.minOrderAmount} onChange={(event) => setForm((prev) => ({ ...prev, minOrderAmount: event.target.value }))} />
            </label>
            <label>
              Max discount
              <input type="number" min="0" value={form.maxDiscountAmount} onChange={(event) => setForm((prev) => ({ ...prev, maxDiscountAmount: event.target.value }))} />
            </label>
            <label>
              Usage limit
              <input type="number" min="1" value={form.usageLimit} onChange={(event) => setForm((prev) => ({ ...prev, usageLimit: event.target.value }))} />
            </label>
            <label>
              Expires at
              <input type="datetime-local" value={form.expiresAt} onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))} />
            </label>
            <label>
              Description
              <textarea value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} />
              Active
            </label>
            <button type="submit">{editingId ? 'Update coupon' : 'Create coupon'}</button>
            {editingId && <button type="button" className="small" onClick={resetForm}>Cancel</button>}
          </form>
        </aside>

        <div className="table-list">
          {coupons.map((coupon) => (
            <article className="card compact-card" key={coupon.id}>
              <div className="card-header">
                <div>
                  <h3>{coupon.code}</h3>
                  <span className="muted">{coupon.description || 'No description'}</span>
                </div>
                <span className={`tag ${coupon.active ? 'success-tag' : 'danger-tag'}`}>
                  {coupon.active ? 'Active' : 'Disabled'}
                </span>
              </div>
              <div className="meta-grid">
                <span>{coupon.discountType}: {coupon.discountValue}</span>
                <span>Min: {coupon.minOrderAmount || 0}</span>
                <span>Max: {coupon.maxDiscountAmount || 'N/A'}</span>
                <span>Used: {coupon.usedCount}/{coupon.usageLimit || '∞'}</span>
                <span>Expires: {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleString() : 'Never'}</span>
              </div>
              <div className="row-actions">
                <button className="small" onClick={() => editCoupon(coupon)}>Edit</button>
                <button className="small danger" onClick={() => disableCoupon(coupon.id)}>Disable</button>
              </div>
            </article>
          ))}
          {!coupons.length && <p>No coupons yet.</p>}
        </div>
        {message && <div className="message full-row">{message}</div>}
      </section>
    </main>
  );
}
