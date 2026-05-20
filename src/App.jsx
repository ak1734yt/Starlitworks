import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import TransitionScreen from "./components/TransitionScreen";
import AuthModal from "./components/AuthModal";
import { useAuth } from "./context/AuthContext";
import CookieConsent from "./components/CookieConsent";
import ChatBubble from "./components/ChatBubble";
import ParticlesBg from "./components/ParticlesBg";




const Home           = lazy(() => import("./pages/Home"));
const About          = lazy(() => import("./pages/About"));
const Shop           = lazy(() => import("./pages/Shop"));
const CreateInvoice  = lazy(() => import("./pages/CreateInvoice"));
const History        = lazy(() => import("./pages/History"));
const InstallmentTracker = lazy(() => import("./pages/InstallmentTracker"));
const ProductDetails = lazy(() => import("./pages/ProductDetails"));
const Checkout       = lazy(() => import("./pages/Checkout"));
const Login          = lazy(() => import("./pages/Login"));
const SignUp         = lazy(() => import("./pages/SignUp"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ServiceRequest = lazy(() => import("./pages/ServiceRequest"));
const Admin          = lazy(() => import("./pages/Admin"));
const Manager        = lazy(() => import("./pages/Manager"));
const Profile        = lazy(() => import("./pages/Profile"));
const ToS            = lazy(() => import("./pages/ToS"));
const InvoiceDetail  = lazy(() => import("./pages/InvoiceDetail"));
const OAuthCallback  = lazy(() => import("./pages/OAuthCallback"));
const Status         = lazy(() => import("./pages/Status"));
const PortfolioPage  = lazy(() => import("./pages/PortfolioPage"));
const Help           = lazy(() => import("./pages/Help"));
const Templates      = lazy(() => import("./pages/Templates"));
const Blog           = lazy(() => import("./pages/Blog"));
const BlogDetail     = lazy(() => import("./pages/BlogDetail"));
const FAQ            = lazy(() => import("./pages/FAQ"));
const Onboarding     = lazy(() => import("./pages/Onboarding"));

const RouteLoader = () => (
  <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center">
    <div className="relative w-16 h-16 mb-4">
      <div className="absolute inset-0 border-4 border-brand-primary/20 rounded-full animate-pulse"></div>
      <div className="absolute inset-0 border-4 border-brand-primary rounded-full border-t-transparent animate-spin"></div>
    </div>
    <p className="text-white/50 text-xs tracking-[0.2em] font-mono animate-pulse uppercase">Initializing Environment...</p>
  </div>
);

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
      <ParticlesBg />
      <TransitionScreen show={showTransition} />
      <AuthModal />
      <CookieConsent />
      <PulseTracker />
      {!['/login', '/signup'].includes(pathname) && <ChatBubble />}
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/"               element={<Home />} />
          <Route path="/about"          element={<About />} />
          <Route path="/login"          element={<Login />} />
          <Route path="/signup"         element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/oauth-callback"  element={<OAuthCallback />} />
          <Route path="/tos"            element={<ToS />} />
          <Route path="/status"         element={<Status />} />
          <Route path="/portfolio"      element={<PortfolioPage />} />
          <Route path="/help"           element={<Help />} />
          <Route path="/templates"      element={<Templates />} />
          <Route path="/faq"            element={<FAQ />} />
          <Route path="/blog"           element={<Blog />} />
          <Route path="/blog/:slug"     element={<BlogDetail />} />
  
          {/* Protected — client */}
          <Route path="/shop"           element={<ProtectedRoute><Shop /></ProtectedRoute>} />
          <Route path="/service-request" element={<ProtectedRoute><ServiceRequest /></ProtectedRoute>} />
          <Route path="/create-invoice" element={<ProtectedRoute adminOnly><CreateInvoice /></ProtectedRoute>} />
          <Route path="/history"        element={<ProtectedRoute><History /></ProtectedRoute>} />
          <Route path="/tracker"        element={<ProtectedRoute><InstallmentTracker /></ProtectedRoute>} />
          <Route path="/product/:id"    element={<ProtectedRoute><ProductDetails /></ProtectedRoute>} />
          <Route path="/checkout/:id"   element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/invoice/:id"    element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
          <Route path="/checkout/invoice/:id" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
          <Route path="/profile"        element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/onboarding"     element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
  
          {/* Protected — admin/manager */}
          <Route path="/admin"          element={<ProtectedRoute adminOnly><Admin /></ProtectedRoute>} />
          <Route path="/manager"        element={<ProtectedRoute managerOnly><Manager /></ProtectedRoute>} />
        </Routes>
      </Suspense>
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
