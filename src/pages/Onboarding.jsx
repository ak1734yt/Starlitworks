import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveOnboarding } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { 
  MessageSquare, Shield, Settings, DollarSign, Calendar, Sparkles, 
  Gamepad2, Users, Rocket, Brain, Landmark, ChevronRight, ChevronLeft, CheckCircle2 
} from "lucide-react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { toast } from "react-hot-toast";

const GENRES = [
  { id: "gaming", label: "Gaming & Esports", icon: Gamepad2, desc: "Guilds, tournaments, game bots & clip sharing channels." },
  { id: "creator", label: "Content Creator", icon: Brain, desc: "Twitch/YouTube notifications, fans role setups & sub channels." },
  { id: "community", label: "Community Hub", icon: Users, desc: "General chat, interactive engagement systems & member lobbies." },
  { id: "business", label: "Corporate & Team", icon: Landmark, desc: "Restricted role directories, file sharing, and workspace rules." },
  { id: "crypto", label: "NFT & Crypto Web3", icon: Rocket, desc: "Token gated verifications, trading news feeds & wallet verifier rules." }
];

const BUDGETS = [
  { id: "under_10k", label: "Under ₹10,000", desc: "Core setup with basic roles & standard open-source bots." },
  { id: "10k_30k", label: "₹10,000 - ₹30,000", desc: "Custom configuration, customized embeds, basic custom bots." },
  { id: "30k_50k", label: "₹30,000 - ₹50,000", desc: "Advanced systems, custom dashboard portal, dedicated custom bots." },
  { id: "above_50k", label: "₹50,000+ Custom Blueprint", desc: "Full-scale corporate infrastructure, bespoke API integrations & bot farms." }
];

const TIMELINES = [
  { id: "express", label: "Express (Under 1 week)", desc: "High priority development queue." },
  { id: "standard", label: "Standard (1 - 2 weeks)", desc: "Standard development & testing roadmap." },
  { id: "flexible", label: "Flexible (2+ weeks)", desc: "Extended testing & iterative features setup." }
];

export default function Onboarding() {
  const { user, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form State
  const [discordUsername, setDiscordUsername] = useState("");
  const [serverGenre, setServerGenre] = useState("");
  const [customizationDetails, setCustomizationDetails] = useState("");
  const [budget, setBudget] = useState("");
  const [timeline, setTimeline] = useState("");

  const handleNext = () => {
    if (step === 1 && !discordUsername.trim()) {
      toast.error("Please enter your Discord tag.");
      return;
    }
    if (step === 2 && !serverGenre) {
      toast.error("Please select a community niche.");
      return;
    }
    if (step === 3 && customizationDetails.trim().length < 15) {
      toast.error("Please provide slightly more details (at least 15 characters).");
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!budget) {
      toast.error("Please select your budget preference.");
      return;
    }
    if (!timeline) {
      toast.error("Please select your project timeline.");
      return;
    }

    setLoading(true);
    try {
      await saveOnboarding({
        discord_username: discordUsername,
        server_genre: serverGenre,
        customization_details: customizationDetails,
        budget: budget,
        timeline: timeline
      });
      await refreshMe();
      toast.success("Welcome aboard! Onboarding details saved successfully.");
      navigate("/shop");
    } catch (err) {
      toast.error(err.message || "Failed to submit onboarding questionnaire.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg relative overflow-hidden flex flex-col justify-between">
      <Navbar />
      
      {/* Background Gradients */}
      <div className="absolute top-10 left-10 w-[600px] h-[600px] bg-brand-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[500px] h-[500px] bg-brand-secondary/10 rounded-full blur-[140px] pointer-events-none" />

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24 w-full flex-1 relative z-10 flex flex-col justify-center">
        
        {/* Progress Tracker */}
        <div className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-mono font-bold text-brand-primary tracking-widest uppercase">
              Questionnaire Phase {step} of 4
            </span>
            <span className="text-xs font-mono text-gray-500">
              {Math.round(((step - 1) / 3) * 100)}% Completed
            </span>
          </div>
          <div className="w-full bg-white/5 h-2.5 rounded-full overflow-hidden border border-white/5 p-[2px]">
            <div 
              className="bg-gradient-to-r from-brand-primary to-brand-secondary h-full rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(124,58,237,0.3)]"
              style={{ width: `${((step - 1) / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Wizard Card */}
        <div className="glass-card p-8 md:p-12 relative overflow-hidden rounded-[2.5rem]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-3xl pointer-events-none" />
          
          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            
            {/* Step 1: Discord Details */}
            {step === 1 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl text-brand-primary">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h2 className="font-display font-black text-3xl text-white">Let's connect on Discord</h2>
                  <p className="text-gray-400 text-sm">
                    How should our development bots and server engineers address you? Please provide your Discord handle.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Discord Username
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. wumpus#1337 or @wumpus"
                    value={discordUsername}
                    onChange={(e) => setDiscordUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white text-base outline-none focus:border-brand-primary focus:shadow-[0_0_20px_rgba(124,58,237,0.1)] transition-all font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Make sure to input a valid username so our bot can associate templates with your account automatically.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Niche / Category */}
            {step === 2 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl text-brand-primary">
                    <Gamepad2 className="w-6 h-6" />
                  </div>
                  <h2 className="font-display font-black text-3xl text-white">Choose your community niche</h2>
                  <p className="text-gray-400 text-sm">
                    Select the genre that matches your project goals. This helps us pre-configure relevant roles and override structures.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {GENRES.map((g) => {
                    const Icon = g.icon;
                    const isSelected = serverGenre === g.id;
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setServerGenre(g.id)}
                        className={`flex items-start text-left p-5 rounded-2xl border transition-all duration-300 ${
                          isSelected 
                            ? "bg-brand-primary/10 border-brand-primary shadow-[0_0_20px_rgba(124,58,237,0.1)]" 
                            : "bg-white/[0.02] border-white/5 hover:border-white/15"
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl mr-4 ${isSelected ? "bg-brand-primary text-white" : "bg-white/5 text-gray-400"}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm mb-1">{g.label}</h4>
                          <p className="text-xs text-gray-400 leading-relaxed">{g.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Requirements */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="inline-flex p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl text-brand-primary">
                    <Settings className="w-6 h-6" />
                  </div>
                  <h2 className="font-display font-black text-3xl text-white">Outline custom features</h2>
                  <p className="text-gray-400 text-sm">
                    Briefly describe the bots, systems, and roles you need (e.g., ticket systems, level rewards, twitch feeds, payment verification).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
                    Project Requirements
                  </label>
                  <textarea
                    rows={6}
                    placeholder="e.g. I need a premium esports server. It should have automatic tournament bracket roles, a ticket lobby, anti-raid verification, and a custom welcome bot..."
                    value={customizationDetails}
                    onChange={(e) => setCustomizationDetails(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white text-sm outline-none focus:border-brand-primary transition-all leading-relaxed"
                  />
                  <div className="flex justify-between mt-2 text-xs text-gray-500 font-mono">
                    <span>Minimum 15 characters</span>
                    <span>{customizationDetails.length} characters</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Budget & Timeline */}
            {step === 4 && (
              <div className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="inline-flex p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl text-brand-primary">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <h2 className="font-display font-black text-3xl text-white">Budget & timeline</h2>
                    <p className="text-gray-400 text-sm">
                      Select your preferred pricing tiers and deployment speed to match our team allocations.
                    </p>
                  </div>

                  {/* Budget Selector */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Estimated Project Budget
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {BUDGETS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => setBudget(b.id)}
                          className={`flex items-start text-left p-4 rounded-xl border text-xs transition-all ${
                            budget === b.id 
                              ? "bg-brand-primary/10 border-brand-primary text-white" 
                              : "bg-white/[0.02] border-white/5 hover:border-white/10"
                          }`}
                        >
                          <div className="mr-3 mt-0.5">
                            <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${budget === b.id ? "border-brand-primary" : "border-gray-500"}`}>
                              {budget === b.id && <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />}
                            </div>
                          </div>
                          <div>
                            <span className="font-bold text-white block mb-0.5">{b.label}</span>
                            <span className="text-gray-500 leading-relaxed">{b.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Timeline Selector */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Preferred Timeline
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {TIMELINES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTimeline(t.id)}
                          className={`flex flex-col text-left p-4 rounded-xl border text-xs transition-all ${
                            timeline === t.id 
                              ? "bg-brand-primary/10 border-brand-primary text-white" 
                              : "bg-white/[0.02] border-white/5 hover:border-white/10"
                          }`}
                        >
                          <span className="font-bold text-white block mb-1">{t.label}</span>
                          <span className="text-gray-500 leading-relaxed">{t.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-white/5">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-2 py-3 px-6 rounded-xl border border-white/10 text-gray-400 hover:text-white transition-all text-xs font-bold"
                >
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="btn-primary flex items-center gap-2 py-3 px-6 text-xs font-bold"
                >
                  Next Step <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary flex items-center gap-2 py-3 px-8 text-xs font-bold"
                >
                  {loading ? "Submitting..." : "Complete Onboarding"}
                  <CheckCircle2 className="w-4 h-4" />
                </button>
              )}
            </div>

          </form>
        </div>

      </main>

      <Footer />
    </div>
  );
}
