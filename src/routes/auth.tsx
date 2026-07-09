import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Flame, Loader2, Mail, Lock, Sparkles } from "lucide-react";
import { useState, type FormEvent } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin Sign In — Punjab Fast Food" },
      { name: "description", content: "Sign in to manage Punjab Fast Food menu items and orders." },
      { property: "og:title", content: "Admin Sign In — Punjab Fast Food" },
      { property: "og:description", content: "Secure admin access for Punjab Fast Food." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        setMessage("Check your email to confirm your account, then sign in.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/admin", replace: true });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    setMessage(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setMessage(result.error.message);
    if (!result.redirected && !result.error) navigate({ to: "/admin", replace: true });
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-brand-black text-white grid lg:grid-cols-[1.15fr_0.85fr] overflow-hidden">
      <section className="relative hidden lg:flex items-end p-12 bg-brand-red overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(45deg, #fbbf24 25%, transparent 25%), linear-gradient(-45deg, #fbbf24 25%, transparent 25%)", backgroundSize: "42px 42px" }} />
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="relative max-w-xl">
          <Flame className="size-12 text-brand-gold mb-8" />
          <h1 className="font-display text-8xl uppercase leading-[0.82] tracking-tighter">
            Punjab<br />Command<br /><span className="text-brand-gold">Center</span>
          </h1>
          <p className="mt-8 font-mono text-xs uppercase tracking-[0.3em] text-white/70">Menu control · Order flow · Live operations</p>
        </motion.div>
      </section>

      <section className="flex items-center justify-center px-6 py-16">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 text-brand-gold font-mono text-[10px] uppercase tracking-[0.3em] mb-4">
              <Sparkles className="size-3" /> Secure Staff Access
            </div>
            <h2 className="font-display text-6xl uppercase tracking-tighter leading-none">
              {mode === "signin" ? "Sign In" : "Create Account"}
            </h2>
          </div>

          <button onClick={handleGoogle} disabled={loading} className="w-full py-4 bg-white text-brand-black font-bold uppercase tracking-tighter hover:bg-brand-gold transition-colors disabled:opacity-60">
            Continue with Google
          </button>

          <div className="my-6 h-px bg-white/10" />

          <form onSubmit={handleEmail} className="space-y-4">
            <label className="block">
              <span className="sr-only">Email</span>
              <div className="flex items-center gap-3 bg-white/10 border border-white/10 px-4 py-4 focus-within:border-brand-gold transition-colors">
                <Mail className="size-4 text-brand-gold" />
                <input name="email" type="email" required placeholder="Email" className="w-full bg-transparent outline-none font-mono text-sm placeholder:text-white/30" />
              </div>
            </label>
            <label className="block">
              <span className="sr-only">Password</span>
              <div className="flex items-center gap-3 bg-white/10 border border-white/10 px-4 py-4 focus-within:border-brand-gold transition-colors">
                <Lock className="size-4 text-brand-gold" />
                <input name="password" type="password" required minLength={8} placeholder="Password" className="w-full bg-transparent outline-none font-mono text-sm placeholder:text-white/30" />
              </div>
            </label>
            {message && <p className="text-sm text-brand-gold leading-relaxed">{message}</p>}
            <button disabled={loading} className="w-full py-4 bg-brand-red text-white font-bold uppercase tracking-tighter hover:bg-brand-orange hover:text-brand-black transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Enter Admin" : "Create Staff Account"}
            </button>
          </form>

          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="mt-6 text-xs font-mono uppercase tracking-[0.2em] text-white/50 hover:text-brand-gold transition-colors">
            {mode === "signin" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </motion.div>
      </section>
    </main>
  );
}