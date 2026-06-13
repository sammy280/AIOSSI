import { useState } from 'react';
import { Plus, Star } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { formatCurrency, getImageUrl } from '../../lib/utils';
import { toast } from 'react-hot-toast';

export default function ProductCard({ product }) {
  const [noteModal, setNoteModal] = useState(false);
  const [note, setNote] = useState('');
  const { addItem } = useCartStore();

  const handleAdd = () => {
    if (!product.isAvailable) return;
    addItem(product, 1, note);
    toast.success(`${product.name} added to cart!`);
    setNote('');
    setNoteModal(false);
  };

  const imgUrl = getImageUrl(product.image);

  return (
    <>
      <div className="product-card group">
        {/* Image */}
        <div className="relative h-44 bg-gray-100 overflow-hidden">
          {imgUrl ? (
            <img src={imgUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">
              {product.category?.name?.toLowerCase().includes('drink') || product.category?.name?.toLowerCase().includes('beer') ? '🍺' : '🍽️'}
            </div>
          )}
          {!product.isAvailable && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">Unavailable</span>
            </div>
          )}
          {product.isFeatured && (
            <div className="absolute top-2 left-2 bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3" /> Featured
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight">{product.name}</h3>
            <span className="text-brand font-bold text-sm ml-2 shrink-0">{formatCurrency(product.price)}</span>
          </div>
          {product.description && (
            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{product.description}</p>
          )}
          <button
            onClick={() => product.isAvailable && setNoteModal(true)}
            disabled={!product.isAvailable}
            className="w-full flex items-center justify-center gap-2 py-2 bg-brand/10 text-brand font-semibold text-sm rounded-xl hover:bg-brand hover:text-white transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" /> Add to Cart
          </button>
        </div>
      </div>

      {/* Note Modal */}
      {noteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setNoteModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg mb-1">{product.name}</h3>
            <p className="text-sm text-gray-500 mb-4">{formatCurrency(product.price)}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Special Instructions (optional)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Less salt, extra sauce, no onions..."
                rows={3}
                className="input resize-none text-sm"
              />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={handleAdd} className="flex-1 btn-primary py-2.5 text-sm">Add to Cart</button>
              <button onClick={() => setNoteModal(false)} className="flex-1 py-2.5 border border-gray-200 rounded-2xl text-sm font-medium hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
