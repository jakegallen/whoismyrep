import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useXP } from "@/hooks/useXP";
import { useSavedReps } from "@/hooks/useSavedReps";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

// Shuffles an array in place (Fisher-Yates)
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// US state abbreviation → full name map (subset — enough for quiz variety)
const STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

function generateQuestions(savedReps: Array<Record<string, unknown>>): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  const reps = savedReps.filter((r) => r.name && r.state);

  if (reps.length === 0) return [];

  // Q1: Which state does [rep] represent?
  for (const rep of shuffle(reps).slice(0, 2)) {
    const state = rep.state as string;
    const stateName = STATES[state] ?? state;
    const wrongStates = shuffle(
      Object.values(STATES).filter((s) => s !== stateName),
    ).slice(0, 3);
    const options = shuffle([stateName, ...wrongStates]);
    questions.push({
      question: `Which state does ${rep.name} represent?`,
      options,
      correctIndex: options.indexOf(stateName),
    });
  }

  // Q2: What party is [rep]?
  for (const rep of shuffle(reps).slice(0, 1)) {
    const party = rep.party as string;
    if (!party) continue;
    const wrongParties = ["Democratic", "Republican", "Independent"].filter(
      (p) => p !== party,
    );
    const options = shuffle([party, ...wrongParties]);
    questions.push({
      question: `What party is ${rep.name} affiliated with?`,
      options,
      correctIndex: options.indexOf(party),
    });
  }

  return shuffle(questions).slice(0, 3);
}

export function DailyQuiz() {
  const { savedReps } = useSavedReps();
  const { awardXP } = useXP();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = useMemo(
    () => generateQuestions(savedReps as Array<Record<string, unknown>>),
    [savedReps],
  );

  const question = questions[currentIdx];

  const handleAnswer = useCallback(
    async (idx: number) => {
      if (answered || !question) return;
      setSelected(idx);
      setAnswered(true);

      const isCorrect = idx === question.correctIndex;
      if (isCorrect) {
        setCorrectCount((c) => c + 1);
        await awardXP("quiz_correct", { questionId: `${Date.now()}-${currentIdx}` });
      }
    },
    [answered, question, currentIdx, awardXP],
  );

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentIdx((i) => i + 1);
      setSelected(null);
      setAnswered(false);
    }
  }, [currentIdx, questions.length]);

  // Not enough data for quiz
  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-center">
        <Brain className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="font-body text-sm text-muted-foreground">
          Save some representatives to unlock the daily quiz.
        </p>
      </div>
    );
  }

  // Finished
  if (finished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-border bg-card p-6 text-center"
      >
        <Brain className="mx-auto mb-2 h-8 w-8 text-primary" />
        <h3 className="font-display text-lg font-bold text-headline">
          Quiz Complete!
        </h3>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          You got {correctCount}/{questions.length} correct
        </p>
        <p className="mt-0.5 font-mono text-sm font-bold text-primary">
          +{correctCount * 15} XP earned
        </p>
      </motion.div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Brain className="h-4 w-4 text-purple-500" />
        <span className="font-display text-sm font-bold text-headline">
          Daily Quiz
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {currentIdx + 1}/{questions.length}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
        >
          <p className="mb-3 font-display text-sm font-semibold text-headline">
            {question.question}
          </p>

          <div className="flex flex-col gap-2">
            {question.options.map((opt, idx) => {
              let variant = "border-border bg-muted/30 hover:bg-muted/60";
              if (answered) {
                if (idx === question.correctIndex) {
                  variant = "border-emerald-500 bg-emerald-500/10";
                } else if (idx === selected) {
                  variant = "border-red-500 bg-red-500/10";
                } else {
                  variant = "border-border bg-muted/20 opacity-50";
                }
              }
              return (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  disabled={answered}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left font-body text-sm transition-colors ${variant}`}
                >
                  {answered && idx === question.correctIndex && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  )}
                  {answered && idx === selected && idx !== question.correctIndex && (
                    <XCircle className="h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <span className="text-headline">{opt}</span>
                </button>
              );
            })}
          </div>

          {answered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 flex justify-end"
            >
              <Button size="sm" onClick={handleNext} className="gap-1">
                {currentIdx + 1 >= questions.length ? "Finish" : "Next"}
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
