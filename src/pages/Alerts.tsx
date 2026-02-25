import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  FileText,
  Vote,
  Newspaper,
  Mail,
  LogOut,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Prefs {
  bill_updates: boolean;
  key_votes: boolean;
  breaking_news: boolean;
  email_enabled: boolean;
}

const defaultPrefs: Prefs = {
  bill_updates: true,
  key_votes: true,
  breaking_news: true,
  email_enabled: true,
};

const Alerts = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  // Fetch existing prefs
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("newsletter_subscriptions")
        .select("bill_updates, key_votes, breaking_news, email_enabled")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setPrefs({
          bill_updates: data.bill_updates,
          key_votes: data.key_votes,
          breaking_news: data.breaking_news,
          email_enabled: data.email_enabled,
        });
      }
      setFetching(false);
    })();
  }, [user]);

  const savePrefs = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("newsletter_subscriptions")
        .upsert(
          { user_id: user.id, ...prefs },
          { onConflict: "user_id" }
        );
      if (error) throw error;
      toast({ title: "Preferences saved!" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Prefs) =>
    setPrefs((p) => ({ ...p, [key]: !p[key] }));

  if (authLoading || fetching) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const categories = [
    {
      key: "bill_updates" as const,
      icon: <FileText className="h-5 w-5 text-[hsl(var(--badge-law))]" />,
      title: "Bill Updates",
      desc: "New bills introduced, status changes, committee assignments",
    },
    {
      key: "key_votes" as const,
      icon: <Vote className="h-5 w-5 text-[hsl(var(--badge-policy))]" />,
      title: "Key Votes",
      desc: "Floor votes, committee decisions, roll call results",
    },
    {
      key: "breaking_news" as const,
      icon: <Newspaper className="h-5 w-5 text-primary" />,
      title: "Breaking Political News",
      desc: "Major political news and developments across Nevada",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero border-b border-border">
        <div className="container mx-auto px-4 py-8 md:py-10">
          <div className="flex items-center justify-between mb-4">
            <Link
              to="/"
              className="flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>
            <button
              onClick={async () => {
                await signOut();
                navigate("/");
              }}
              className="flex items-center gap-1.5 rounded-lg bg-surface-elevated px-3 py-2 font-body text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </button>
          </div>
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
                <Bell className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-headline">
                  Newsletter & Alerts
                </h1>
                <p className="font-body text-sm text-secondary-custom">
                  {user?.email}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </header>

      <main className="container mx-auto max-w-lg px-4 py-8 space-y-6">
        {/* Email master toggle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-[hsl(var(--gold))]" />
            <div>
              <p className="font-body text-sm font-semibold text-foreground">Email Notifications</p>
              <p className="font-body text-xs text-muted-foreground">
                Receive alerts via email
              </p>
            </div>
          </div>
          <Switch checked={prefs.email_enabled} onCheckedChange={() => toggle("email_enabled")} />
        </motion.div>

        {/* Category toggles */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold text-headline">Alert Categories</h2>
          {categories.map((cat, i) => (
            <motion.div
              key={cat.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-center gap-3">
                {cat.icon}
                <div>
                  <p className="font-body text-sm font-semibold text-foreground">{cat.title}</p>
                  <p className="font-body text-xs text-muted-foreground">{cat.desc}</p>
                </div>
              </div>
              <Switch checked={prefs[cat.key]} onCheckedChange={() => toggle(cat.key)} />
            </motion.div>
          ))}
        </div>

        <Button onClick={savePrefs} disabled={saving} className="w-full">
          {saving ? "Saving…" : "Save Preferences"}
        </Button>

        <p className="font-body text-[11px] text-muted-foreground/60 text-center italic">
          You'll receive alerts based on your preferences. Unsubscribe anytime.
        </p>
      </main>
    </div>
  );
};

export default Alerts;
