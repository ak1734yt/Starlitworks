import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import TransitionScreen from "./components/TransitionScreen";
import AuthModal from "./components/AuthModal";
import { useAuth } from "./context/AuthContext";
import CookieConsent from "./components/CookieConsent";

import Home           from "./pages/Home";
import About          from "./pages/About";
import Shop           from "./pages/Shop";
import CreateInvoice  from "./pages/CreateInvoice";
import History        from "./pages/History";
import InstallmentTracker from "./pages/InstallmentTracker";
import ProductDetails from "./pages/ProductDetails";
import Checkout       from "./pages/Checkout";
import Login          from "./pages/Login";
import SignUp         from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ServiceRequest from "./pages/ServiceRequest";
import Admin          from "./pages/Admin";
import Manager        from "./pages/Manager";
import Profile        from "./pages/Profile";

// Inner wrapper so we can access AuthContext for global overlays
function AppInner() {
  const { showTransition } = useAuth();
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);
  return (
    <>
      <TransitionScreen show={showTransition} />
      <AuthModal />
      <CookieConsent />
      <Routes>
        {/* Public */}
        <Route path="/"               element={<Home />} />
        <Route path="/about"          element={<About />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/signup"         element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected — client */}
        <Route path="/shop"           element={<ProtectedRoute><Shop /></ProtectedRoute>} />
        <Route path="/service-request" element={<ProtectedRoute><ServiceRequest /></ProtectedRoute>} />
        <Route path="/create-invoice" element={<ProtectedRoute adminOnly><CreateInvoice /></ProtectedRoute>} />
        <Route path="/history"        element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/tracker"        element={<ProtectedRoute><InstallmentTracker /></ProtectedRoute>} />
        <Route path="/product/:id"    element={<ProtectedRoute><ProductDetails /></ProtectedRoute>} />
        <Route path="/checkout/:id"   element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/profile"        element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Protected — admin/manager */}
        <Route path="/admin"          element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
        <Route path="/manager"        element={<ProtectedRoute managerOnly><Manager /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
