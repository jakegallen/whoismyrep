import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Brain,
  CheckCircle2,
  Clock,
  LogIn,
  RotateCcw,
  XCircle,
  Zap,
} from "lucide-react";
import SiteNav from "@/components/SiteNav";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";

// ── Question types ──

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  category: string;
}

// ── Static question bank (generated from common civics knowledge) ──

const QUESTION_BANK: QuizQuestion[] = [
  { question: "How many U.S. senators are there in total?", options: ["50", "100", "200", "435"], correctIndex: 1, category: "Congress" },
  { question: "How many members are in the U.S. House of Representatives?", options: ["100", "270", "435", "535"], correctIndex: 2, category: "Congress" },
  { question: "How long is a U.S. senator's term?", options: ["2 years", "4 years", "6 years", "8 years"], correctIndex: 2, category: "Congress" },
  { question: "How long is a U.S. representative's term?", options: ["2 years", "4 years", "6 years", "8 years"], correctIndex: 0, category: "Congress" },
  { question: "Who is the presiding officer of the U.S. Senate?", options: ["Speaker of the House", "Vice President", "President Pro Tempore", "Senate Majority Leader"], correctIndex: 1, category: "Congress" },
  { question: "What fraction of the Senate is up for election every 2 years?", options: ["1/4", "1/3", "1/2", "All"], correctIndex: 1, category: "Congress" },
  { question: "How many amendments does the U.S. Constitution have?", options: ["10", "21", "27", "33"], correctIndex: 2, category: "Constitution" },
  { question: "What are the first 10 amendments called?", options: ["The Preamble", "Bill of Rights", "Articles of Confederation", "Constitutional Rights"], correctIndex: 1, category: "Constitution" },
  { question: "Which amendment abolished slavery?", options: ["13th", "14th", "15th", "19th"], correctIndex: 0, category: "Constitution" },
  { question: "Which amendment gave women the right to vote?", options: ["15th", "18th", "19th", "21st"], correctIndex: 2, category: "Constitution" },
  { question: "How many justices serve on the Supreme Court?", options: ["7", "9", "11", "13"], correctIndex: 1, category: "Judiciary" },
  { question: "Who nominates Supreme Court justices?", options: ["Congress", "The Vice President", "The President", "State governors"], correctIndex: 2, category: "Judiciary" },
  { question: "What is the minimum age to serve as President?", options: ["25", "30", "35", "40"], correctIndex: 2, category: "Executive" },
  { question: "What is the minimum age to serve as a U.S. senator?", options: ["25", "30", "35", "40"], correctIndex: 1, category: "Congress" },
  { question: "What is the minimum age to serve as a U.S. representative?", options: ["21", "25", "30", "35"], correctIndex: 1, category: "Congress" },
  { question: "What document begins with 'We the People'?", options: ["Declaration of Independence", "Bill of Rights", "U.S. Constitution", "Federalist Papers"], correctIndex: 2, category: "Constitution" },
  { question: "How many electoral votes are needed to win the presidency?", options: ["218", "251", "270", "326"], correctIndex: 2, category: "Executive" },
  { question: "Which branch of government makes federal laws?", options: ["Executive", "Legislative", "Judicial", "Administrative"], correctIndex: 1, category: "Government" },
  { question: "What is the term length for a Supreme Court justice?", options: ["10 years", "20 years", "Until retirement", "Life (good behavior)"], correctIndex: 3, category: "Judiciary" },
  { question: "Who has the power to declare war?", options: ["The President", "Congress", "The Supreme Court", "Joint Chiefs of Staff"], correctIndex: 1, category: "Congress" },
  { question: "What is the supreme law of the land?", options: ["Federal statutes", "The Constitution", "Executive orders", "Supreme Court rulings"], correctIndex: 1, category: "Constitution" },
  { question: "How many total electors are in the Electoral College?", options: ["435", "535", "538", "600"], correctIndex: 2, category: "Executive" },
  { question: "Which amendment protects freedom of speech?", options: ["1st", "2nd", "4th", "5th"], correctIndex: 0, category: "Constitution" },
  { question: "Who is Commander-in-Chief of the armed forces?", options: ["Secretary of Defense", "Chairman of Joint Chiefs", "The President", "Congress"], correctIndex: 2, category: "Executive" },
  { question: "What does the judicial branch do?", options: ["Makes laws", "Enforces laws", "Interprets laws", "Proposes amendments"], correctIndex: 2, category: "Judiciary" },
];

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type QuizMode = "quick" | "deep";
type QuizState = "menu" | "playing" | "results";

const CivicsChallengePageInner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { awardXP } = useXP();

  const [mode, setMode] = useState<QuizMode>("quick");
  const [state, setState] = useState<QuizState>("menu");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [timeLeft, setTimeLeft] = useState(60);

  const questionCount = mode === "quick" ? 5 : 10;

  const startQuiz = useCallback(
    (m: QuizMode) => {
      setMode(m);
      const count = m === "quick" ? 5 : 10;
      setQuestions(shuffleArray(QUESTION_BANK).slice(0, count));
      setCurrentIdx(0);
      setSelected(null);
      setCorrectCount(0);
      setAnswers([]);
      setTimeLeft(60);
      setState("playing");
    },
    [],
  );

  // Timer
  useEffect(() => {
    if (state !== "playing") return;
    if (selected !== null) return; // paused after answer
    if (timeLeft <= 0) {
      // Time ran out — mark wrong
      handleAnswer(-1);
      return;
    }
    const t = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [state, timeLeft, selected]);

  const handleAnswer = useCallback(
    (idx: number) => {
      if (selected !== null) return;
      setSelected(idx);
      const correct = idx === questions[currentIdx].correctIndex;
      if (correct) setCorrectCount((c) => c + 1);
      setAnswers((a) => [...a, idx]);

      // Award XP for correct answer
      if (correct && user) {
        awardXP("quiz_correct", { questionIndex: currentIdx });
      }

      // Auto-advance after 1.2s
      setTimeout(() => {
        if (currentIdx + 1 >= questions.length) {
          setState("results");
        } else {
          setCurrentIdx((i) => i + 1);
          setSelected(null);
          setTimeLeft(60);
        }
      }, 1200);
    },
    [selected, questions, currentIdx, user, awardXP],
  );

  const q = questions[currentIdx];
  const xpEarned = correctCount * 15;

  if (state === "menu") {
    return (
      <div className="mx-auto max-w-lg">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/15">
              <Brain className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-headline">Civics Challenge</h1>
              <p className="font-body text-sm text-muted-foreground">Test your political knowledge</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => startQuiz("quick")}
              className="w-full rounded-xl border border-border bg-card/60 p-5 text-left transition-colors hover:bg-card hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-display text-base font-bold text-headline">Quick Quiz</p>
                  <p className="font-body text-sm text-muted-foreground">5 questions · 60s each</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => startQuiz("deep")}
              className="w-full rounded-xl border border-border bg-card/60 p-5 text-left transition-colors hover:bg-card hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <Brain className="h-5 w-5 text-indigo-500" />
                <div>
                  <p className="font-display text-base font-bold text-headline">Deep Dive</p>
                  <p className="font-body text-sm text-muted-foreground">10 questions · 60s each</p>
                </div>
              </div>
            </button>
          </div>

          {!user && (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-dashed border-border bg-card/50 p-4">
              <p className="font-body text-sm text-muted-foreground">Sign in to earn XP</p>
              <Button size="sm" onClick={() => navigate("/auth")} className="gap-1.5">
                <LogIn className="h-3.5 w-3.5" /> Sign In
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  if (state === "results") {
    const perfect = correctCount === questions.length;
    return (
      <div className="mx-auto max-w-lg">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${perfect ? "bg-green-500/15" : "bg-amber-500/15"}`}>
            {perfect ? (
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            ) : (
              <Brain className="h-10 w-10 text-amber-500" />
            )}
          </div>

          <h2 className="font-display text-2xl font-bold text-headline">
            {perfect ? "Perfect Score!" : "Quiz Complete!"}
          </h2>
          <p className="mt-1 font-body text-muted-foreground">
            {correctCount} of {questions.length} correct
          </p>

          {user && xpEarned > 0 && (
            <p className="mt-2 font-mono text-sm font-bold text-primary">+{xpEarned} XP earned</p>
          )}

          <Progress value={(correctCount / questions.length) * 100} className="mx-auto mt-4 h-3 max-w-xs" />

          {/* Answer review */}
          <div className="mt-6 space-y-2 text-left">
            {questions.map((q, i) => {
              const userAnswer = answers[i];
              const correct = userAnswer === q.correctIndex;
              return (
                <div key={i} className={`rounded-lg border p-3 ${correct ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
                  <div className="flex items-start gap-2">
                    {correct ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
                    <div className="min-w-0">
                      <p className="font-body text-sm text-headline">{q.question}</p>
                      {!correct && (
                        <p className="mt-1 font-body text-xs text-muted-foreground">
                          Correct: {q.options[q.correctIndex]}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex gap-2">
            <Button onClick={() => setState("menu")} variant="outline" className="flex-1 gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" /> Play Again
            </Button>
            <Button onClick={() => navigate("/today")} className="flex-1">
              Daily Briefing
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Playing state
  return (
    <div className="mx-auto max-w-lg">
      {/* Progress */}
      <div className="mb-4 flex items-center justify-between">
        <span className="font-body text-sm text-muted-foreground">
          Question {currentIdx + 1} of {questions.length}
        </span>
        <span className={`flex items-center gap-1 font-mono text-sm font-bold ${timeLeft <= 10 ? "text-red-500" : "text-muted-foreground"}`}>
          <Clock className="h-3.5 w-3.5" />
          {timeLeft}s
        </span>
      </div>
      <Progress value={((currentIdx + 1) / questions.length) * 100} className="mb-6 h-1.5" />

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <p className="mb-1 font-body text-[11px] uppercase tracking-wider text-muted-foreground">
            {q.category}
          </p>
          <h2 className="mb-6 font-display text-lg font-bold text-headline">{q.question}</h2>

          <div className="space-y-2">
            {q.options.map((opt, i) => {
              let style = "border-border bg-card/60 hover:bg-card hover:border-primary/30";
              if (selected !== null) {
                if (i === q.correctIndex) style = "border-green-500/50 bg-green-500/10";
                else if (i === selected) style = "border-red-500/50 bg-red-500/10";
                else style = "border-border bg-card/30 opacity-50";
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={selected !== null}
                  className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all ${style}`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-bold text-muted-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="font-body text-sm text-headline">{opt}</span>
                  {selected !== null && i === q.correctIndex && (
                    <CheckCircle2 className="ml-auto h-4 w-4 text-green-500" />
                  )}
                  {selected !== null && i === selected && i !== q.correctIndex && (
                    <XCircle className="ml-auto h-4 w-4 text-red-500" />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 text-center">
        <p className="font-mono text-xs text-muted-foreground">
          {correctCount} correct so far · +{correctCount * 15} XP
        </p>
      </div>
    </div>
  );
};

const CivicsChallengePage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Civics Challenge" description="Test your political knowledge" path="/quiz" />
      <SiteNav />
      <main id="main-content" className="container mx-auto px-4 py-8 pb-20">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 -ml-2 gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <CivicsChallengePageInner />
      </main>
    </div>
  );
};

export default CivicsChallengePage;
