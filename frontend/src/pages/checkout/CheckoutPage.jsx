import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Landmark,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  TicketPercent,
  Truck,
} from 'lucide-react';
import api, { assetUrl } from '../../api';
import { formatVnd as currency } from '../../utils/currency';
import './CheckoutPage.css';

const paymentOptions = [
  { value: 'MOCK_CARD', label: 'Thẻ thanh toán', description: 'Mô phỏng thanh toán bằng thẻ', icon: CreditCard },
  { value: 'BANK_TRANSFER', label: 'Chuyển khoản', description: 'Thanh toán qua ngân hàng', icon: Landmark },
  { value: 'COD', label: 'Thanh toán khi nhận', description: 'Trả tiền khi đơn hàng đến', icon: CircleDollarSign },
];

const shippingOptions = [
  { value: 'STANDARD', label: 'Giao hàng tiêu chuẩn', description: '3-5 ngày làm việc' },
  { value: 'EXPRESS', label: 'Giao hàng nhanh', description: '1-2 ngày làm việc' },
];

export default function CheckoutPage({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const checkoutDraft = location.state?.checkoutDraft;
  const requestedAddressId = Number(searchParams.get('addressId'));
  const selectedCartItemIds = useMemo(
    () => [...new Set(searchParams.getAll('cartItemIds').map(Number).filter(Number.isFinite))],
    [searchParams]
  );
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(checkoutDraft?.paymentMethod || 'MOCK_CARD');
  const [shippingMethod, setShippingMethod] = useState(checkoutDraft?.shippingMethod || 'STANDARD');
  const [couponCode, setCouponCode] = useState(checkoutDraft?.couponCode || '');
  const [checkoutPreview, setCheckoutPreview] = useState(null);
  const [orderResult, setOrderResult] = useState(null);
  const [message, setMessage] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === Number(selectedAddressId)),
    [addresses, selectedAddressId]
  );
  const addressManagerPath = `/addresses?returnTo=${encodeURIComponent(`${location.pathname}?${searchParams.toString()}`)}`;
  const addressManagerState = {
    checkoutDraft: { paymentMethod, shippingMethod, couponCode },
  };

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const loadAddresses = async () => {
    try {
      const result = await api('/api/users/addresses');
      const loadedAddresses = result.data || [];
      setAddresses(loadedAddresses);
      setSelectedAddressId((currentId) => {
        if (!loadedAddresses.length) return null;
        const requestedAddress = Number.isFinite(requestedAddressId)
          ? loadedAddresses.find((address) => Number(address.id) === requestedAddressId)
          : null;
        if (requestedAddress) return requestedAddress.id;
        if (loadedAddresses.some((address) => Number(address.id) === Number(currentId))) return currentId;
        const defaultAddress = loadedAddresses.find((address) => address.defaultAddress === true);
        return (defaultAddress || loadedAddresses[0]).id;
      });
    } catch (error) {
      showMessage(error?.message || 'Không tải được địa chỉ');
    }
  };

  const loadPreview = async (notify = false) => {
    if (!selectedAddress || !selectedCartItemIds.length) return;
    try {
      setPreviewLoading(true);
      const previewParams = new URLSearchParams({
        shippingMethod,
        addressId: String(selectedAddress.id),
        couponCode: couponCode.trim(),
      });
      selectedCartItemIds.forEach((cartItemId) => previewParams.append('cartItemIds', String(cartItemId)));
      const result = await api(`/api/orders/checkout-preview?${previewParams.toString()}`);
      setCheckoutPreview(result.data);
      if (notify) showMessage(couponCode.trim() ? 'Đã áp dụng mã giảm giá' : 'Đã cập nhật đơn hàng');
    } catch (error) {
      showMessage(error?.message || 'Không lấy được thông tin đơn hàng');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCouponSubmit = (event) => {
    event.preventDefault();
    loadPreview(true);
  };

  const handleCheckout = async () => {
    if (!selectedCartItemIds.length) {
      showMessage('Vui lòng chọn sản phẩm trong giỏ hàng');
      return;
    }
    if (!selectedAddress) {
      showMessage('Vui lòng chọn địa chỉ giao hàng');
      return;
    }
    try {
      setSubmitting(true);
      const result = await api('/api/orders/checkout', {
        method: 'POST',
        body: {
          addressId: selectedAddress.id,
          shippingAddress: `${selectedAddress.addressLine}, ${selectedAddress.city}, ${selectedAddress.province}`,
          phoneNumber: selectedAddress.phoneNumber,
          paymentMethod,
          shippingMethod,
          couponCode: couponCode.trim() || null,
          cartItemIds: selectedCartItemIds,
        },
      });
      if (paymentMethod === 'COD') {
        setOrderResult(result.data);
        showMessage('Đặt hàng thành công');
      } else {
        navigate(`/checkout/payment/${result.data.orderId}`, {
          state: { order: result.data },
          replace: true,
        });
      }
    } catch (error) {
      showMessage(error?.message || 'Không thể hoàn tất đơn hàng');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (user) loadAddresses();
  }, [user]);

  useEffect(() => {
    if (user && selectedAddress) loadPreview(false);
  }, [selectedAddressId, shippingMethod]);

  if (!user) {
    return (
      <main className="checkout-page">
        <section className="checkout-auth-state">
          <span><ShieldCheck size={36} /></span>
          <h1>Đăng nhập để thanh toán</h1>
          <p>Thông tin giỏ hàng và địa chỉ của bạn sẽ được bảo vệ.</p>
          <div><Link to="/login">Đăng nhập</Link><Link to="/cart">Quay lại giỏ hàng</Link></div>
        </section>
      </main>
    );
  }

  if (!selectedCartItemIds.length) {
    return (
      <main className="checkout-page">
        <section className="checkout-auth-state">
          <span><ShoppingBag size={36} /></span>
          <h1>Chưa chọn sản phẩm</h1>
          <p>Hãy tích những sản phẩm bạn muốn mua trong giỏ hàng trước khi thanh toán.</p>
          <div><Link to="/cart">Quay lại giỏ hàng</Link></div>
        </section>
      </main>
    );
  }

  if (orderResult) {
    return (
      <main className="checkout-page">
        <motion.section className="order-success" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}>
          <span className="success-icon"><Check size={34} /></span>
          <span className="success-kicker">Đặt hàng thành công</span>
          <h1>Cảm ơn bạn đã mua sắm.</h1>
          <p>Đơn hàng <strong>#{orderResult.orderId}</strong> đã được tạo và đang chờ xử lý.</p>
          <div className="success-order-meta">
            <span><small>Trạng thái</small><strong>{orderResult.status}</strong></span>
            <span><small>Tổng thanh toán</small><strong>{currency(orderResult.totalPrice)}</strong></span>
            <span><small>Vận chuyển</small><strong>{orderResult.shippingMethod}</strong></span>
          </div>
          <div className="success-actions">
            <Link to={`/orders/${orderResult.orderId}`}>Xem chi tiết đơn hàng</Link>
            <Link to="/">Tiếp tục mua sắm</Link>
          </div>
        </motion.section>
      </main>
    );
  }

  return (
    <main className="checkout-page antialiased">
      <div className="checkout-container">
        <div className="checkout-topbar">
          <Link to="/cart"><ArrowLeft size={16} /> Quay lại giỏ hàng</Link>
          <div className="checkout-steps" aria-label="Tiến trình thanh toán">
            <span className="complete"><Check size={13} /> Giỏ hàng</span><ChevronRight size={14} />
            <span className="active">2. Thanh toán</span><ChevronRight size={14} />
            <span>3. Hoàn tất</span>
          </div>
        </div>

        <header className="checkout-heading">
          <span>Thanh toán an toàn</span>
          <h1>Hoàn tất đơn hàng</h1>
          <p>Kiểm tra thông tin giao hàng và phương thức thanh toán.</p>
        </header>

        <div className="checkout-layout">
          <div className="checkout-form-column">
            <section className="checkout-section">
              <div className="checkout-section-heading">
                <span>1</span>
                <div><h2>Địa chỉ giao hàng</h2><p>Chọn nơi bạn muốn nhận sản phẩm.</p></div>
                <Link to={addressManagerPath} state={addressManagerState}>Quản lý địa chỉ</Link>
              </div>
              {addresses.length ? (
                <div className="checkout-address-grid">
                  {addresses.map((address) => (
                    <button
                      className={Number(selectedAddressId) === Number(address.id) ? 'selected' : ''}
                      type="button"
                      key={address.id}
                      onClick={() => setSelectedAddressId(address.id)}
                    >
                      <span className="address-check">{Number(selectedAddressId) === Number(address.id) && <Check size={14} />}</span>
                      <MapPin size={19} />
                      <strong>{address.label || 'Địa chỉ giao hàng'}</strong>
                      {address.defaultAddress && <small>Mặc định</small>}
                      <p>{address.addressLine}, {address.city}, {address.province}</p>
                      <span className="address-phone">{address.phoneNumber}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="checkout-no-address"><MapPin size={26} /><span>Chưa có địa chỉ giao hàng.</span><Link to={addressManagerPath} state={addressManagerState}>Thêm địa chỉ</Link></div>
              )}
            </section>

            <section className="checkout-section">
              <div className="checkout-section-heading">
                <span>2</span>
                <div><h2>Phương thức vận chuyển</h2><p>Chọn tốc độ giao hàng phù hợp.</p></div>
              </div>
              <div className="shipping-option-grid">
                {shippingOptions.map((option) => (
                  <label className={shippingMethod === option.value ? 'selected' : ''} key={option.value}>
                    <input type="radio" name="shipping" value={option.value} checked={shippingMethod === option.value} onChange={() => setShippingMethod(option.value)} />
                    <Truck size={20} />
                    <span><strong>{option.label}</strong><small>{option.description}</small></span>
                    <i>{option.value === 'STANDARD' ? 'Tiết kiệm' : 'Nhanh nhất'}</i>
                  </label>
                ))}
              </div>
            </section>

            <section className="checkout-section">
              <div className="checkout-section-heading">
                <span>3</span>
                <div><h2>Phương thức thanh toán</h2><p>Chọn cách bạn muốn thanh toán.</p></div>
              </div>
              <div className="payment-option-grid">
                {paymentOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <label className={paymentMethod === option.value ? 'selected' : ''} key={option.value}>
                      <input type="radio" name="payment" value={option.value} checked={paymentMethod === option.value} onChange={() => setPaymentMethod(option.value)} />
                      <Icon size={20} />
                      <span><strong>{option.label}</strong><small>{option.description}</small></span>
                      <i>{paymentMethod === option.value && <Check size={14} />}</i>
                    </label>
                  );
                })}
              </div>
            </section>
          </div>

          <aside className="checkout-summary">
            <div className="checkout-summary-heading"><h2>Đơn hàng</h2>{previewLoading && <span>Đang cập nhật...</span>}</div>
            <div className="checkout-summary-items">
              {checkoutPreview?.cart?.items?.map((item) => (
                <div className="checkout-summary-item" key={item.cartItemId}>
                  <span className="summary-item-image">
                    {item.imageUrl ? <img src={assetUrl(item.imageUrl)} alt={item.productName} /> : <ShoppingBag size={24} />}
                    <small>{item.quantity}</small>
                  </span>
                  <div><strong>{item.productName}</strong><small>{item.variantName ? `${item.variantName} · ${item.sku} · ` : item.selectedColor ? `Màu ${item.selectedColor} · ` : ''}{currency(item.price)}</small></div>
                  <b>{currency(item.subtotal)}</b>
                </div>
              ))}
              {!checkoutPreview?.cart?.items?.length && !previewLoading && <p className="summary-empty">Không có sản phẩm trong giỏ hàng.</p>}
            </div>

            <form className="coupon-form" onSubmit={handleCouponSubmit}>
              <label><TicketPercent size={17} /><input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Mã giảm giá" /></label>
              <button type="submit" disabled={!selectedAddress || previewLoading}>Áp dụng</button>
            </form>

            <div className="checkout-totals">
              <div><span>Tạm tính</span><strong>{currency(checkoutPreview?.subtotal)}</strong></div>
              <div><span>Phí vận chuyển</span><strong>{currency(checkoutPreview?.shippingFee)}</strong></div>
              <div className="discount-row"><span>Giảm giá</span><strong>-{currency(checkoutPreview?.discountAmount)}</strong></div>
              <div className="checkout-total-row"><span>Tổng cộng</span><strong>{currency(checkoutPreview?.grandTotal)}</strong></div>
            </div>

            <button className="place-order-button" type="button" onClick={handleCheckout} disabled={!selectedAddress || !checkoutPreview?.cart?.items?.length || submitting}>
              {submitting ? 'Đang xử lý...' : paymentMethod === 'COD' ? 'Đặt hàng' : 'Tiếp tục thanh toán'} <PackageCheck size={18} />
            </button>
            <p className="checkout-security"><ShieldCheck size={15} /> Thông tin thanh toán được bảo vệ an toàn.</p>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div className="checkout-toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
            <Check size={18} /> {message}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
