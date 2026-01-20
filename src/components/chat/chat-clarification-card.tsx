"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type {
  ClarificationPayload,
  ClarificationResponse,
} from "@/types/chat";

type AnswerState = Record<
  string,
  {
    selected: string[];
    otherText: string;
  }
>;

function buildInitialState(
  clarification: ClarificationPayload,
  response?: ClarificationResponse
): AnswerState {
  const state: AnswerState = {};

  clarification.questions.forEach((question) => {
    const existing = response?.answers.find(
      (answer) => answer.questionId === question.id
    );
    state[question.id] = {
      selected: existing?.selectedOptionIds ?? [],
      otherText: existing?.otherText ?? "",
    };
  });

  return state;
}

interface ChatClarificationCardProps {
  clarification: ClarificationPayload;
  status?: "pending" | "submitted" | "skipped";
  response?: ClarificationResponse;
  onSubmit: (response: ClarificationResponse) => void;
}

export function ChatClarificationCard({
  clarification,
  status = "pending",
  response,
  onSubmit,
}: ChatClarificationCardProps) {
  const [answers, setAnswers] = useState<AnswerState>(() =>
    buildInitialState(clarification, response)
  );

  useEffect(() => {
    setAnswers(buildInitialState(clarification, response));
  }, [clarification, response]);

  const locked = status !== "pending";
  const summaryItems = useMemo(() => {
    if (!response || response.skipped) return [];

    const questionMap = new Map(
      clarification.questions.map((question) => [question.id, question])
    );

    return response.answers.map((answer) => {
      const question = questionMap.get(answer.questionId);
      const labels =
        answer.selectedOptionIds
          ?.map((optionId) =>
            question?.options.find((option) => option.id === optionId)?.label
          )
          .filter(Boolean) ?? [];
      if (answer.otherText) {
        labels.push(`Other: ${answer.otherText}`);
      }

      return {
        question: question?.prompt || "Question",
        value: labels.join(", ") || "No selection",
      };
    });
  }, [clarification.questions, response]);

  const isValid = useMemo(() => {
    return clarification.questions.every((question) => {
      if (!question.required) return true;
      const answer = answers[question.id];
      const hasSelection = answer?.selected?.length > 0;
      const hasOther = Boolean(answer?.otherText?.trim());
      return hasSelection || hasOther;
    });
  }, [answers, clarification.questions]);

  const handleToggleOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? { selected: [], otherText: "" };
      const question = clarification.questions.find((q) => q.id === questionId);
      const isMulti = question?.selectionType === "multi";

      let selected: string[] = [];
      if (isMulti) {
        selected = current.selected.includes(optionId)
          ? current.selected.filter((id) => id !== optionId)
          : [...current.selected, optionId];
      } else {
        selected = [optionId];
      }

      return { ...prev, [questionId]: { ...current, selected } };
    });
  };

  const handleOtherChange = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const current = prev[questionId] ?? { selected: [], otherText: "" };
      return { ...prev, [questionId]: { ...current, otherText: value } };
    });
  };

  const handleSubmit = (skipped = false) => {
    const payload: ClarificationResponse = {
      requestId: clarification.id,
      answers: skipped
        ? []
        : clarification.questions.map((question) => ({
            questionId: question.id,
            selectedOptionIds: answers[question.id]?.selected ?? [],
            otherText: answers[question.id]?.otherText?.trim() || undefined,
          })),
      skipped,
    };

    onSubmit(payload);
  };

  return (
    <div className="max-w-[85%] rounded-xl border bg-card/80 px-4 py-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <Lightbulb className="h-4 w-4" />
        </span>
        <span>Asking for clarification</span>
      </div>

      <div className="mt-3 space-y-1">
        <h4 className="text-sm font-semibold">
          {clarification.title || "A few quick questions"}
        </h4>
        {clarification.description ? (
          <p className="text-xs text-muted-foreground">
            {clarification.description}
          </p>
        ) : null}
      </div>

      <div className="mt-4 space-y-5">
        {locked ? (
          <div className="space-y-2 text-xs text-muted-foreground">
            {response?.skipped ? (
              <span>Skipped. Waiting on the agent to continue.</span>
            ) : summaryItems.length ? (
              summaryItems.map((item) => (
                <div key={item.question} className="space-y-0.5">
                  <span className="font-medium text-foreground">{item.question}</span>
                  <div>{item.value}</div>
                </div>
              ))
            ) : (
              <span>Responses saved.</span>
            )}
          </div>
        ) : (
          clarification.questions.map((question) => {
          const answer = answers[question.id] ?? { selected: [], otherText: "" };
          const isMulti = question.selectionType === "multi";

          return (
            <div key={question.id} className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {question.prompt}
              </p>
              {question.description ? (
                <p className="text-xs text-muted-foreground">
                  {question.description}
                </p>
              ) : null}
              <div className="space-y-2">
                {question.options.map((option, optionIndex) => {
                  const selected = answer.selected.includes(option.id);
                  const optionLabel = `${optionIndex + 1}`;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      disabled={locked}
                      onClick={() => handleToggleOption(question.id, option.id)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition",
                        selected
                          ? "border-emerald-500/50 bg-emerald-500/10"
                          : "border-border bg-background/40 hover:border-emerald-500/30 hover:bg-emerald-500/5",
                        locked && "cursor-not-allowed opacity-70"
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {option.label}
                        </p>
                        {option.description ? (
                          <p className="text-xs text-muted-foreground">
                            {option.description}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-md text-xs font-semibold",
                          selected
                            ? "bg-emerald-500 text-white"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {optionLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {question.allowOther ? (
                <div className="pt-1">
                  <Input
                    value={answer.otherText}
                    onChange={(event) =>
                      handleOtherChange(question.id, event.target.value)
                    }
                    placeholder="Type something else..."
                    disabled={locked}
                    className="h-9 rounded-lg bg-background/40 text-sm"
                  />
                </div>
              ) : null}

              {isMulti ? (
                <p className="text-[11px] text-muted-foreground">
                  Select all that apply.
                </p>
              ) : null}
            </div>
          );
        }))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {locked ? (
          <>
            {status === "submitted" ? (
              <span className="text-xs text-muted-foreground">Sent to agent</span>
            ) : null}
            {status === "skipped" ? (
              <span className="text-xs text-muted-foreground">Skipped</span>
            ) : null}
          </>
        ) : (
          <>
            <Button
              size="sm"
              onClick={() => handleSubmit(false)}
              disabled={!isValid}
              className="rounded-full"
            >
              Send answers
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSubmit(true)}
              className="rounded-full"
            >
              Skip
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
