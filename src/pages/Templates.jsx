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
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
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
          setSelectedTemplate(tpl);
          setPreviewOpen(true);
        }}
        className={`p-5 rounded-2xl border text-left cursor-pointer transition-all duration-300 flex flex-col justify-between ${
          selectedTemplate?.id === tpl.id && previewOpen
            ? "bg-brand-primary/10 border-brand-primary/60 shadow-[0_0_20px_rgba(124,58,237,0.15)]"
            : "bg-brand-card border-brand-border hover:border-white/20"
        }`}
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
                setSelectedTemplate(tpl);
                setPreviewOpen(true);
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
                  setSelectedTemplate(tpl);
                  setPreviewOpen(true);
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
                      setSelectedTemplate(null);
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
                      setSelectedTemplate(null);
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
                <button onClick={() => { setActiveTab("all"); setSelectedTemplate(null); }} className="btn-primary py-2.5 px-6 text-xs font-bold">
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

        {/* Floating Centered Interactive Discord Mock Previewer Modal */}
        {previewOpen && selectedTemplate && (
          <div
            className="fixed inset-0 bg-[#060608]/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6 lg:p-10 animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) setPreviewOpen(false);
            }}
          >
            <div className="bg-[#0A0A0C] border border-white/10 rounded-[2rem] w-full max-w-7xl h-[85vh] lg:h-[90vh] shadow-2xl flex flex-col overflow-hidden text-[#dbdee1] relative animate-scale-in">
              {/* Top Header Bar */}
              <div className="h-16 border-b border-white/10 px-6 flex items-center justify-between shrink-0 bg-[#111214]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center font-bold text-brand-primary">
                    {selectedTemplate.title[0]}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm leading-none flex items-center gap-2">
                      {selectedTemplate.title}
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-black uppercase tracking-wider">
                        Virtual Preview
                      </span>
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {!selectedTemplate.has_purchased && (
                    <button
                      onClick={() => handlePurchase(selectedTemplate.id)}
                      className="px-5 py-2 bg-brand-primary hover:bg-brand-primary/90 rounded-xl text-white text-xs font-bold transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-1.5"
                    >
                      By this template
                    </button>
                  )}
                  <button
                    onClick={() => setPreviewOpen(false)}
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-white hover:text-red-400 transition-all"
                    title="Close Preview"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Split view (sidebar info + virtual Discord) */}
              <div className="flex-1 flex overflow-hidden flex-col lg:flex-row min-h-0">
                {/* Sidebar Panel */}
                <div className="w-full lg:w-80 border-b lg:border-b-0 lg:border-r border-white/10 p-6 flex flex-col justify-between shrink-0 bg-[#1e1f22] overflow-y-auto scrollbar-thin">
                  <div className="space-y-6">
                    <div>
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2">Blueprint Overview</span>
                      <h3 className="font-display font-black text-xl text-white leading-tight">{selectedTemplate.title}</h3>
                      <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                        {selectedTemplate.description}
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-4 space-y-3">
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">Specifications</span>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[10px] text-gray-500">Roles</p>
                          <p className="text-lg font-bold text-white font-mono">{selectedTemplate.roles?.length || 0}</p>
                        </div>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[10px] text-gray-500">Channels</p>
                          <p className="text-lg font-bold text-white font-mono">{selectedTemplate.channels?.length || 0}</p>
                        </div>
                      </div>
                    </div>

                    {/* Role preview pills */}
                    <div className="border-t border-white/5 pt-4 space-y-2">
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block">Roles Configured</span>
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                        {selectedTemplate.roles?.map((role, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border border-white/5 bg-white/5"
                            style={{ color: role.color !== '#000000' ? role.color : '#dbdee1' }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: role.color !== '#000000' ? role.color : '#dbdee1' }} />
                            {role.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Purchase Sidebar Footer Option */}
                  <div className="mt-6 pt-4 border-t border-white/5 shrink-0 space-y-3">
                    {!selectedTemplate.has_purchased ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-400">Pricing Tier:</span>
                          <span className="font-bold text-brand-secondary font-mono">Custom Pricing</span>
                        </div>
                        <button
                          onClick={() => handlePurchase(selectedTemplate.id)}
                          className="w-full btn-primary py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                        >
                          By this template
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                        <p className="text-green-400 text-xs font-bold flex items-center justify-center gap-1.5">
                          <Check className="w-4 h-4" /> Purchased Blueprint
                        </p>
                        <a
                          href={selectedTemplate.template_link}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-3 w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold text-xs transition-all"
                        >
                          Deploy to Discord
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Virtual Discord Mockup area - FULL SCREEN */}
                <div className="flex-1 bg-[#1e1f22] flex overflow-hidden relative">
                  {/* Panel 1: Guild list (Discord style) */}
                  <div className="w-16 bg-[#111214] py-3 flex flex-col items-center gap-2 shrink-0 border-r border-[#1a1b1e]">
                    <div className="w-12 h-12 bg-brand-primary rounded-3xl flex items-center justify-center font-bold text-white hover:rounded-2xl transition-all cursor-pointer shadow-lg shadow-brand-primary/30">
                      {selectedTemplate.title[0]}
                    </div>
                    <div className="w-8 h-[2px] bg-white/5 my-1" />
                    <div className="w-12 h-12 bg-white/5 rounded-3xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-brand-primary/20 hover:rounded-2xl transition-all cursor-pointer">
                      <UserPlus className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Panel 2: Channel list panel */}
                  <div className="w-60 bg-[#2b2d31] flex flex-col shrink-0 text-left border-r border-[#1e1f22] overflow-hidden">
                    <div className="h-12 border-b border-[#1f2023] flex items-center justify-between px-4 font-bold text-white text-sm shrink-0">
                      <span className="truncate">{selectedTemplate.title}</span>
                      <Shield className="w-4 h-4 text-brand-primary shrink-0" />
                    </div>
                    
                    {/* Channel Categories & Channels - Fully scrollable */}
                    <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-thin scrollbar-thumb-white/5">
                      {Object.entries(getGroupedChannels(selectedTemplate.channels)).map(([category, chs]) => (
                        <div key={category} className="space-y-0.5">
                          <p className="text-[11px] font-bold text-[#949ba4] uppercase tracking-wider px-2 py-1 truncate">
                            {category}
                          </p>
                          {chs.map((ch, idx) => (
                            <div
                              key={idx}
                              className="group flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-white/5 text-[#949ba4] hover:text-[#dbdee1] cursor-pointer text-sm transition-all"
                            >
                              {ch.type === "voice" ? (
                                <Volume2 className="w-4 h-4 shrink-0 text-gray-500" />
                              ) : (
                                <Hash className="w-4 h-4 shrink-0 text-gray-500" />
                              )}
                              <span className="truncate text-xs font-semibold leading-none">{ch.name}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Panel 3: Chat panel */}
                  <div className="flex-1 bg-[#313338] flex flex-col min-w-0 overflow-hidden">
                    <div className="h-12 border-b border-[#1f2023] flex items-center px-4 gap-2 text-[#dbdee1] font-bold text-sm shrink-0">
                      <Hash className="w-4 h-4 text-gray-500" />
                      <span>welcome-rules</span>
                    </div>

                    <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
                      
                      {/* Virtual Welcomer */}
                      <div className="space-y-6">
                        <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-left max-w-xl">
                          <div className="w-12 h-12 rounded-xl bg-brand-primary/20 flex items-center justify-center text-brand-primary mb-4">
                            <Sparkles className="w-6 h-6" />
                          </div>
                          <h4 className="font-display font-black text-xl text-white mb-2">Welcome to {selectedTemplate.title}!</h4>
                          <p className="text-[#dbdee1] text-xs leading-relaxed mb-4">
                            This is an interactive preview of the server layout. You can inspect the channel organization, roles list, and permission hierarchy before installing this theme.
                          </p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {selectedTemplate.roles?.map((role, idx) => (
                              <div
                                key={idx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border border-white/5 bg-white/5"
                                style={{ color: role.color !== '#000000' ? role.color : '#e0e0e0' }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: role.color !== '#000000' ? role.color : '#e0e0e0' }} />
                                {role.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Mock Text Input */}
                      <div className="mt-4 shrink-0">
                        <div className="w-full bg-[#383a40] text-[#949ba4] px-4 py-2.5 rounded-lg text-xs font-semibold select-none flex items-center justify-between border border-transparent hover:border-white/5 cursor-not-allowed">
                          <span>Message #welcome-rules (Virtual Preview Mode Only)</span>
                          <MessageSquare className="w-4 h-4 opacity-35" />
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Panel 4: Roles panel - Fully scrollable */}
                  <div className="w-44 bg-[#2b2d31] shrink-0 text-left p-3 hidden md:flex flex-col border-l border-[#1e1f22] overflow-hidden">
                    <p className="text-[10px] font-bold text-[#949ba4] uppercase tracking-wider mb-3 px-1 shrink-0">
                      Roles ({selectedTemplate.roles?.length || 0})
                    </p>
                    <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
                      {selectedTemplate.roles?.map((role, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5 text-[#dbdee1] text-xs font-semibold cursor-default"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: role.color !== '#000000' ? role.color : '#949ba4' }}
                          />
                          <span className="truncate">{role.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
