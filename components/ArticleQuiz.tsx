"use client";

import { useState } from "react";
import type { QuizQuestion } from "@/lib/strategieLevels";

/** Quiz de fin d'article : feedback immédiat, rien n'est envoyé ni
 *  enregistré — juste un moyen de vérifier ce qu'on a retenu. */
export default function ArticleQuiz({ quiz }: { quiz: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<(number | null)[]>(quiz.map(() => null));

  if (quiz.length === 0) return null;

  const answered = answers.filter((a) => a !== null).length;
  const correct = answers.filter((a, i) => a === quiz[i].correctIndex).length;

  function choose(qIndex: number, optIndex: number) {
    setAnswers((prev) => {
      if (prev[qIndex] !== null) return prev; // une seule tentative par question
      const next = [...prev];
      next[qIndex] = optIndex;
      return next;
    });
  }

  return (
    <div className="mt-10 pt-8 border-t border-ink/10">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-5">
        <h2 className="text-lg font-serif font-semibold">Vérifiez ce que vous avez retenu</h2>
        {answered === quiz.length && (
          <span className="text-sm font-medium text-forest">
            {correct} / {quiz.length} bonnes réponses
          </span>
        )}
      </div>
      <div className="space-y-5">
        {quiz.map((q, qi) => {
          const chosen = answers[qi];
          return (
            <div key={qi} className="border border-ink/10 rounded-lg p-5">
              <p className="text-sm font-medium mb-3">{q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oi) => {
                  const isChosen = chosen === oi;
                  const isCorrect = oi === q.correctIndex;
                  const revealed = chosen !== null;
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => choose(qi, oi)}
                      disabled={revealed}
                      className={`w-full text-left text-sm rounded px-3.5 py-2.5 border transition-colors ${
                        revealed && isCorrect
                          ? "border-forest bg-forest/10 text-forest"
                          : revealed && isChosen && !isCorrect
                            ? "border-crimson bg-crimson/[0.06] text-crimson"
                            : "border-ink/15 hover:bg-paper-dim disabled:cursor-default"
                      }`}
                    >
                      {opt}
                      {revealed && isCorrect && " ✓"}
                      {revealed && isChosen && !isCorrect && " ✗"}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
