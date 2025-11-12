import * as React from "react";
import type { ActivityDTO, AIEvaluationDTO } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Countdown } from "./Countdown";
import { AIEvaluationTimeline } from "./AIEvaluationTimeline";
import { AIEvaluationSummary } from "./AIEvaluationSummary";

export interface AIEvaluationPanelProps {
  activity?: ActivityDTO;
  evaluations: AIEvaluationDTO[];
  canRequest: boolean;
  cooldownRemainingSec: number;
  onRequestEvaluation: () => Promise<void>;
  loading?: boolean;
}

export function AIEvaluationPanel({
  activity,
  evaluations,
  canRequest,
  cooldownRemainingSec,
  onRequestEvaluation,
  loading,
}: AIEvaluationPanelProps) {
  const latest = evaluations[0] ?? null;
  const [requesting, setRequesting] = React.useState(false);

  const handleRequest = async () => {
    if (!canRequest || requesting || cooldownRemainingSec > 0) return;
    setRequesting(true);
    try {
      await onRequestEvaluation();
    } finally {
      setRequesting(false);
    }
  };

  const disabled = !canRequest || requesting || cooldownRemainingSec > 0;
  const title = !canRequest
    ? "Brak uprawnień do tej akcji"
    : cooldownRemainingSec > 0
      ? "Odczekaj do końca cooldownu"
      : undefined;

  return (
    <Card data-test-id="ai-evaluation-panel">
      <CardHeader>
        <CardTitle>Ocena AI</CardTitle>
        <CardDescription>Ostatnia ocena oraz historia</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AIEvaluationSummary latest={latest} loading={loading} />

        <div>
          <AIEvaluationTimeline evaluations={evaluations} loading={loading} />
        </div>

        <div className="flex items-center justify-between">
          <Button
            onClick={handleRequest}
            disabled={disabled}
            aria-disabled={disabled}
            title={title}
            data-test-id="ai-evaluation-request-button"
          >
            {requesting ? "Kolejkowanie…" : "Poproś o ocenę AI"}
          </Button>
          {cooldownRemainingSec > 0 ? (
            <div className="text-sm text-muted-foreground">
              Odczekaj <Countdown seconds={cooldownRemainingSec} />
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
