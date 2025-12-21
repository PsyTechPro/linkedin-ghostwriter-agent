import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, MessageSquare, Calendar, ArrowRight, Check } from "lucide-react";
import { useAuth } from "../App";

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, voiceProfile } = useAuth();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      if (voiceProfile) {
        navigate("/dashboard");
      } else {
        navigate("/onboarding");
      }
    } else {
      navigate("/auth");
    }
  };

  const features = [
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Voice Profile",
      description: "Learns your unique tone, structure, and style from your past posts"
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: "Any Topic",
      description: "Type any idea—no category limits. Get posts that sound like you"
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: "Weekly Draft Pack",
      description: "Generate 5 ready-to-publish drafts instantly. Edit, save, post"
    }
  ];

  const sampleInput = `Here's what I learned after leading 50+ product launches:

Speed beats perfection. Every single time.

The teams that shipped weekly crushed the teams that planned quarterly.

Not because they were smarter. Because they learned faster.

---

Unpopular opinion: Your morning routine doesn't matter.

What matters is showing up consistently for the work that moves the needle.

5am or 10am—who cares?

Results > rituals.`;

  const sampleOutput = `The best product managers I've worked with share one trait:

They're comfortable being wrong.

Not indecisive—confident enough to commit, humble enough to pivot.

Ship the thing. Learn. Iterate.

That's the whole playbook.

---

Stop optimizing your calendar.

Start protecting your deep work blocks.

The meeting could've been an email.
The email could've been a decision.
The decision could've been made yesterday.

Speed is a feature.`;

  return (
    <div className="min-h-screen bg-[#0B0F12] overflow-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg text-white font-['Outfit']">LinkedIn Ghostwriter Agent</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <button
                data-testid="nav-dashboard-btn"
                onClick={() => navigate("/dashboard")}
                className="btn-primary text-sm py-2 px-5"
              >
                Dashboard
              </button>
            ) : (
              <>
                <button
                  data-testid="nav-signin-btn"
                  onClick={() => navigate("/auth")}
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Sign in
                </button>
                <button
                  data-testid="nav-getstarted-btn"
                  onClick={handleGetStarted}
                  className="btn-primary text-sm py-2 px-5"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-teal-500/20 via-blue-500/5 to-transparent blur-3xl pointer-events-none" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white font-['Outfit'] leading-tight mb-6">
              Write like you—
              <br />
              <span className="gradient-text">without writing.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Paste a few posts. Choose a topic. Get five ready-to-publish LinkedIn drafts in your voice.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <motion.button
                data-testid="hero-cta-btn"
                onClick={handleGetStarted}
                className="btn-primary text-base py-3 px-8 flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Create your voice profile
                <ArrowRight className="w-5 h-5" />
              </motion.button>
              <motion.a
                href="#example"
                className="btn-secondary text-base py-3 px-8"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                See example
              </motion.a>
            </div>

            {/* Demo CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <button
                data-testid="hero-demo-btn"
                onClick={() => navigate("/demo")}
                className="text-slate-400 hover:text-teal-400 transition-colors text-sm flex items-center gap-2 mx-auto"
              >
                <Play className="w-4 h-4" />
                Try demo without signup
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="card-ghost p-8"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-blue-500/20 flex items-center justify-center text-teal-400 mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-3 font-['Outfit']">
                  {feature.title}
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Example Section */}
      <section id="example" className="py-20 px-6 bg-[#0D1117]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-white font-['Outfit'] mb-4">
              From your voice to fresh posts
            </h2>
            <p className="text-slate-400 text-lg">
              See how we transform your writing style into new content
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="card-ghost p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-teal-400" />
                <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
                  Your sample posts (input)
                </span>
              </div>
              <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                {sampleInput}
              </pre>
            </motion.div>

            {/* Output */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="card-ghost p-6 border-teal-500/30"
            >
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-teal-400 to-blue-400" />
                <span className="text-sm font-medium text-teal-400 uppercase tracking-wider">
                  Generated drafts (output)
                </span>
              </div>
              <pre className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                {sampleOutput}
              </pre>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white font-['Outfit'] mb-6">
              Ready to write smarter?
            </h2>
            <p className="text-slate-400 text-lg mb-8">
              Create your voice profile in 2 minutes. Generate posts forever.
            </p>
            <button
              data-testid="cta-getstarted-btn"
              onClick={handleGetStarted}
              className="btn-primary text-base py-3 px-8 flex items-center justify-center gap-2 mx-auto"
            >
              Get started free
              <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-slate-400">LinkedIn Ghostwriter Agent © 2025</span>
          </div>
          <p className="text-sm text-slate-500">
            Built with AI. Powered by your voice.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
