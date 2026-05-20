import { useState, useEffect } from "react";
import { Sparkles, Hash, Volume2, Shield, ArrowRight, UserPlus, Info, Check, MessageSquare, X, Users, Folder } from "lucide-react";
import { getTemplates, purchaseTemplate } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Templates() {
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all" | "purchased"

  useEffect(() => {
    getTemplates()
      .then((data) => {
        setTemplates(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handlePurchase = async (templateId) => {
    if (!user) {
      openAuthModal("/templates", "login");
      return;
    }
    setPurchaseLoading(true);
    try {
      const res = await purchaseTemplate(templateId);
      if (res.success && res.order_id) {
        toast.success("Blueprint quote request submitted! Talk to us in the order chat to get your custom price.");
        navigate("/history");
      }
    } catch (err) {
      toast.error(err.message || "Failed to initiate template purchase.");
    } finally {
      setPurchaseLoading(false);
    }
  };

  const renderTemplateCard = (tpl) => {
    return (
      <div
        key={tpl.id}
        onClick={() => {
          window.open('/template/' + tpl.id, '_blank');
        }}
        className="p-5 rounded-2xl border text-left cursor-pointer transition-all duration-300 flex flex-col justify-between bg-brand-card border-brand-border hover:border-white/20"
      >
        <div>
          <div className="flex justify-between items-start gap-4 mb-2">
            <h4 className="font-bold text-white text-base leading-snug">{tpl.title}</h4>
            {tpl.has_purchased ? (
              <span className="font-mono font-bold text-green-400 shrink-0 text-xs px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20">Purchased</span>
            ) : (
              <span className="font-mono font-bold text-brand-secondary shrink-0 text-xs px-2 py-0.5 rounded bg-brand-secondary/10 border border-brand-secondary/20">Custom Price</span>
            )}
          </div>
          <p className="text-gray-400 text-xs leading-relaxed line-clamp-3 mb-4">
            {tpl.description}
          </p>
        </div>

        <div className="mt-auto space-y-4">
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-500 border-t border-white/5 pt-3">
            <span>👥 {tpl.roles?.length || 0} Roles</span>
            <span>📂 {tpl.channels?.length || 0} Channels</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-white/5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open('/template/' + tpl.id, '_blank');
              }}
              className="py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              Brief
            </button>
            {!tpl.has_purchased ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePurchase(tpl.id);
                }}
                className="py-2 px-3 bg-brand-primary hover:bg-brand-primary/95 rounded-xl text-white text-xs font-bold text-center transition-all"
              >
                By this template
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open('/template/' + tpl.id, '_blank');
                }}
                className="py-2 px-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-xl text-xs font-bold text-center transition-all"
              >
                Purchased
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Group channels by category for Discord layout
  const getGroupedChannels = (channels) => {
    const grouped = {};
    if (!channels) return grouped;
    channels.forEach((ch) => {
      const cat = ch.category || "General";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(ch);
    });
    return grouped;
  };

  return (
    <div className="min-h-screen bg-brand-bg relative overflow-hidden flex flex-col justify-between">
      <Navbar />
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-20 right-1/4 w-[400px] h-[400px] bg-brand-secondary/10 rounded-full blur-[120px] pointer-events-none" />

      <main className="max-w-7xl mx-auto px-6 pt-32 pb-24 w-full flex-1 relative z-10">
        
        {/* Title Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-brand-primary/30 text-xs font-mono font-black text-brand-primary uppercase tracking-widest mb-6">
            <Sparkles className="w-3.5 h-3.5" /> Discord Template Marketplace
          </div>
          <h2 className="font-display font-black text-4xl md:text-5xl lg:text-6xl leading-tight mb-6">
            Professional Discord layouts, <span className="text-gradient">cloned instantly</span>
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            Browse premium, pre-configured role structures, moderation permissions, and channel setups. Experience a real-time virtual Discord preview before purchasing.
          </p>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 font-mono text-sm">LOADING Blueprints...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-24 glass rounded-3xl border border-white/5 max-w-xl mx-auto">
            <Info className="w-12 h-12 text-brand-primary mx-auto mb-4 opacity-50" />
            <h4 className="font-bold text-lg text-white mb-2">No Templates Available</h4>
            <p className="text-gray-400 text-sm mb-6">Use the Discord Bot command <code className="bg-black/50 px-2 py-1 rounded text-brand-secondary">!savetemplate &lt;price&gt; &lt;template_link&gt; &lt;title&gt;</code> inside your guild to sync templates here.</p>
          </div>
        ) : (
          <>
            {/* Tab Selection */}
            {user && (
              <div className="flex justify-center mb-12 relative z-20">
                <div className="bg-[#0A0A0A]/80 backdrop-blur-md p-1.5 rounded-full border border-white/10 flex items-center shadow-2xl">
                  <button
                    onClick={() => {
                      setActiveTab("all");
                    }}
                    className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all ${
                      activeTab === "all" ? "bg-brand-primary text-white shadow-lg" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    All Blueprints
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("purchased");
                    }}
                    className={`px-8 py-2.5 rounded-full text-xs font-bold transition-all ${
                      activeTab === "purchased" ? "bg-brand-secondary text-white shadow-lg" : "text-gray-400 hover:text-white"
                    }`}
                  >
                    My Blueprints ({templates.filter(t => t.has_purchased).length})
                  </button>
                </div>
              </div>
            )}

            {activeTab === "purchased" && templates.filter(t => t.has_purchased).length === 0 ? (
              <div className="text-center py-24 glass rounded-3xl border border-white/5 max-w-xl mx-auto">
                <Sparkles className="w-12 h-12 text-brand-primary mx-auto mb-4 opacity-50" />
                <h4 className="font-bold text-lg text-white mb-2">No Purchased Blueprints Yet</h4>
                <p className="text-gray-400 text-sm mb-6">Select a Discord blueprint from our marketplace list, proceed to checkout, and it will instantly show up here.</p>
                <button onClick={() => { setActiveTab("all"); }} className="btn-primary py-2.5 px-6 text-xs font-bold">
                  Browse Marketplace
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-fade-in">
                <h3 className="font-display font-bold text-xl text-white mb-6">
                  {activeTab === "all" ? "Marketplace Blueprints" : "My Purchased Layouts"}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(activeTab === "all" ? templates : templates.filter(t => t.has_purchased)).map((tpl) => (
                    renderTemplateCard(tpl)
                  ))}
                </div>
              </div>
            )}
          </>
        )}

      </main>

      <Footer />
    </div>
  );
}
