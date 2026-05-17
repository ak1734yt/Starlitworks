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
import ToS            from "./pages/ToS";
import InvoiceDetail  from "./pages/InvoiceDetail";
import OAuthCallback  from "./pages/OAuthCallback";

// Silent analytics tracker for returning users
function PulseTracker() {
  const { user } = useAuth();
  
  useEffect(() => {
    const consent = localStorage.getItem('ssw_cookie_consent');
    const pulseSent = sessionStorage.getItem('ssw_pulse_session_sent');
    
    if (consent === 'true' && !pulseSent) {
      const sendPulse = async () => {
        try {
          // IP-based tracking as baseline
          const geoRes = await fetch('https://ipapi.co/json/');
          const geoData = await geoRes.json();
          
          const trackingData = {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            screen: `${window.screen.width}x${window.screen.height}`,
            language: navigator.language,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            ip: geoData.ip,
            city: geoData.city,
            region: geoData.region,
            country: geoData.country_name,
            org: geoData.org
          };

          const token = localStorage.getItem('ssw_token');
          await fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify(trackingData)
          });
          
          sessionStorage.setItem('ssw_pulse_session_sent', 'true');
        } catch (e) {}
      };
      sendPulse();
    }
  }, [user]);

  return null;
}

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
      <PulseTracker />
      <Routes>
        {/* Public */}
        <Route path="/"               element={<Home />} />
        <Route path="/about"          element={<About />} />
        <Route path="/login"          element={<Login />} />
        <Route path="/signup"         element={<SignUp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/oauth-callback"  element={<OAuthCallback />} />
        <Route path="/tos"            element={<ToS />} />

        {/* Protected — client */}
        <Route path="/shop"           element={<ProtectedRoute><Shop /></ProtectedRoute>} />
        <Route path="/service-request" element={<ProtectedRoute><ServiceRequest /></ProtectedRoute>} />
        <Route path="/create-invoice" element={<ProtectedRoute adminOnly><CreateInvoice /></ProtectedRoute>} />
        <Route path="/history"        element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/tracker"        element={<ProtectedRoute><InstallmentTracker /></ProtectedRoute>} />
        <Route path="/product/:id"    element={<ProtectedRoute><ProductDetails /></ProtectedRoute>} />
        <Route path="/checkout/:id"   element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
        <Route path="/invoice/:id"    element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
        <Route path="/checkout/invoice/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
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
