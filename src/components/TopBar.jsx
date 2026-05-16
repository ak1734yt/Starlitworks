import { Link } from "react-router-dom";

function TopBar() {
  return (
    <header className="fixed top-0 left-0 w-full bg-white border-b z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        {/* Brand */}
        <div className="text-xl font-bold">
          <Link to="/">YourBrand</Link>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex gap-6 text-sm font-medium">
          <a href="#about" className="hover:text-gray-600">About</a>
          <a href="#products" className="hover:text-gray-600">Catalogue</a>
          <a href="#contact" className="hover:text-gray-600">Contact</a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className="text-sm font-medium hover:text-gray-600"
          >
            Login
          </Link>

          <button className="bg-black text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800 transition">
            Hire / Order
          </button>
        </div>

      </div>
    </header>
  );
}

export default TopBar;
