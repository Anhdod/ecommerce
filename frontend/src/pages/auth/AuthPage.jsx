import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Phone,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
} from 'lucide-react';
import api, { assetUrl } from '../../api';
import './AuthPage.css';

const initialAuth = {
  username: '',
  password: '',
  confirmPassword: '',
  email: '',
  fullName: '',
  phoneNumber: '',
  resetCode: '',
};

export default function AuthPage({ user, onAuthSuccess }) {
  const [tab, setTab] = useState('login');
  const [auth, setAuth] = useState(initialAuth);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('error');
  const [loading, setLoading] = useState(false);
  const [resetStage, setResetStage] = useState('request');
  const [showPassword, setShowPassword] = useState(false);
  const [heroProduct, setHeroProduct] = useState(null);
  const messageTimer = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    const loadVisual = async () => {
      try {
        const result = await api('/api/products/featured?size=1');
        setHeroProduct(result.data?.content?.[0] || null);
      } catch {
        setHeroProduct(null);
      }
    };
    loadVisual();
    return () => window.clearTimeout(messageTimer.current);
  }, []);

  const showMessage = (text, type = 'error') => {
    window.clearTimeout(messageTimer.current);
    setMessage(text);
    setMessageType(type);
    messageTimer.current = window.setTimeout(() => setMessage(''), 5000);
  };

  const switchTab = (nextTab) => {
    setTab(nextTab);
    setMessage('');
    setMessageType('error');
    setResetStage('request');
    setShowPassword(false);
    setAuth((current) => ({ ...initialAuth, username: current.username }));
  };

  const handleChange = (field) => (event) => {
    setAuth((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const result = await api('/auth/login', {
        method: 'POST',
        body: { username: auth.username.trim(), password: auth.password },
      });
      onAuthSuccess(result.data);
      navigate('/');
    } catch (error) {
      showMessage(error?.message || 'Tên đăng nhập hoặc mật khẩu không đúng.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setMessage('');
    if (auth.password !== auth.confirmPassword) {
      showMessage('Mật khẩu xác nhận không khớp.');
      return;
    }
    setLoading(true);
    try {
      const result = await api('/auth/register', {
        method: 'POST',
        body: {
          username: auth.username.trim(),
          password: auth.password,
          email: auth.email.trim(),
          fullName: auth.fullName.trim(),
          phoneNumber: auth.phoneNumber.trim(),
        },
      });
      onAuthSuccess(result.data);
      navigate('/');
    } catch (error) {
      showMessage(error?.message || 'Không thể tạo tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const result = await api('/auth/forgot-password', {
        method: 'POST',
        body: { email: auth.email.trim() },
      });
      const demoCode = result.data?.demoCode || '';
      setAuth((current) => ({ ...current, resetCode: demoCode }));
      setResetStage('reset');
      showMessage(
        demoCode
          ? `Mã thử nghiệm: ${demoCode}. Mã có hiệu lực trong ${result.data?.expiresInMinutes || 10} phút.`
          : 'Nếu email tồn tại, mã xác nhận đã được gửi đến hộp thư của bạn.',
        'success'
      );
    } catch (error) {
      showMessage(error?.message || 'Không thể gửi mã đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    if (auth.password !== auth.confirmPassword) {
      showMessage('Mật khẩu xác nhận không khớp.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: {
          email: auth.email.trim(),
          code: auth.resetCode.trim(),
          newPassword: auth.password,
          confirmPassword: auth.confirmPassword,
        },
      });
      setTab('login');
      setResetStage('request');
      setAuth(initialAuth);
      showMessage('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.', 'success');
    } catch (error) {
      showMessage(error?.message || 'Không thể đặt lại mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page antialiased">
      <section className="auth-visual" aria-label="Sản phẩm nổi bật">
        <Link className="auth-back-link" to="/"><ArrowLeft size={16} /> Quay lại cửa hàng</Link>
        <div className="auth-visual-copy">
          <span>Mua sắm thông minh</span>
          <h1>Thiết bị bạn yêu thích, trong một nơi.</h1>
          <p>Khám phá sản phẩm công nghệ chính hãng và theo dõi đơn hàng dễ dàng.</p>
        </div>
        <motion.div className="auth-product-visual" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
          {heroProduct?.imageUrl ? (
            <img src={assetUrl(heroProduct.imageUrl)} alt={heroProduct.name || 'Sản phẩm nổi bật'} onError={() => setHeroProduct(null)} />
          ) : (
            <span className="auth-product-placeholder"><ShoppingBag size={72} /></span>
          )}
          {heroProduct && <div><small>Sản phẩm nổi bật</small><strong>{heroProduct.name}</strong></div>}
        </motion.div>
        <div className="auth-trust-line"><span><ShieldCheck size={16} /> Thanh toán an toàn</span><span><Check size={16} /> Sản phẩm chính hãng</span></div>
      </section>

      <section className="auth-form-column">
        <div className="auth-form-container">
          <div className="auth-mobile-brand"><span>S</span><strong>ShopZone</strong></div>
          <header className="auth-heading">
            <span>{tab === 'login' ? 'Chào mừng trở lại' : tab === 'register' ? 'Bắt đầu mua sắm' : 'Khôi phục tài khoản'}</span>
            <h2>{tab === 'login' ? 'Đăng nhập tài khoản' : tab === 'register' ? 'Tạo tài khoản mới' : 'Đặt lại mật khẩu'}</h2>
            <p>{tab === 'login' ? 'Tiếp tục quản lý đơn hàng và sản phẩm yêu thích.' : tab === 'register' ? 'Tạo tài khoản để có trải nghiệm mua sắm đầy đủ.' : 'Nhận mã xác nhận qua email đã đăng ký để tạo mật khẩu mới.'}</p>
          </header>

          {tab !== 'forgot' && (
            <div className="auth-tabs" role="tablist" aria-label="Chọn hình thức xác thực">
              <button className={tab === 'login' ? 'active' : ''} type="button" role="tab" aria-selected={tab === 'login'} onClick={() => switchTab('login')}>Đăng nhập</button>
              <button className={tab === 'register' ? 'active' : ''} type="button" role="tab" aria-selected={tab === 'register'} onClick={() => switchTab('register')}>Đăng ký</button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <motion.form className="auth-form" onSubmit={handleLogin} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} key="login">
                <label>Tên đăng nhập<div className="auth-input"><UserRound size={17} /><input value={auth.username} onChange={handleChange('username')} placeholder="Nhập tên đăng nhập" autoComplete="username" minLength={3} required /></div></label>
                <label>Mật khẩu<div className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={auth.password} onChange={handleChange('password')} placeholder="Nhập mật khẩu" autoComplete="current-password" minLength={6} required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
                <button className="auth-forgot-button" type="button" onClick={() => switchTab('forgot')}>Quên mật khẩu?</button>
                {message && <div className={`auth-error ${messageType}`}><X size={16} /> {message}</div>}
                <button className="auth-submit" type="submit" disabled={loading}>{loading ? <span className="auth-spinner" /> : <LockKeyhole size={17} />} {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
              </motion.form>
            ) : tab === 'register' ? (
              <motion.form className="auth-form auth-register-form" onSubmit={handleRegister} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} key="register">
                <label>Họ và tên<div className="auth-input"><UserRound size={17} /><input value={auth.fullName} onChange={handleChange('fullName')} placeholder="Nguyễn Văn A" autoComplete="name" /></div></label>
                <label>Email<div className="auth-input"><Mail size={17} /><input type="email" value={auth.email} onChange={handleChange('email')} placeholder="name@example.com" autoComplete="email" required /></div></label>
                <label>Tên đăng nhập<div className="auth-input"><UserRound size={17} /><input value={auth.username} onChange={handleChange('username')} placeholder="Từ 3 đến 50 ký tự" autoComplete="username" minLength={3} maxLength={50} required /></div></label>
                <label>Số điện thoại<div className="auth-input"><Phone size={17} /><input type="tel" value={auth.phoneNumber} onChange={handleChange('phoneNumber')} placeholder="0901 234 567" autoComplete="tel" /></div></label>
                <label>Mật khẩu<div className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={auth.password} onChange={handleChange('password')} placeholder="Tối thiểu 6 ký tự" autoComplete="new-password" minLength={6} required /><button type="button" onClick={() => setShowPassword((visible) => !visible)} title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
                <label>Xác nhận mật khẩu<div className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={auth.confirmPassword} onChange={handleChange('confirmPassword')} placeholder="Nhập lại mật khẩu" autoComplete="new-password" minLength={6} required /></div></label>
                {message && <div className={`auth-error ${messageType}`}><X size={16} /> {message}</div>}
                <button className="auth-submit" type="submit" disabled={loading}>{loading ? <span className="auth-spinner" /> : <UserRound size={17} />} {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}</button>
              </motion.form>
            ) : (
              <motion.form className="auth-form" onSubmit={resetStage === 'request' ? handleForgotPassword : handleResetPassword} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} key={`forgot-${resetStage}`}>
                <label>Email<div className="auth-input"><Mail size={17} /><input type="email" value={auth.email} onChange={handleChange('email')} placeholder="name@example.com" autoComplete="email" disabled={resetStage === 'reset'} required /></div></label>
                {resetStage === 'reset' && (
                  <>
                    <label>Mã xác nhận<div className="auth-input"><ShieldCheck size={17} /><input value={auth.resetCode} onChange={handleChange('resetCode')} placeholder="Nhập mã 6 số" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required /></div></label>
                    <label>Mật khẩu mới<div className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={auth.password} onChange={handleChange('password')} placeholder="Tối thiểu 6 ký tự" autoComplete="new-password" minLength={6} required /><button type="button" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
                    <label>Xác nhận mật khẩu<div className="auth-input"><LockKeyhole size={17} /><input type={showPassword ? 'text' : 'password'} value={auth.confirmPassword} onChange={handleChange('confirmPassword')} placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" minLength={6} required /></div></label>
                  </>
                )}
                {message && <div className={`auth-error ${messageType}`}><Check size={16} /> {message}</div>}
                <button className="auth-submit" type="submit" disabled={loading}>{loading ? <span className="auth-spinner" /> : <LockKeyhole size={17} />} {loading ? 'Đang xử lý...' : resetStage === 'request' ? 'Gửi mã xác nhận' : 'Đặt lại mật khẩu'}</button>
                {resetStage === 'reset' && <button className="auth-resend-button" type="button" onClick={() => setResetStage('request')}>Gửi lại mã</button>}
              </motion.form>
            )}
          </AnimatePresence>

          <p className="auth-switch-copy">{tab === 'login' ? 'Chưa có tài khoản?' : tab === 'register' ? 'Đã có tài khoản?' : 'Đã nhớ mật khẩu?'} <button type="button" onClick={() => switchTab(tab === 'login' ? 'register' : 'login')}>{tab === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}</button></p>
        </div>
      </section>
    </main>
  );
}
