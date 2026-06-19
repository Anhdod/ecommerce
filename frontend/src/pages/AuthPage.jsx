import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const initialAuth = {
  username: '',
  password: '',
  email: '',
  fullName: '',
};

export default function AuthPage({ user, onAuthSuccess }) {
  const [tab, setTab] = useState('login');
  const [auth, setAuth] = useState(initialAuth);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const handleChange = (field) => (event) => {
    setAuth((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: {
          username: auth.username,
          password: auth.password,
        },
      });
      onAuthSuccess(result.data);
      showMessage('Dang nhap thanh cong');
      navigate('/');
    } catch (error) {
      showMessage(error?.message || 'Dang nhap that bai');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const result = await api('/auth/register', {
        method: 'POST',
        body: {
          username: auth.username,
          password: auth.password,
          email: auth.email,
          fullName: auth.fullName,
        },
      });
      onAuthSuccess(result.data);
      showMessage('Dang ky thanh cong');
      navigate('/');
    } catch (error) {
      showMessage(error?.message || 'Dang ky that bai');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page-shell">
      <section className="panel auth-panel">
        <h2>{tab === 'login' ? 'Login' : 'Register'}</h2>
        <div className="auth-tabs">
          <button className={tab === 'login' ? 'active' : ''} onClick={() => setTab('login')}>
            Login
          </button>
          <button className={tab === 'register' ? 'active' : ''} onClick={() => setTab('register')}>
            Register
          </button>
        </div>
        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <label>
              Username
              <input value={auth.username} onChange={handleChange('username')} required />
            </label>
            <label>
              Password
              <input type="password" value={auth.password} onChange={handleChange('password')} required />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <label>
              Username
              <input value={auth.username} onChange={handleChange('username')} required />
            </label>
            <label>
              Password
              <input type="password" value={auth.password} onChange={handleChange('password')} required />
            </label>
            <label>
              Email
              <input type="email" value={auth.email} onChange={handleChange('email')} required />
            </label>
            <label>
              Full name
              <input value={auth.fullName} onChange={handleChange('fullName')} />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Register'}
            </button>
          </form>
        )}
        {message && <div className="message">{message}</div>}
      </section>
    </main>
  );
}
