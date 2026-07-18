import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  CircleDollarSign,
  Edit3,
  Moon,
  Plus,
  ReceiptText,
  RefreshCw,
  Search,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import AdminSidebar from '../components/AdminSidebar';
import Pagination from '../components/Pagination';
import api from '../api';
import usePagination from '../hooks/usePagination';
import { formatVnd as currency, toVndAmount } from '../utils/currency';
import './AdminExpensesPage.css';

const categories = {
  SALARY: 'Lương nhân viên',
  RENT: 'Thuê mặt bằng',
  MARKETING: 'Quảng cáo',
  UTILITIES: 'Điện nước',
  SOFTWARE: 'Phần mềm',
  WAREHOUSE: 'Kho bãi',
  TAX: 'Thuế',
  OTHER: 'Chi phí khác',
};

const today = () => new Date().toLocaleDateString('en-CA');
const emptyForm = () => ({ category: 'OTHER', amount: '', description: '', expenseDate: today() });

export default function AdminExpensesPage({ user }) {
  const canManage = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const [expenses, setExpenses] = useState([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('adminTheme') || 'light');
  const messageTimer = useRef(null);

  const showMessage = (text, type = 'success') => {
    window.clearTimeout(messageTimer.current);
    setMessage({ text, type });
    messageTimer.current = window.setTimeout(() => setMessage(null), 4000);
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const result = await api('/api/admin/expenses');
      setExpenses(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      showMessage(error?.message || 'Không tải được danh sách chi phí.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) loadExpenses();
    return () => window.clearTimeout(messageTimer.current);
  }, [user]);

  const filteredExpenses = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return expenses.filter((expense) => {
      if (category !== 'ALL' && expense.category !== category) return false;
      if (!keyword) return true;
      return [expense.description, categories[expense.category], expense.createdBy]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword));
    });
  }, [category, expenses, query]);

  const pagination = usePagination(filteredExpenses, 10, `${query}|${category}`);
  const stats = useMemo(() => {
    const month = today().slice(0, 7);
    const total = expenses.reduce((sum, item) => sum + toVndAmount(item.amount), 0);
    const thisMonth = expenses.filter((item) => String(item.expenseDate).startsWith(month))
      .reduce((sum, item) => sum + toVndAmount(item.amount), 0);
    const largest = expenses.reduce((max, item) => Math.max(max, toVndAmount(item.amount)), 0);
    return { total, thisMonth, largest };
  }, [expenses]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDrawerOpen(true);
  };

  const openEdit = (expense) => {
    setEditingId(expense.id);
    setForm({
      category: expense.category,
      amount: expense.amount,
      description: expense.description,
      expenseDate: expense.expenseDate,
    });
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving) return;
    setDrawerOpen(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const saveExpense = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, amount: Number(form.amount) };
      await api(editingId ? `/api/admin/expenses/${editingId}` : '/api/admin/expenses', {
        method: editingId ? 'PUT' : 'POST',
        body: payload,
      });
      showMessage(editingId ? 'Đã cập nhật chi phí.' : 'Đã thêm chi phí mới.');
      setDrawerOpen(false);
      setEditingId(null);
      setForm(emptyForm());
      await loadExpenses();
    } catch (error) {
      showMessage(error?.message || 'Không lưu được chi phí.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = async (expense) => {
    if (!window.confirm(`Xóa khoản chi "${expense.description}"?`)) return;
    try {
      await api(`/api/admin/expenses/${expense.id}`, { method: 'DELETE' });
      showMessage('Đã xóa chi phí.');
      await loadExpenses();
    } catch (error) {
      showMessage(error?.message || 'Không xóa được chi phí.', 'error');
    }
  };

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('adminTheme', next);
  };

  if (!canManage) {
    return <main className="admin-expenses-access"><section><ReceiptText size={34} /><h1>Không có quyền truy cập</h1><p>Chỉ ADMIN hoặc STAFF có thể quản lý chi phí.</p><Link to={user ? '/' : '/login'}>{user ? 'Về cửa hàng' : 'Đăng nhập'}</Link></section></main>;
  }

  return (
    <main className={`admin-expenses-shell admin-theme-${theme}`}>
      <AdminSidebar user={user} />
      <div className="admin-expenses-content">
        <header className="admin-expenses-topbar">
          <div><span>Quản trị / Tài chính</span><h1>Chi phí vận hành</h1></div>
          <div><button className="admin-expense-icon" type="button" title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'} onClick={toggleTheme}>{theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}</button><button className="admin-expense-add" type="button" onClick={openCreate}><Plus size={15} /> Thêm chi phí</button></div>
        </header>

        <div className="admin-expenses-inner">
          <section className="admin-expenses-title"><div><h2>Sổ chi phí</h2><p>Ghi nhận các khoản vận hành để tính lợi nhuận ròng chính xác.</p></div><button type="button" onClick={loadExpenses} disabled={loading}><RefreshCw className={loading ? 'spinning' : ''} size={15} /> Làm mới</button></section>
          <section className="admin-expense-stats">
            <article><span><CircleDollarSign size={18} /></span><div><small>Tổng chi phí</small><strong>{currency(stats.total)}</strong></div></article>
            <article><span className="month"><ReceiptText size={18} /></span><div><small>Tháng này</small><strong>{currency(stats.thisMonth)}</strong></div></article>
            <article><span className="largest"><CircleDollarSign size={18} /></span><div><small>Khoản lớn nhất</small><strong>{currency(stats.largest)}</strong></div></article>
            <article><span className="count"><ReceiptText size={18} /></span><div><small>Số khoản chi</small><strong>{expenses.length}</strong></div></article>
          </section>

          <section className="admin-expenses-panel">
            <div className="admin-expenses-toolbar"><label><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm nội dung chi phí..." /></label><select value={category} onChange={(event) => setCategory(event.target.value)}><option value="ALL">Tất cả loại chi phí</option>{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
            {loading && !expenses.length ? <div className="admin-expenses-loading"><span /><span /><span /></div> : filteredExpenses.length ? <>
              <div className="admin-expenses-table-wrap"><table><thead><tr><th>Ngày chi</th><th>Loại chi phí</th><th>Nội dung</th><th>Người tạo</th><th>Số tiền</th><th aria-label="Thao tác" /></tr></thead><tbody>{pagination.pageItems.map((expense) => <tr key={expense.id}><td>{new Intl.DateTimeFormat('vi-VN').format(new Date(`${expense.expenseDate}T00:00:00`))}</td><td><span className={`expense-category ${expense.category.toLowerCase()}`}>{categories[expense.category]}</span></td><td><strong>{expense.description}</strong></td><td>{expense.createdBy || 'Hệ thống'}</td><td><b>{currency(expense.amount)}</b></td><td><div><button type="button" title="Chỉnh sửa" onClick={() => openEdit(expense)}><Edit3 size={14} /></button><button className="delete" type="button" title="Xóa" onClick={() => deleteExpense(expense)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div>
              <Pagination {...pagination} onPageChange={pagination.setPage} label="chi phí" />
            </> : <div className="admin-expenses-empty"><ReceiptText size={28} /><strong>Chưa có chi phí phù hợp</strong><span>Thêm khoản chi đầu tiên hoặc thay đổi bộ lọc.</span></div>}
          </section>
        </div>
      </div>

      <AnimatePresence>{drawerOpen && <><motion.button className="admin-expense-overlay" type="button" aria-label="Đóng form" onClick={closeDrawer} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} /><motion.aside className="admin-expense-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .22 }}><header><div><span>{editingId ? `Chi phí #${editingId}` : 'Khoản chi mới'}</span><h2>{editingId ? 'Chỉnh sửa chi phí' : 'Thêm chi phí'}</h2></div><button type="button" onClick={closeDrawer}><X size={18} /></button></header><form onSubmit={saveExpense}><label>Loại chi phí<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}>{Object.entries(categories).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Số tiền<input type="number" min="1" step="1" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0 VND" required /></label><label>Ngày ghi nhận<input type="date" value={form.expenseDate} onChange={(event) => setForm((current) => ({ ...current, expenseDate: event.target.value }))} required /></label><label>Nội dung<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Ví dụ: Chi phí quảng cáo Facebook tháng 7" required /></label><footer><button type="button" onClick={closeDrawer}>Hủy</button><button type="submit" disabled={saving}><Check size={15} /> {saving ? 'Đang lưu...' : 'Lưu chi phí'}</button></footer></form></motion.aside></>}</AnimatePresence>
      <AnimatePresence>{message && <motion.div className={`admin-expenses-toast ${message.type}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>{message.type === 'success' ? <Check size={16} /> : <X size={16} />} {message.text}</motion.div>}</AnimatePresence>
    </main>
  );
}
