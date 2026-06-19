import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

const paymentOptions = ['COD', 'BANK_TRANSFER', 'MOCK_CARD'];
const shippingOptions = ['STANDARD', 'EXPRESS'];

export default function CheckoutPage({ user }) {
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('MOCK_CARD');
  const [shippingMethod, setShippingMethod] = useState('STANDARD');
  const [couponCode, setCouponCode] = useState('');
  const [checkoutPreview, setCheckoutPreview] = useState(null);
  const [orderResult, setOrderResult] = useState(null);
  const [message, setMessage] = useState('');

  const selectedAddress = useMemo(
    () => addresses.find((address) => address.id === Number(selectedAddressId)),
    [addresses, selectedAddressId]
  );

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadAddresses = async () => {
    try {
      const result = await api('/api/users/addresses');
      setAddresses(result.data || []);
      if (result.data?.length && !selectedAddressId) {
        const defaultAddress = result.data.find((address) => address.defaultAddress === true);
        setSelectedAddressId((defaultAddress || result.data[0]).id);
      }
    } catch (error) {
      showMessage(error?.message || 'Không tải được địa chỉ');
    }
  };

  const handlePreview = async () => {
    if (!selectedAddress) {
      showMessage('Chọn địa chỉ để xem preview');
      return;
    }
    try {
      const result = await api(
        `/api/orders/checkout-preview?shippingMethod=${shippingMethod}&addressId=${selectedAddress.id}&couponCode=${encodeURIComponent(couponCode)}`
      );
      setCheckoutPreview(result.data);
      showMessage('Checkout preview loaded');
    } catch (error) {
      showMessage(error?.message || 'Không lấy được preview checkout');
    }
  };

  const handleCheckout = async () => {
    if (!selectedAddress) {
      showMessage('Chọn địa chỉ để thanh toán');
      return;
    }
    try {
      const result = await api('/api/orders/checkout', {
        method: 'POST',
        body: {
          addressId: selectedAddress.id,
          shippingAddress: `${selectedAddress.addressLine}, ${selectedAddress.city}, ${selectedAddress.province}`,
          phoneNumber: selectedAddress.phoneNumber,
          paymentMethod,
          shippingMethod,
          couponCode: couponCode.trim() || null,
        },
      });
      setOrderResult(result.data);
      showMessage('Checkout thành công');
    } catch (error) {
      showMessage(error?.message || 'Không thực hiện được thanh toán');
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
          <h2>Checkout</h2>
          <p>Đăng nhập để tiến hành thanh toán.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel checkout-panel">
        <h2>Checkout</h2>
        <div className="split">
          <div className="sidebar">
            <h3>Shipping address</h3>
            {addresses.length ? (
              <ul>
                {addresses.map((address) => (
                  <li
                    key={address.id}
                    className={selectedAddressId === address.id ? 'active' : ''}
                    onClick={() => setSelectedAddressId(address.id)}
                  >
                    <strong>{address.label} {address.defaultAddress ? '(Default)' : ''}</strong>
                    <p>{address.addressLine}, {address.city}, {address.province}</p>
                    <p>{address.phoneNumber}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <div>
                <p>Khong co dia chi nao.</p>
                <Link className="button small" to="/addresses">Create address</Link>
              </div>
            )}
          </div>

          <div>
            <h3>Payment</h3>
            <label>
              Shipping method
              <select value={shippingMethod} onChange={(event) => setShippingMethod(event.target.value)}>
                {shippingOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Payment method
              <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                {paymentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Coupon code
              <input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="OPTIONAL" />
            </label>
            <div className="button-group">
              <button onClick={handlePreview}>Preview</button>
              <button onClick={handleCheckout}>Checkout</button>
            </div>

            {checkoutPreview && (
              <div className="preview-box">
                <h3>Preview</h3>
                <p>Shipping fee: {checkoutPreview.shippingFee?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
                <p>Discount: -{checkoutPreview.discountAmount?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
                <p>Grand total: {checkoutPreview.grandTotal?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
              </div>
            )}

            {orderResult && (
              <div className="preview-box">
                <h3>Order created</h3>
                <p>Order #{orderResult.orderId} created successfully.</p>
                <p>Status: {orderResult.status}</p>
              </div>
            )}
          </div>
        </div>
        {message && <div className="message">{message}</div>}
      </section>
    </main>
  );
}
