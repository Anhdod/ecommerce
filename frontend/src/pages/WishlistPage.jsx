import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { assetUrl } from '../api';

export default function WishlistPage({ user }) {
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 5000);
  };

  const loadWishlist = async () => {
    try {
      const result = await api('/api/products/wishlist');
      setProducts(result.data || []);
    } catch (error) {
      showMessage(error?.message || 'Cannot load wishlist');
    }
  };

  const toggleLike = async (productId) => {
    try {
      await api(`/api/products/${productId}/like`, { method: 'POST' });
      showMessage('Updated');
      loadWishlist();
    } catch (error) {
      showMessage(error?.message || 'Cannot update wishlist');
    }
  };

  useEffect(() => {
    if (user) {
      loadWishlist();
    }
  }, [user]);

  if (!user) {
    return (
      <main className="page-shell">
        <section className="panel">
          <h2>Wishlist</h2>
          <p>Login required.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <section className="panel">
        <h2>Wishlist</h2>
        {products.length ? (
          <div className="product-grid">
            {products.map((product) => (
              <article className="card" key={product.id}>
                <div className="card-header">
                  <h3>{product.name}</h3>
                  <span className="tag">{product.categoryName}</span>
                </div>
                {product.imageUrl && <img className="product-image" src={assetUrl(product.imageUrl)} alt={product.name} />}
                <p>{product.description}</p>
                <p>
                  <strong>
                    {typeof product.price === 'number'
                      ? product.price.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })
                      : product.price}
                  </strong>
                </p>
                <p>Stock: {product.stockQuantity}</p>
                <p>Rating: {product.averageRating?.toFixed?.(1) || 0} / 5</p>
                <div className="card-actions">
                  <Link className="button small" to={`/products/${product.id}`}>
                    Details
                  </Link>
                  <button className="small" onClick={() => toggleLike(product.id)}>
                    Remove from wishlist
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>No liked products yet.</p>
        )}
        {message && <div className="message">{message}</div>}
      </section>
    </main>
  );
}
