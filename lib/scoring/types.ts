export type PredictionInput = {
  order_id: number;
  late_delivery_probability: number;
  predicted_late_delivery: 0 | 1;
};

export type ScoringResult = {
  ok: boolean;
  provider: string;
  timestamp: string;
  ordersScored?: number;
  stdoutPreview?: string;
  stderrPreview?: string;
  errorMessage?: string;
};

export interface ScoringProvider {
  readonly key: string;
  scoreOpenOrders(): Promise<ScoringResult>;
}
