import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function CartPage({ user }) {
  const [cart, setCart] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadCart = async () => {
    setLoading(true);
    try {
      const result = await api('/api/cart');
      setCart(result.data);
    } catch (error) {
      showMessage(error?.message || 'Khong tai duoc gio hang');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity < 1) return;
    try {
      const result = await api(`/api/cart/update/${productId}?quantity=${quantity}`, { method: 'PUT' });
      setCart(result.data);
      showMessage('Cap nhat so luong thanh cong');
    } catch (error) {
      showMessage(error?.message || 'Khong cap nhat duoc so luong');
    }
  };

  const removeItem = async (productId) => {
    try {
      const result = await api(`/api/cart/remove/${productId}`, { method: 'DELETE' });
      setCart(result.data);
      showMessage('Da xoa san pham khoi gio hang');
    } catch (error) {
      showMessage(error?.message || 'Khong xoa duoc san pham');
    }
  };

  useEffect(() => {
    if (user) {
      loadCart();
    }
  }, [user]);

  if (!user) {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Gio hang</h2>
          <p>Dang nhap de xem va quan ly gio hang.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel">
        <div className="card-header">
          <h2>Shopping Cart</h2>
          <button className="small" onClick={loadCart} disabled={loading}>
            Refresh
          </button>
        </div>
        {loading ? (
          <p>Loading cart...</p>
        ) : cart?.items?.length ? (
          <>
            <ul className="cart-list">
              {cart.items.map((item) => (
                <li key={item.productId} className="cart-item">
                  <div>
                    <strong>{item.productName}</strong>
                    <p>Price: {item.price?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
                    <p>Subtotal: {item.subtotal?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
                  </div>
                  <div className="cart-actions">
                    <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
                    <button className="small" onClick={() => removeItem(item.productId)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart-summary">
              <p>Total: {cart.totalPrice?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}</p>
              <Link className="button" to="/checkout">
                Go to Checkout
              </Link>
            </div>
          </>
        ) : (
          <p>Gio hang trong</p>
        )}
        {message && <div className="message">{message}</div>}
      </section>
    </main>
  );
}
