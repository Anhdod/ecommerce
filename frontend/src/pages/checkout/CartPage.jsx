import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, Minus, PackageCheck, Plus, RefreshCw, ShieldCheck, ShoppingBag, Trash2, Truck } from 'lucide-react';
import api, { assetUrl } from '../../api';
import { formatVnd as currency } from '../../utils/currency';
import './CartPage.css';

export default function CartPage({ user }) {
  const [cart, setCart] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedCartItemIds, setSelectedCartItemIds] = useState([]);

  const itemCount = useMemo(
    () => cart?.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || 0,
    [cart]
  );

  const selectedItems = useMemo(() => {
    const selectedIds = new Set(selectedCartItemIds);
    return (cart?.items || []).filter((item) => selectedIds.has(item.cartItemId));
  }, [cart, selectedCartItemIds]);

  const selectedTotal = useMemo(
    () => selectedItems.reduce((total, item) => total + Number(item.subtotal || 0), 0),
    [selectedItems]
  );

  const allSelected = Boolean(cart?.items?.length) && selectedItems.length === cart.items.length;

  const checkoutPath = useMemo(() => {
    const params = new URLSearchParams();
    selectedItems.forEach((item) => params.append('cartItemIds', String(item.cartItemId)));
    return `/checkout?${params.toString()}`;
  }, [selectedItems]);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 4000);
  };

  const loadCart = async () => {
    setLoading(true);
    try {
      const result = await api('/api/cart');
      setCart(result.data);
      setSelectedCartItemIds((current) => {
        const availableIds = (result.data?.items || []).map((item) => item.cartItemId);
        return current.filter((cartItemId) => availableIds.includes(cartItemId));
      });
    } catch (error) {
      showMessage(error?.message || 'Không tải được giỏ hàng');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (cartItemId, quantity) => {
    if (quantity < 1 || updatingId) return;
    try {
      setUpdatingId(cartItemId);
      const result = await api(`/api/cart/update/${cartItemId}?quantity=${quantity}`, { method: 'PUT' });
      setCart(result.data);
      showMessage('Đã cập nhật số lượng');
    } catch (error) {
      showMessage(error?.message || 'Không cập nhật được số lượng');
    } finally {
      setUpdatingId(null);
    }
  };

  const removeItem = async (cartItemId) => {
    if (updatingId) return;
    try {
      setUpdatingId(cartItemId);
      const result = await api(`/api/cart/remove/${cartItemId}`, { method: 'DELETE' });
      setCart(result.data);
      setSelectedCartItemIds((current) => current.filter((id) => id !== cartItemId));
      showMessage('Đã xóa sản phẩm khỏi giỏ hàng');
    } catch (error) {
      showMessage(error?.message || 'Không xóa được sản phẩm');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateColor = async (cartItemId, productId, selectedColor) => {
    if (!selectedColor || updatingId) return;
    try {
      setUpdatingId(cartItemId);
      const params = new URLSearchParams({ selectedColor });
      const result = await api(`/api/cart/update-color/${cartItemId}?${params.toString()}`, { method: 'PUT' });
      setCart(result.data);
      setSelectedCartItemIds((current) => {
        const wasSelected = current.includes(cartItemId);
        const availableIds = (result.data?.items || []).map((item) => item.cartItemId);
        const next = current.filter((id) => availableIds.includes(id));
        const mergedItem = (result.data?.items || []).find(
          (item) => item.productId === productId && item.selectedColor === selectedColor
        );
        return wasSelected && mergedItem && !next.includes(mergedItem.cartItemId)
          ? [...next, mergedItem.cartItemId]
          : next;
      });
      showMessage('Đã cập nhật màu sắc');
    } catch (error) {
      showMessage(error?.message || 'Không cập nhật được màu sắc');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateVariant = async (cartItemId, productId, variantId) => {
    if (!variantId || updatingId) return;
    try {
      setUpdatingId(cartItemId);
      const params = new URLSearchParams({ variantId: String(variantId) });
      const result = await api(`/api/cart/update-variant/${cartItemId}?${params.toString()}`, { method: 'PUT' });
      setCart(result.data);
      setSelectedCartItemIds((current) => {
        const wasSelected = current.includes(cartItemId);
        const availableIds = (result.data?.items || []).map((item) => item.cartItemId);
        const next = current.filter((id) => availableIds.includes(id));
        const mergedItem = (result.data?.items || []).find(
          (item) => Number(item.productId) === Number(productId) && Number(item.variantId) === Number(variantId)
        );
        return wasSelected && mergedItem && !next.includes(mergedItem.cartItemId)
          ? [...next, mergedItem.cartItemId]
          : next;
      });
      showMessage('Đã cập nhật phiên bản');
    } catch (error) {
      showMessage(error?.message || 'Không cập nhật được phiên bản');
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    if (user) loadCart();
  }, [user]);

  const toggleCartItem = (cartItemId) => {
    setSelectedCartItemIds((current) => {
      return current.includes(cartItemId) ? current.filter((id) => id !== cartItemId) : [...current, cartItemId];
    });
  };

  const toggleAll = () => {
    setSelectedCartItemIds(allSelected ? [] : (cart?.items || []).map((item) => item.cartItemId));
  };

  if (!user) {
    return (
      <main className="cart-page">
        <section className="cart-auth-state">
          <span><ShoppingBag size={34} /></span>
          <h1>Giỏ hàng đang chờ bạn</h1>
          <p>Đăng nhập để xem sản phẩm đã chọn và tiếp tục thanh toán.</p>
          <div>
            <Link className="cart-primary-link" to="/login">Đăng nhập</Link>
            <Link className="cart-secondary-link" to="/">Tiếp tục mua sắm</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="cart-page antialiased">
      <div className="cart-container">
        <div className="cart-topbar">
          <Link to="/"><ArrowLeft size={16} /> Tiếp tục mua sắm</Link>
          <button type="button" onClick={loadCart} disabled={loading} title="Làm mới giỏ hàng">
            <RefreshCw size={17} className={loading ? 'spinning' : ''} /> Làm mới
          </button>
        </div>

        <header className="cart-heading">
          <div>
            <span>Đơn hàng của bạn</span>
            <h1>Giỏ hàng</h1>
          </div>
          <p>{itemCount} sản phẩm</p>
        </header>

        {loading && !cart ? (
          <div className="cart-layout">
            <div className="cart-loading-list">{[1, 2, 3].map((value) => <span key={value} />)}</div>
            <div className="cart-loading-summary" />
          </div>
        ) : cart?.items?.length ? (
          <div className="cart-layout">
            <motion.section className="cart-product-list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="cart-selection-toolbar">
                <label><input type="checkbox" checked={allSelected} onChange={toggleAll} /> Chọn tất cả</label>
                <span>Đã chọn {selectedItems.length}/{cart.items.length} mặt hàng</span>
              </div>
              {cart.items.map((item) => (
                <article className={`cart-product-row ${selectedCartItemIds.includes(item.cartItemId) ? 'selected' : ''}`} key={item.cartItemId}>
                  <label className="cart-item-checkbox" title={`Chọn ${item.productName}`}>
                    <input type="checkbox" checked={selectedCartItemIds.includes(item.cartItemId)} onChange={() => toggleCartItem(item.cartItemId)} />
                  </label>
                  <Link className="cart-product-image" to={`/products/${item.productId}`}>
                    {item.imageUrl ? <img src={assetUrl(item.imageUrl)} alt={item.productName} /> : <ShoppingBag size={36} />}
                  </Link>
                  <div className="cart-product-info">
                    <span>Sản phẩm</span>
                    <Link to={`/products/${item.productId}`}>{item.productName}</Link>
                    {item.availableVariants?.length > 0 ? (
                      <label className="cart-product-variant">
                        <span>Phiên bản</span>
                        <select
                          value={item.variantId || ''}
                          onChange={(event) => updateVariant(item.cartItemId, item.productId, event.target.value)}
                          disabled={updatingId === item.cartItemId}
                          aria-label={`Chọn phiên bản cho ${item.productName}`}
                        >
                          {!item.variantId && <option value="">Chọn phiên bản</option>}
                          {item.availableVariants.map((variant) => <option value={variant.id} disabled={Number(variant.stockQuantity) <= 0} key={variant.id}>{variant.name || variant.sku} · {variant.sku} ({variant.stockQuantity})</option>)}
                        </select>
                      </label>
                    ) : item.availableColors?.length > 0 && (
                      <label className="cart-product-variant">
                        <span>Màu</span>
                        <select
                          value={item.selectedColor || ''}
                          onChange={(event) => updateColor(item.cartItemId, item.productId, event.target.value)}
                          disabled={updatingId === item.cartItemId}
                          aria-label={`Chọn màu cho ${item.productName}`}
                        >
                          {!item.selectedColor && <option value="">Chọn màu</option>}
                          {item.availableColors.map((color) => <option value={color} key={color}>{color}</option>)}
                        </select>
                      </label>
                    )}
                    {item.sku && <small className="cart-product-sku">SKU: {item.sku}</small>}
                    <strong>{currency(item.price)}</strong>
                  </div>
                  <div className="cart-quantity">
                    <span>Số lượng</span>
                    <div>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        disabled={item.quantity <= 1 || updatingId === item.cartItemId}
                        aria-label="Giảm số lượng"
                      ><Minus size={15} /></button>
                      <strong>{item.quantity}</strong>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        disabled={updatingId === item.cartItemId}
                        aria-label="Tăng số lượng"
                      ><Plus size={15} /></button>
                    </div>
                  </div>
                  <div className="cart-line-total">
                    <span>Thành tiền</span>
                    <strong>{currency(item.subtotal)}</strong>
                  </div>
                  <button
                    className="cart-remove-button"
                    type="button"
                    onClick={() => removeItem(item.cartItemId)}
                    disabled={updatingId === item.cartItemId}
                    aria-label={`Xóa ${item.productName}`}
                    title="Xóa sản phẩm"
                  ><Trash2 size={18} /></button>
                </article>
              ))}
            </motion.section>

            <aside className="cart-order-summary">
              <h2>Tóm tắt đơn hàng</h2>
              <div className="summary-row"><span>{selectedItems.length} mặt hàng đã chọn</span><strong>{currency(selectedTotal)}</strong></div>
              <div className="summary-row"><span>Phí vận chuyển</span><span>Tính ở bước sau</span></div>
              <div className="summary-divider" />
              <div className="summary-total"><span>Tổng cộng</span><strong>{currency(selectedTotal)}</strong></div>
              <small>Đã bao gồm thuế nếu có.</small>
              {selectedItems.length
                ? <Link className="checkout-button" to={checkoutPath}>Thanh toán ({selectedItems.length}) <ArrowRight size={18} /></Link>
                : <span className="checkout-button disabled">Chọn sản phẩm để thanh toán <ArrowRight size={18} /></span>}
              <div className="cart-assurances">
                <span><ShieldCheck size={17} /> Thanh toán an toàn</span>
                <span><Truck size={17} /> Giao hàng có theo dõi</span>
                <span><PackageCheck size={17} /> Hỗ trợ đổi trả</span>
              </div>
            </aside>
          </div>
        ) : (
          <section className="cart-empty-state">
            <span><ShoppingBag size={36} /></span>
            <h2>Giỏ hàng đang trống</h2>
            <p>Khám phá cửa hàng và chọn sản phẩm phù hợp với bạn.</p>
            <Link to="/">Khám phá sản phẩm <ArrowRight size={17} /></Link>
          </section>
        )}
      </div>

      <AnimatePresence>
        {message && (
          <motion.div className="cart-toast" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
            <Check size={18} /> {message}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
