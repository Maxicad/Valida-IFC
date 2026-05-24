export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  description?: string | null;
  discipline?: string | null;
  phase?: string | null;
  responsible?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface IfcFile {
  id: string;
  project_id: string;
  file_name: string;
  file_size: number;
  ifc_schema?: string | null;
  ifc_version?: string | null;
  uploaded_at: string;
  status: string;
  metadata_json?: Record<string, unknown> | null;
}

export interface CriteriaSet {
  id: string;
  name: string;
  description?: string | null;
  source_type: string;
  created_at: string;
  updated_at: string;
}

export interface Criterion {
  id: string;
  criteria_set_id: string;
  code: string;
  name: string;
  description?: string | null;
  category?: string | null;
  severity: "baixa" | "moderada" | "alta";
  rule_type: string;
  entity_ifc?: string | null;
  property_name?: string | null;
  operator?: string | null;
  expected_value?: string | null;
  failure_message?: string | null;
  fix_suggestion?: string | null;
  reference?: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CriteriaImportResponse {
  criteria_set: CriteriaSet;
  file_name: string;
  total_rows: number;
  imported_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    code?: string | null;
    message: string;
  }>;
}

export interface AuditRun {
  id: string;
  project_id: string;
  ifc_file_id: string;
  criteria_set_id: string;
  status: string;
  score_percent?: number | null;
  score_low?: number | null;
  score_moderate?: number | null;
  score_high?: number | null;
  total_criteria: number;
  approved_criteria: number;
  failed_criteria: number;
  started_at?: string | null;
  finished_at?: string | null;
  queue_job_id?: string | null;
  error_message?: string | null;
}

export interface AuditResult {
  criteria_id: string;
  code: string;
  status: string;
  severity: string;
  message: string;
  actual_value?: string | null;
  expected_value?: string | null;
  element_guid?: string | null;
  element_type?: string | null;
  element_name?: string | null;
  weight: number;
  score_value: number;
  fix_suggestion?: string | null;
  is_summary: boolean;
}

export interface AuditHistoryItem extends AuditRun {
  project_name: string;
  ifc_file_name: string;
  criteria_set_name: string;
  snapshot_count: number;
}

export interface AuditSnapshot {
  id: string;
  audit_run_id: string;
  token: string;
  view_url: string;
  report_html_url: string;
  expires_at: string;
}

export interface AuditFailureItem {
  code: string;
  element_guid?: string | null;
  element_name?: string | null;
  severity: string;
  message: string;
  fix_suggestion?: string | null;
}

export interface AuditComparison {
  base_audit_id: string;
  target_audit_id: string;
  score_delta: number;
  new_failures: AuditFailureItem[];
  resolved_failures: AuditFailureItem[];
  persistent_failures: AuditFailureItem[];
}

export interface ViewerElement {
  global_id: string;
  entity: string;
  name?: string | null;
  status: "approved" | "failed" | "unknown";
  severity?: "baixa" | "moderada" | "alta" | null;
  failed_criteria_codes: string[];
}

export interface ViewerData {
  ifc_file_id: string;
  audit_run_id?: string | null;
  elements: ViewerElement[];
  status_map: Record<string, "approved" | "failed" | "unknown">;
}

export interface ViewerGeometryElement {
  global_id: string;
  entity: string;
  name?: string | null;
  express_id?: number | null;
  vertices: number[];
  indices: number[];
}

export interface ViewerGeometry {
  ifc_file_id: string;
  elements: ViewerGeometryElement[];
}
