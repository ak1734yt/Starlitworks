import { useNavigate } from "react-router-dom";

function ProductCard({ product }) {
  const navigate = useNavigate();

  return (
<div
  onClick={() => navigate(`/product/${product.id}`)}
  className="cursor-pointer bg-white p-6 rounded-xl shadow hover:scale-105 transition"
>
  <p className="text-sm text-gray-500">{product.category}</p>
  <h3 className="text-xl font-bold mt-1">{product.title}</h3>
  <p className="text-gray-600 mt-2">{product.shortDescription}</p>

  <div className="mt-4 flex justify-between items-center">
    <span className="font-semibold">₹{product.price}</span>
    <span className="text-sm text-gray-500">{product.duration}</span>
  </div>
</div>

  );
}

export default ProductCard;
