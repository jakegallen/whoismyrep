import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useXP } from "@/hooks/useXP";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

// ── Politician quiz ──
interface PoliticianQuizProps {
  context: "politician";
  name: string;
  party?: string;
  state?: string;
  office?: string;
}

function generatePoliticianQuestions(props: PoliticianQuizProps): QuizQuestion[] {
  const { name, party, state, office } = props;
  const questions: QuizQuestion[] = [];

  if (state) {
    const stateName = STATES[state] ?? state;
    const wrong = shuffle(Object.values(STATES).filter((s) => s !== stateName)).slice(0, 3);
    const options = shuffle([stateName, ...wrong]);
    questions.push({
      question: `Which state does ${name} represent?`,
      options,
      correctIndex: options.indexOf(stateName),
    });
  }

  if (party) {
    const allParties = ["Democratic", "Republican", "Independent"];
    const wrong = allParties.filter((p) => p !== party);
    const options = shuffle([party, ...wrong]);
    questions.push({
      question: `What party is ${name} affiliated with?`,
      options,
      correctIndex: options.indexOf(party),
    });
  }

  if (office) {
    const isSenator = office.toLowerCase().includes("senator") || office.toLowerCase().includes("senate");
    const correct = isSenator ? "Senate" : "House of Representatives";
    const options = shuffle(["Senate", "House of Representatives"]);
    questions.push({
      question: `Which chamber does ${name} serve in?`,
      options,
      correctIndex: options.indexOf(correct),
    });
  }

  return questions.slice(0, 2);
}

// ── Bill quiz ──
interface BillQuizProps {
  context: "bill";
  billNumber: string;
  title: string;
  chamber?: string;
  sponsors?: string[];
  status?: string;
}

function generateBillQuestions(props: BillQuizProps): QuizQuestion[] {
  const { billNumber, title, chamber, sponsors, status } = props;
  const questions: QuizQuestion[] = [];

  if (chamber) {
    const correct = chamber;
    const options = shuffle(["Senate", "House"]);
    if (!options.includes(correct)) options[0] = correct;
    questions.push({
      question: `Which chamber introduced ${billNumber}?`,
      options: shuffle(options),
      correctIndex: shuffle(options).indexOf(correct),
    });
    // Recalculate after final shuffle
    const finalOptions = questions[questions.length - 1].options;
    questions[questions.length - 1].correctIndex = finalOptions.indexOf(correct);
  }

  if (sponsors && sponsors.length > 0) {
    const correct = sponsors[0];
    const fakeSponsorPool = [
      "Chuck Schumer", "Mitch McConnell", "Nancy Pelosi", "Kevin McCarthy",
      "Bernie Sanders", "Ted Cruz", "Elizabeth Warren", "Marco Rubio",
      "Alexandria Ocasio-Cortez", "Josh Hawley", "Cory Booker", "Rand Paul",
    ].filter((s) => !sponsors.includes(s));
    const wrong = shuffle(fakeSponsorPool).slice(0, 3);
    const options = shuffle([correct, ...wrong]);
    questions.push({
      question: `Who is the primary sponsor of ${billNumber}?`,
      options,
      correctIndex: options.indexOf(correct),
    });
  }

  if (status) {
    const statusOptions = [
      "Introduced", "Passed House", "Passed Senate", "Enacted",
      "In Committee", "Vetoed", "Failed",
    ];
    const correct = status;
    const wrong = shuffle(statusOptions.filter((s) => s !== correct)).slice(0, 3);
    const options = shuffle([correct, ...wrong]);
    questions.push({
      question: `What is the current status of ${billNumber}?`,
      options,
      correctIndex: options.indexOf(correct),
    });
  }

  return questions.slice(0, 2);
}

export type RelatedQuizProps = PoliticianQuizProps | BillQuizProps;

export function RelatedQuiz(props: RelatedQuizProps) {
  const { user } = useAuth();
  const { awardXP } = useXP();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);

  const questions = useMemo(() => {
    if (props.context === "politician") return generatePoliticianQuestions(props);
    return generateBillQuestions(props);
  }, [props.context === "politician" ? props.name : (props as BillQuizProps).billNumber]);

  const question = questions[currentIdx];

  const handleAnswer = useCallback(
    async (idx: number) => {
      if (answered || !question) return;
      setSelected(idx);
      setAnswered(true);

      const isCorrect = idx === question.correctIndex;
      if (isCorrect) {
        setCorrectCount((c) => c + 1);
        if (user) {
          await awardXP("quiz_correct", { questionId: `related-${Date.now()}-${currentIdx}` });
        }
      }
    },
    [answered, question, currentIdx, awardXP, user],
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

  if (questions.length === 0) return null;

  if (finished) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-border bg-card p-5 text-center"
      >
        <Brain className="mx-auto mb-2 h-6 w-6 text-primary" />
        <p className="font-display text-sm font-bold text-headline">
          {correctCount}/{questions.length} correct
        </p>
        {user && correctCount > 0 && (
          <p className="mt-0.5 font-mono text-xs font-bold text-primary">
            +{correctCount * 15} XP earned
          </p>
        )}
      </motion.div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Brain className="h-4 w-4 text-purple-500" />
        <span className="font-display text-sm font-bold text-headline">
          Test Your Knowledge
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
