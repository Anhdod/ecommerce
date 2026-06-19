import { useEffect, useState } from 'react';
import api from '../api';

const initialCategory = { name: '', description: '', featured: false };

export default function AdminCategoriesPage({ user }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialCategory);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadCategories = async () => {
    try {
      const result = await api('/api/categories');
      setCategories(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Cannot load categories');
    }
  };

  const resetForm = () => {
    setForm(initialCategory);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await api(`/api/categories/${editingId}`, { method: 'PUT', body: form });
        showMessage('Category updated');
      } else {
        await api('/api/categories', { method: 'POST', body: form });
        showMessage('Category created');
      }
      resetForm();
      loadCategories();
    } catch (error) {
      showMessage(error?.message || 'Cannot save category');
    }
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await api(`/api/categories/${categoryId}`, { method: 'DELETE' });
      showMessage('Category deleted');
      loadCategories();
    } catch (error) {
      showMessage(error?.message || 'Cannot delete category');
    }
  };

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'STAFF') {
      loadCategories();
    }
  }, [user]);

  if (user?.role !== 'ADMIN' && user?.role !== 'STAFF') {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Admin Categories</h2>
          <p>Admin access required.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel split">
        <aside className="sidebar">
          <h2>{editingId ? 'Edit Category' : 'Create Category'}</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Name
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => setForm((prev) => ({ ...prev, featured: event.target.checked }))}
              />
              Featured category
            </label>
            <button type="submit">{editingId ? 'Update category' : 'Create category'}</button>
            {editingId && (
              <button type="button" className="small" onClick={resetForm}>
                Cancel
              </button>
            )}
          </form>
        </aside>

        <div className="table-list">
          {categories.map((category) => (
            <article className="card" key={category.id}>
              <div className="card-header">
                <h3>{category.name}</h3>
                <div className="tag-group">
                  {category.featured && <span className="tag success-tag">Featured</span>}
                  <span className="tag">#{category.id}</span>
                </div>
              </div>
              <p>{category.description || 'No description'}</p>
              <div className="row-actions">
                <button
                  className="small"
                  onClick={() => {
                    setEditingId(category.id);
                    setForm({
                      name: category.name || '',
                      description: category.description || '',
                      featured: category.featured === true,
                    });
                  }}
                >
                  Edit
                </button>
                <button className="small danger" onClick={() => handleDelete(category.id)}>
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
        {message && <div className="message full-row">{message}</div>}
      </section>
    </main>
  );
}
