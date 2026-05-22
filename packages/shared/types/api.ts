import type { Severity } from "../constants/severity";

export type ProjectStatus =
  | "em_preparacao"
  | "aguardando_ifc"
  | "em_auditoria"
  | "auditado"
  | "aprovado"
  | "reprovado"
  | "arquivado";

export interface Project {
  id: string;
  name: string;
  client: string;
  description?: string;
  discipline?: string;
  phase?: string;
  responsible?: string;
  status: ProjectStatus;
}

export interface Criterion {
  id: string;
  criteria_set_id: string;
  code: string;
  name: string;
  description?: string;
  category?: string;
  severity: Severity;
  rule_type: string;
  entity_ifc?: string;
  property_name?: string;
  operator?: string;
  expected_value?: string;
  failure_message?: string;
  fix_suggestion?: string;
  reference?: string;
  active: boolean;
}
