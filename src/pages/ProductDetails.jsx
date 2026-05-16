import { useParams, useNavigate } from "react-router-dom";
import { products } from "../data/products";

function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const product = products.find((p) => p.id === id);

  if (!product) return <p>Product not found</p>;

  return (
    <div className="px-10 py-20">
      <h1 className="text-4xl font-bold">{product.title}</h1>
      <p className="mt-4">{product.description}</p>

      <div className="mt-6 p-4 bg-gray-100 rounded">
        <h3 className="font-bold">Client Feedback</h3>
        <p>{product.feedback}</p>
      </div>

      <button
        onClick={() => navigate(`/checkout/${product.id}`)}
        className="mt-8 bg-black text-white px-6 py-3 rounded"
      >
        Proceed to Payment
      </button>
    </div>
  );
}

export default ProductDetails;
