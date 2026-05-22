export const severityWeights = {
  baixa: 1,
  moderada: 3,
  alta: 5,
} as const;

export type Severity = keyof typeof severityWeights;
