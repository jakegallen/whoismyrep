import { useRef } from "react";
import { motion } from "framer-motion";
import { Share2, Copy, X, Trophy, Flame, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { toast } from "sonner";

interface ShareableCardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  displayName: string;
  level: number;
  xp: number;
  streak: number;
  achievementCount: number;
  totalAchievements: number;
}

export function ShareableCard({
  open,
  onOpenChange,
  displayName,
  level,
  xp,
  streak,
  achievementCount,
  totalAchievements,
}: ShareableCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const shareText = `I'm Level ${level} on WhoIsMyRep.us with ${achievementCount} achievements and a ${streak}-day streak! How politically aware are you?`;
  const shareUrl = "https://whoismyrep.us/achievements";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShareTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Share2 className="h-4 w-4" />
            Share Your Progress
          </DialogTitle>
        </DialogHeader>

        {/* Card preview */}
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-6 text-white"
        >
          <div className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="relative">
            <p className="mb-1 font-body text-xs uppercase tracking-wider text-white/70">
              WhoIsMyRep.us
            </p>
            <p className="font-display text-lg font-bold">{displayName}</p>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white/15 p-2.5 text-center backdrop-blur-sm">
                <Star className="mx-auto mb-1 h-4 w-4 text-amber-300" />
                <p className="font-mono text-lg font-bold">{level}</p>
                <p className="text-[10px] uppercase tracking-wide text-white/70">Level</p>
              </div>
              <div className="rounded-xl bg-white/15 p-2.5 text-center backdrop-blur-sm">
                <Flame className="mx-auto mb-1 h-4 w-4 text-orange-300" />
                <p className="font-mono text-lg font-bold">{streak}</p>
                <p className="text-[10px] uppercase tracking-wide text-white/70">Streak</p>
              </div>
              <div className="rounded-xl bg-white/15 p-2.5 text-center backdrop-blur-sm">
                <Trophy className="mx-auto mb-1 h-4 w-4 text-amber-300" />
                <p className="font-mono text-lg font-bold">
                  {achievementCount}/{totalAchievements}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-white/70">Badges</p>
              </div>
            </div>

            <p className="mt-4 font-mono text-xs text-white/60">
              {xp.toLocaleString()} XP earned
            </p>
          </div>
        </div>

        {/* Share buttons */}
        <div className="flex gap-2">
          <Button onClick={handleCopyLink} variant="outline" className="flex-1 gap-1.5" size="sm">
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
          <Button onClick={handleShareTwitter} variant="outline" className="flex-1 gap-1.5" size="sm">
            𝕏 Post
          </Button>
          <Button onClick={handleShareFacebook} variant="outline" className="flex-1 gap-1.5" size="sm">
            Facebook
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
