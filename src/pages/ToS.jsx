import { ShieldAlert, BookOpen, AlertCircle, FileText } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ToS() {
  return (
    <div className="min-h-screen bg-brand-bg text-white selection:bg-brand-primary/30">
      <Navbar />
      
      <main className="pt-32 pb-20 max-w-4xl mx-auto px-6">
        <header className="mb-16 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-brand-primary text-xs font-bold uppercase tracking-widest mx-auto">
            <BookOpen className="w-4 h-4" /> Legal
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-bold">Terms of Service</h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Please read these terms carefully before using our premium Discord services and infrastructure.
          </p>
        </header>

        <div className="space-y-12">
          
          <section className="glass-card p-8 md:p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <FileText className="w-32 h-32" />
            </div>
            
            <div className="space-y-8 relative z-10">
              <div>
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <span className="text-brand-primary font-mono text-sm">01.</span> Agreement to Terms
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  By accessing or using the Starlit Siege Works platform and services, you agree to be bound by these Terms. If you disagree with any part of the terms, you do not have permission to access the Service.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <span className="text-brand-primary font-mono text-sm">02.</span> Service Fulfillment
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm mb-3">
                  All services (bots, server setups, custom integrations) are digital goods. The development process typically involves:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm text-gray-400">
                  <li>Initial briefing and requirement gathering.</li>
                  <li>Payment processing (Full or Milestone-based).</li>
                  <li>Development and regular progress updates.</li>
                  <li>Final delivery and handover of ownership via the Starlit Vault.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <span className="text-brand-primary font-mono text-sm">03.</span> Payments & Refunds
                </h3>
                <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl mb-3 flex gap-3 items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-500/90 leading-relaxed">
                    Due to the custom nature of our development work, refunds are generally not provided once active development has commenced.
                  </p>
                </div>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Payments are securely verified before work begins. For large projects, we may offer milestone-based payment plans (e.g., 50% upfront, 50% upon completion).
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <span className="text-brand-primary font-mono text-sm">04.</span> Intellectual Property
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Upon full payment and final delivery, you receive the right to use the provided services/code for your community. Starlit Siege Works retains the right to reuse underlying architectural code across multiple projects unless an exclusivity agreement is signed.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                  <span className="text-brand-primary font-mono text-sm">05.</span> Support & Maintenance
                </h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Standard orders include 14 days of post-delivery bug-fixing support. Ongoing feature additions or maintenance requires a separate retainer agreement or new service request.
                </p>
              </div>
            </div>
          </section>

          <div className="text-center">
            <p className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
