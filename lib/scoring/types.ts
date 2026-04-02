export type PredictionInput = {
  order_id: number;
  late_delivery_probability: number;
  predicted_late_delivery: 0 | 1;
  fraud_probability: number;
  predicted_fraud: 0 | 1;
};

export type FraudFlaggedOrderRow = {
  order_id: number;
  order_total: number;
  customer_name: string;
  fraud_probability: number;
};

export type ScoringResult = {
  ok: boolean;
  provider: string;
  timestamp: string;
  ordersScored?: number;
  fraudFlaggedOrders?: FraudFlaggedOrderRow[];
  stdoutPreview?: string;
  stderrPreview?: string;
  errorMessage?: string;
};

export interface ScoringProvider {
  readonly key: string;
  scoreOpenOrders(): Promise<ScoringResult>;
}
