import { useEffect, useState } from 'react';
import api, { assetUrl } from '../api';

const initialForm = {
  title: '',
  subtitle: '',
  imageUrl: '',
  linkUrl: '',
  active: true,
  sortOrder: 0,
};

export default function AdminBannersPage({ user }) {
  const [banners, setBanners] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadBanners = async () => {
    try {
      const result = await api('/api/banners');
      setBanners(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Cannot load banners');
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const editBanner = (banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || '',
      subtitle: banner.subtitle || '',
      imageUrl: banner.imageUrl || '',
      linkUrl: banner.linkUrl || '',
      active: banner.active !== false,
      sortOrder: banner.sortOrder ?? 0,
    });
  };

  const saveBanner = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await api(`/api/banners/${editingId}`, { method: 'PUT', body: form });
        showMessage('Banner updated');
      } else {
        await api('/api/banners', { method: 'POST', body: form });
        showMessage('Banner created');
      }
      resetForm();
      loadBanners();
    } catch (error) {
      showMessage(error?.message || 'Cannot save banner');
    }
  };

  const deleteBanner = async (bannerId) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await api(`/api/banners/${bannerId}`, { method: 'DELETE' });
      showMessage('Banner deleted');
      loadBanners();
    } catch (error) {
      showMessage(error?.message || 'Cannot delete banner');
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
      loadBanners();
    }
  }, [user]);

  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Banner Management</h2>
          <p>Access denied.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel split wide-split">
        <aside className="sidebar">
          <h2>Banner Management</h2>
          <form onSubmit={saveBanner} className="form-grid">
            <label>
              Title
              <input value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} required />
            </label>
            <label>
              Subtitle
              <textarea value={form.subtitle} onChange={(event) => setForm((prev) => ({ ...prev, subtitle: event.target.value }))} />
            </label>
            <label>
              Image URL
              <input value={form.imageUrl} onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))} />
            </label>
            <label>
              Link URL
              <input value={form.linkUrl} onChange={(event) => setForm((prev) => ({ ...prev, linkUrl: event.target.value }))} />
            </label>
            <label>
              Sort order
              <input type="number" value={form.sortOrder} onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))} />
            </label>
            <label className="checkbox-row">
              <input type="checkbox" checked={form.active} onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))} />
              Active
            </label>
            <button type="submit">{editingId ? 'Update banner' : 'Create banner'}</button>
            {editingId && (
              <button type="button" className="small" onClick={resetForm}>
                Cancel
              </button>
            )}
          </form>
        </aside>

        <div>
          <div className="table-list">
            {banners.map((banner) => (
              <article className="card compact-card" key={banner.id}>
                <div className="card-header">
                  <div>
                    <h3>{banner.title}</h3>
                    <p className="muted">{banner.subtitle || 'No subtitle'}</p>
                  </div>
                  <span className={`tag ${banner.active ? 'success-tag' : 'danger-tag'}`}>{banner.active ? 'Active' : 'Disabled'}</span>
                </div>
                {banner.imageUrl && <img className="product-image" src={assetUrl(banner.imageUrl)} alt={banner.title} />}
                <div className="meta-grid">
                  <span>Sort: {banner.sortOrder ?? 0}</span>
                  <span>Link: {banner.linkUrl || 'N/A'}</span>
                </div>
                <div className="row-actions">
                  <button className="small" onClick={() => editBanner(banner)}>Edit</button>
                  <button className="small danger" onClick={() => deleteBanner(banner.id)}>Delete</button>
                </div>
              </article>
            ))}
            {!banners.length && <p>No banners yet.</p>}
          </div>
        </div>
        {message && <div className="message full-row">{message}</div>}
      </section>
    </main>
  );
}
