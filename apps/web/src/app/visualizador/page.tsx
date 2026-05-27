"use client";

import {
  AlertTriangle,
  Box,
  Crosshair,
  Eye,
  Filter,
  Gauge,
  Layers3,
  Loader2,
  LocateFixed,
  MousePointer2,
  Orbit,
  PanelRightClose,
  PanelRightOpen,
  Ruler,
  ScissorsLineDashed,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { AppShell } from "@/components/layout/app-shell";
import { loadCachedViewerFragment } from "@/lib/fragments-cache";
import { loadIfcGeometryWithWebIfc } from "@/lib/web-ifc-loader";
import { apiGet, apiGetArrayBuffer } from "@/services/api";
import type { IfcFile, Project, ViewerData, ViewerElement, ViewerGeometry } from "@/types/api";
import type { FragmentsModel, FragmentsModels, MaterialDefinition } from "@thatopen/fragments";

type ViewerGeometrySource = "fragments" | "web-ifc" | "backend";
type ViewerEngine = "fragments" | "stable" | "browser";
type ViewerTool = "select" | "orbit" | "cube" | "section" | "fit" | "measure";

interface FederatedElement {
  key: string;
  ifc_file_id: string;
  ifc_file_name: string;
  discipline: string | null;
  global_id: string;
  entity: string;
  name?: string | null;
  status: ViewerElement["status"];
  severity: ViewerElement["severity"];
  failed_criteria_codes: string[];
}

interface FederatedGeometryRow {
  key: string;
  ifc_file_id: string;
  global_id: string;
  entity: string;
  name?: string | null;
  discipline: string | null;
  vertices: Float32Array | number[];
  indices: Uint32Array | number[];
}

interface RawGeometryElement {
  global_id: string;
  entity: string;
  name?: string | null;
  vertices: Float32Array | number[];
  indices: Uint32Array | number[];
}

interface RawGeometryPayload {
  ifc_file_id: string;
  elements: RawGeometryElement[];
}

interface RenderableViewerGeometry {
  source: ViewerGeometrySource;
  rows: FederatedGeometryRow[];
  durationMs: number;
  triangles: number;
}

interface RenderableFragmentModel {
  ifc_file_id: string;
  ifc_file_name: string;
  discipline: string | null;
  bytes: Uint8Array;
  cached: boolean;
  generated: boolean;
}

interface RenderableViewerFragments {
  source: "fragments";
  models: RenderableFragmentModel[];
  durationMs: number;
  bytes: number;
}

interface ViewerRenderState {
  status: "idle" | "rendering" | "ready";
  visibleElements: number;
  totalElements: number;
}

interface ModelDisplayStyle {
  color: string;
  opacity: number;
}

const RENDER_BATCH_SIZE = 35;
const SELECTED_MESH_COLOR = "#2563eb";
const MODEL_STYLE_COLORS = ["#94a3b8", "#38bdf8", "#f59e0b", "#22c55e", "#a78bfa", "#f472b6", "#fb7185"];
const VIEWER_TOOL_OPTIONS = [
  { value: "select", label: "Selecionar", icon: MousePointer2 },
  { value: "orbit", label: "Orbitar", icon: Orbit },
  { value: "cube", label: "Vista 3D", icon: Box },
  { value: "section", label: "Corte", icon: ScissorsLineDashed },
  { value: "fit", label: "Enquadrar", icon: Crosshair },
  { value: "measure", label: "Medir", icon: Ruler },
] satisfies Array<{ value: ViewerTool; label: string; icon: typeof MousePointer2 }>;
const STATUS_OPTIONS: Array<{ value: "all" | ViewerElement["status"]; label: string }> = [
  { value: "all", label: "Todos status" },
  { value: "failed", label: "Reprovados" },
  { value: "approved", label: "Aprovados" },
  { value: "unknown", label: "Não auditado" },
];
const SEVERITY_OPTIONS: Array<{ value: "all" | "alta" | "moderada" | "baixa"; label: string }> = [
  { value: "all", label: "Todas severidades" },
  { value: "alta", label: "Alta" },
  { value: "moderada", label: "Moderada" },
  { value: "baixa", label: "Baixa" },
];

function parseQueryFileIds(): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  const params = new URLSearchParams(window.location.search);
  const single = params.get("ifc_file_id");
  const multiple = params.get("ifc_file_ids");
  const joined = multiple ?? single ?? "";
  return joined
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function disciplineColor(discipline?: string | null): string {
  const key = (discipline ?? "").toLowerCase();
  if (key === "arquitetura") {
    return "#0891b2";
  }
  if (key === "estrutura") {
    return "#ca8a04";
  }
  if (key === "instalacoes") {
    return "#059669";
  }
  if (key === "coordenacao") {
    return "#7c3aed";
  }
  return "#64748b";
}

function statusColor(status?: ViewerElement["status"]): string {
  if (status === "failed") {
    return "#dc2626";
  }
  if (status === "approved") {
    return "#16a34a";
  }
  return "#64748b";
}

function disciplineTagTone(discipline?: string | null): string {
  const key = (discipline ?? "").toLowerCase();
  if (key === "arquitetura") {
    return "bg-cyan-100 text-cyan-800";
  }
  if (key === "estrutura") {
    return "bg-amber-100 text-amber-800";
  }
  if (key === "instalacoes") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (key === "coordenacao") {
    return "bg-violet-100 text-violet-800";
  }
  return "bg-slate-100 text-slate-700";
}

function countTriangles(indices: number[] | Uint32Array): number {
  return Math.floor(indices.length / 3);
}

function disposeMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((material) => material.dispose());
    return;
  }
  mesh.material.dispose();
}

function setMeshColor(mesh: THREE.Mesh, color: string): void {
  if (Array.isArray(mesh.material)) {
    return;
  }
  if (mesh.material instanceof THREE.MeshBasicMaterial || mesh.material instanceof THREE.MeshStandardMaterial) {
    mesh.material.color.set(color);
  }
}

function setMeshOpacity(mesh: THREE.Mesh, opacity: number): void {
  const nextOpacity = Math.max(0.15, Math.min(1, opacity));
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  materials.forEach((material) => {
    material.transparent = nextOpacity < 1;
    material.opacity = nextOpacity;
    material.needsUpdate = true;
  });
}

function setObjectOpacity(object: THREE.Object3D, opacity: number): void {
  const nextOpacity = Math.max(0.15, Math.min(1, opacity));
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    const material = mesh.material;
    if (!material) {
      return;
    }
    const materials = Array.isArray(material) ? material : [material];
    materials.forEach((item) => {
      item.transparent = nextOpacity < 1;
      item.opacity = nextOpacity;
      item.needsUpdate = true;
    });
  });
}

function defaultModelStyle(index: number): ModelDisplayStyle {
  return {
    color: MODEL_STYLE_COLORS[index % MODEL_STYLE_COLORS.length],
    opacity: 1,
  };
}

function geometrySourceLabel(source: ViewerGeometrySource): string {
  if (source === "fragments") {
    return "Fragments cache";
  }
  return source === "backend" ? "IfcOpenShell servidor" : "web-ifc browser";
}

function selectedFragmentMaterial(): MaterialDefinition {
  return {
    color: new THREE.Color(SELECTED_MESH_COLOR),
    opacity: 1,
    transparent: false,
    renderedFaces: 1 as MaterialDefinition["renderedFaces"],
    preserveOriginalMaterial: true,
  };
}

async function loadBackendGeometry(ifcFileId: string): Promise<RawGeometryPayload> {
  const payload = await apiGet<ViewerGeometry>(`/ifc-files/${ifcFileId}/viewer-geometry`);
  return {
    ifc_file_id: payload.ifc_file_id,
    elements: payload.elements.map((row) => ({
      global_id: row.global_id,
      entity: row.entity,
      name: row.name,
      vertices: row.vertices,
      indices: row.indices,
    })),
  };
}

async function loadBrowserGeometry(ifcFileId: string): Promise<RawGeometryPayload> {
  const buffer = await apiGetArrayBuffer(`/ifc-files/${ifcFileId}/download`);
  const payload = await loadIfcGeometryWithWebIfc(ifcFileId, new Uint8Array(buffer));
  return {
    ifc_file_id: payload.ifc_file_id,
    elements: payload.elements.map((row) => ({
      global_id: row.global_id,
      entity: row.entity,
      name: row.name,
      vertices: row.vertices,
      indices: row.indices,
    })),
  };
}

async function loadGeometryWithEngine(
  ifcFileId: string,
  engine: ViewerEngine,
): Promise<{ geometry: RawGeometryPayload; source: ViewerGeometrySource; warning?: string }> {
  if (engine === "stable") {
    return { geometry: await loadBackendGeometry(ifcFileId), source: "backend" };
  }

  try {
    return { geometry: await loadBrowserGeometry(ifcFileId), source: "web-ifc" };
  } catch {
    return {
      geometry: await loadBackendGeometry(ifcFileId),
      source: "backend",
      warning: "O modo completo falhou neste modelo; usando geometria estavel do servidor.",
    };
  }
}

export default function ViewerPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const fragmentsRef = useRef<FragmentsModels | null>(null);
  const fragmentModelsByFileRef = useRef<Map<string, FragmentsModel>>(new Map());
  const fragmentLocalIdByKeyRef = useRef<Map<string, { model: FragmentsModel; localId: number }>>(new Map());
  const selectedFragmentRef = useRef<{ model: FragmentsModel; localId: number } | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const meshByKeyRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const selectedMeshRef = useRef<THREE.Mesh | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const highlightRef = useRef<(key: string) => void>(() => {});
  const focusSceneRef = useRef<() => void>(() => {});
  const renderGenerationRef = useRef(0);
  const fragmentOperationRef = useRef(0);
  const fragmentAppearanceRef = useRef(0);
  const renderSceneRef = useRef<() => void>(() => {});

  const [canvasHost, setCanvasHost] = useState<HTMLDivElement | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ifcFiles, setIfcFiles] = useState<IfcFile[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedIfcFileIds, setSelectedIfcFileIds] = useState<string[]>([]);
  const [activeIfcFileIds, setActiveIfcFileIds] = useState<string[]>([]);
  const [viewerElements, setViewerElements] = useState<FederatedElement[]>([]);
  const [viewerGeometry, setViewerGeometry] = useState<RenderableViewerGeometry | null>(null);
  const [viewerFragments, setViewerFragments] = useState<RenderableViewerFragments | null>(null);
  const [selectedElement, setSelectedElement] = useState<FederatedElement | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [modelStyles, setModelStyles] = useState<Record<string, ModelDisplayStyle>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ViewerElement["status"]>("all");
  const [severityFilter, setSeverityFilter] = useState<"all" | "alta" | "moderada" | "baixa">("all");
  const [disciplineFilter, setDisciplineFilter] = useState("all");
  const [colorMode, setColorMode] = useState<"discipline" | "status">("discipline");
  const viewerEngine: ViewerEngine = "fragments";
  const [activeViewerTool, setActiveViewerTool] = useState<ViewerTool>("select");
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [auditColoringEnabled, setAuditColoringEnabled] = useState(false);
  const [renderState, setRenderState] = useState<ViewerRenderState>({
    status: "idle",
    visibleElements: 0,
    totalElements: 0,
  });

  const elementByKey = useMemo(() => {
    const map = new Map<string, FederatedElement>();
    viewerElements.forEach((row) => map.set(row.key, row));
    return map;
  }, [viewerElements]);

  const groupedByStatus = useMemo(() => {
    const groups = { approved: 0, failed: 0, unknown: 0 };
    for (const item of viewerElements) {
      groups[item.status] += 1;
    }
    return groups;
  }, [viewerElements]);

  const activeDisciplineOptions = useMemo(() => {
    const values = new Set<string>();
    for (const item of ifcFiles) {
      if (selectedIfcFileIds.includes(item.id)) {
        values.add((item.discipline ?? "").toLowerCase() || "sem-disciplina");
      }
    }
    return Array.from(values).sort();
  }, [ifcFiles, selectedIfcFileIds]);

  const filteredElements = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return viewerElements.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      if (severityFilter !== "all" && (item.severity ?? null) !== severityFilter) {
        return false;
      }
      const discipline = (item.discipline ?? "").toLowerCase() || "sem-disciplina";
      if (disciplineFilter !== "all" && discipline !== disciplineFilter) {
        return false;
      }
      if (!term) {
        return true;
      }
      const searchText = `${item.global_id} ${item.entity} ${item.name ?? ""} ${item.ifc_file_name} ${item.failed_criteria_codes.join(" ")}`.toLowerCase();
      return searchText.includes(term);
    });
  }, [disciplineFilter, searchTerm, severityFilter, statusFilter, viewerElements]);

  const filteredElementKeys = useMemo(() => new Set(filteredElements.map((item) => item.key)), [filteredElements]);

  const failedElements = useMemo(
    () => filteredElements.filter((item) => item.status === "failed"),
    [filteredElements],
  );

  useEffect(() => {
    setModelStyles((current) => {
      const next: Record<string, ModelDisplayStyle> = {};
      ifcFiles.forEach((ifcFile, index) => {
        next[ifcFile.id] = current[ifcFile.id] ?? defaultModelStyle(index);
      });
      return next;
    });
  }, [ifcFiles]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveIfcFileIds(selectedIfcFileIds);
    }, 900);
    return () => window.clearTimeout(timer);
  }, [selectedIfcFileIds]);

  const highlightByKey = useCallback(
    (key: string) => {
      const mesh = meshByKeyRef.current.get(key);
      if (!mesh) {
        const fragmentTarget = fragmentLocalIdByKeyRef.current.get(key);
        if (fragmentTarget) {
          void (async () => {
            try {
              if (fragmentLocalIdByKeyRef.current.get(key) !== fragmentTarget) {
                return;
              }
              if (selectedFragmentRef.current) {
                await selectedFragmentRef.current.model.resetHighlight([selectedFragmentRef.current.localId]);
              }
              await fragmentTarget.model.highlight([fragmentTarget.localId], selectedFragmentMaterial());
              selectedFragmentRef.current = fragmentTarget;
              await fragmentsRef.current?.update(true);
              renderSceneRef.current();
            } catch {
              selectedFragmentRef.current = null;
            }
          })();
        }
        setSelectedKey(key);
        setSelectedElement(elementByKey.get(key) ?? null);
        return;
      }
      if (selectedFragmentRef.current) {
        void selectedFragmentRef.current.model.resetHighlight([selectedFragmentRef.current.localId]);
        selectedFragmentRef.current = null;
      }
      if (selectedMeshRef.current) {
        setMeshColor(selectedMeshRef.current, selectedMeshRef.current.userData.baseColor as string);
      }
      setMeshColor(mesh, SELECTED_MESH_COLOR);
      selectedMeshRef.current = mesh;
      setSelectedKey(key);
      setSelectedElement(elementByKey.get(key) ?? null);
      renderSceneRef.current();
    },
    [elementByKey],
  );

  useEffect(() => {
    highlightRef.current = highlightByKey;
  }, [highlightByKey]);

  const setCanvasContainer = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;
    setCanvasHost(node);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadInitialData() {
      setError(null);
      try {
        const loadedProjects = await apiGet<Project[]>("/projects");
        if (cancelled) {
          return;
        }
        setProjects(loadedProjects);

        const requestedIfcIds = parseQueryFileIds();
        if (requestedIfcIds.length > 0) {
          const firstFile = await apiGet<IfcFile>(`/ifc-files/${requestedIfcIds[0]}`);
          if (cancelled) {
            return;
          }
          setSelectedProjectId(firstFile.project_id);
          const files = await apiGet<IfcFile[]>(`/projects/${firstFile.project_id}/ifc-files`);
          if (cancelled) {
            return;
          }
          setIfcFiles(files);
          const validIds = requestedIfcIds.filter((id) => files.some((row) => row.id === id));
          setSelectedIfcFileIds(validIds.length ? validIds : files.slice(0, 1).map((row) => row.id));
          return;
        }

        const firstProjectId = loadedProjects[0]?.id ?? "";
        setSelectedProjectId(firstProjectId);
        if (firstProjectId) {
          const files = await apiGet<IfcFile[]>(`/projects/${firstProjectId}/ifc-files`);
          if (cancelled) {
            return;
          }
          setIfcFiles(files);
          setSelectedIfcFileIds(files.slice(0, Math.min(3, files.length)).map((row) => row.id));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar o visualizador.");
        }
      }
    }

    void loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedProjectId) {
      return;
    }
    let cancelled = false;
    async function refreshFiles() {
      try {
        const files = await apiGet<IfcFile[]>(`/projects/${selectedProjectId}/ifc-files`);
        if (cancelled) {
          return;
        }
        setIfcFiles(files);
        setSelectedIfcFileIds((current) => {
          const valid = current.filter((id) => files.some((row) => row.id === id));
          return valid.length ? valid : files.slice(0, 1).map((row) => row.id);
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar arquivos IFC.");
        }
      }
    }
    void refreshFiles();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    if (activeIfcFileIds.length === 0) {
      setViewerElements([]);
      setViewerGeometry(null);
      setViewerFragments(null);
      setSelectedElement(null);
      setSelectedKey(null);
      setAuditColoringEnabled(false);
      setRenderState({ status: "idle", visibleElements: 0, totalElements: 0 });
      return;
    }

    let cancelled = false;
    async function loadViewerPayload() {
      setLoading(true);
      setError(null);
      setRenderState({ status: "idle", visibleElements: 0, totalElements: 0 });
      try {
        const startedAt = performance.now();
        const selectedFileRows = ifcFiles.filter((row) => activeIfcFileIds.includes(row.id));
        const dataRows = await Promise.all(
          selectedFileRows.map(async (ifcFile) => {
            const data = await apiGet<ViewerData>(`/ifc-files/${ifcFile.id}/viewer-data`);
            return { ifcFile, data };
          }),
        );
        const hasAuditData = dataRows.some((row) => Boolean(row.data.audit_run_id));

        const federatedElements: FederatedElement[] = [];
        for (const row of dataRows) {
          for (const element of row.data.elements) {
            federatedElements.push({
              key: `${row.ifcFile.id}::${element.global_id}`,
              ifc_file_id: row.ifcFile.id,
              ifc_file_name: row.ifcFile.file_name,
              discipline: row.ifcFile.discipline ?? null,
              global_id: element.global_id,
              entity: element.entity,
              name: element.name,
              status: element.status,
              severity: element.severity,
              failed_criteria_codes: element.failed_criteria_codes,
            });
          }
        }

        if (viewerEngine === "fragments") {
          try {
            const cachedFragmentRows = await Promise.all(
              selectedFileRows.map(async (ifcFile) => {
                const fragment = await loadCachedViewerFragment(ifcFile.id);
                return { ifcFile, fragment };
              }),
            );
            const missingCacheRows = cachedFragmentRows.filter((row) => row.fragment === null);

            if (missingCacheRows.length === 0) {
              const fragmentRows = cachedFragmentRows.map(({ ifcFile, fragment }) => ({
                  ifc_file_id: ifcFile.id,
                  ifc_file_name: ifcFile.file_name,
                  discipline: ifcFile.discipline ?? null,
                  bytes: fragment?.bytes ?? new Uint8Array(),
                  cached: true,
                  generated: false,
              }));

              if (!cancelled) {
                setViewerElements(federatedElements);
                setAuditColoringEnabled(hasAuditData);
                setViewerGeometry(null);
                setViewerFragments({
                  source: "fragments",
                  models: fragmentRows,
                  durationMs: Math.round(performance.now() - startedAt),
                  bytes: fragmentRows.reduce((total, row) => total + row.bytes.byteLength, 0),
                });
              }
              return;
            }
          } catch {}
        }

        const geometryEngine: ViewerEngine = viewerEngine === "fragments" ? "stable" : viewerEngine;
        const geometryRows = await Promise.all(
          selectedFileRows.map(async (ifcFile) => {
            const loaded = await loadGeometryWithEngine(ifcFile.id, geometryEngine);
            return { ifcFile, ...loaded };
          }),
        );

        const federatedGeometryRows: FederatedGeometryRow[] = [];
        let triangles = 0;
        for (const row of geometryRows) {
          for (const geometryElement of row.geometry.elements) {
            federatedGeometryRows.push({
              key: `${row.ifcFile.id}::${geometryElement.global_id}`,
              ifc_file_id: row.ifcFile.id,
              global_id: geometryElement.global_id,
              entity: geometryElement.entity,
              name: geometryElement.name,
              discipline: row.ifcFile.discipline ?? null,
              vertices: geometryElement.vertices,
              indices: geometryElement.indices,
            });
            triangles += countTriangles(geometryElement.indices);
          }
        }

        if (!cancelled) {
          setViewerElements(federatedElements);
          setAuditColoringEnabled(hasAuditData);
          setViewerFragments(null);
          setViewerGeometry({
            source: geometryRows.some((row) => row.source === "web-ifc") ? "web-ifc" : "backend",
            rows: federatedGeometryRows,
            durationMs: Math.round(performance.now() - startedAt),
            triangles,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar dados do visualizador.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadViewerPayload();
    return () => {
      cancelled = true;
    };
  }, [activeIfcFileIds, ifcFiles, viewerEngine]);

  useEffect(() => {
    if (!canvasHost || rendererRef.current) {
      return;
    }

    const container = canvasHost;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#c9d1d3");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 8000);
    camera.position.set(18, 20, 24);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(container.clientWidth, container.clientHeight);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = true;
    controls.zoomSpeed = 1.15;
    controls.rotateSpeed = 0.7;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight("#ffffff", 0.9));
    const directionalLight = new THREE.DirectionalLight("#ffffff", 1.2);
    directionalLight.position.set(20, 30, 18);
    scene.add(directionalLight);

    const grid = new THREE.GridHelper(120, 60, "#7f8b8f", "#aeb8bb");
    grid.position.y = -1.2;
    scene.add(grid);

    focusSceneRef.current = () => {
      const meshes = Array.from(meshByKeyRef.current.values());
      const fragmentModels = Array.from(fragmentModelsByFileRef.current.values());
      if ((!meshes.length && !fragmentModels.length) || !cameraRef.current || !controlsRef.current) {
        return;
      }
      const bounds = new THREE.Box3();
      for (const mesh of meshes) {
        bounds.expandByObject(mesh);
      }
      for (const model of fragmentModels) {
        bounds.union(model.box);
      }
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3()).length() || 10;
      const direction = new THREE.Vector3(1.4, 1.2, 1.4).normalize();
      cameraRef.current.position.copy(center.clone().add(direction.multiplyScalar(size * 0.9)));
      controlsRef.current.target.copy(center);
      controlsRef.current.update();
      renderSceneRef.current();
    };

    let animationFrame = 0;
    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      controls.update();
      void fragmentsRef.current?.update();
      renderer.render(scene, camera);
    };
    const renderScene = () => {
      void fragmentsRef.current?.update();
      renderer.render(scene, camera);
    };
    renderSceneRef.current = renderScene;
    animate();

    const onResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) {
        return;
      }
      const { clientWidth, clientHeight } = containerRef.current;
      cameraRef.current.aspect = clientWidth / clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(clientWidth, clientHeight);
      renderSceneRef.current();
    };

    const onPointerDown = (event: PointerEvent) => {
      if (!rendererRef.current || !cameraRef.current) {
        return;
      }
      const bounds = rendererRef.current.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );

      if (fragmentModelsByFileRef.current.size > 0) {
        void (async () => {
          if (!rendererRef.current || !cameraRef.current) {
            return;
          }
          try {
            const models = Array.from(fragmentModelsByFileRef.current.values());
            const hits = await Promise.all(
              models.map(async (model) => model.raycast({
                camera: cameraRef.current as THREE.PerspectiveCamera,
                mouse: pointer,
                dom: rendererRef.current?.domElement as HTMLCanvasElement,
              })),
            );
            const hit = hits
              .filter((item): item is NonNullable<typeof item> => item !== null)
              .sort((left, right) => left.distance - right.distance)[0];
            if (!hit || !fragmentModelsByFileRef.current.has(hit.fragments.modelId)) {
              return;
            }
            const [guid] = await hit.fragments.getGuidsByLocalIds([hit.localId]);
            if (guid) {
              highlightRef.current(`${hit.fragments.modelId}::${guid}`);
            }
          } catch {
            selectedFragmentRef.current = null;
          }
        })();
        return;
      }

      raycasterRef.current.setFromCamera(pointer, cameraRef.current);
      const intersections = raycasterRef.current.intersectObjects(Array.from(meshByKeyRef.current.values()), false);
      if (!intersections.length) {
        return;
      }
      const picked = intersections[0].object as THREE.Mesh;
      const key = picked.userData.key as string;
      highlightRef.current(key);
    };

    let hoverFrame = 0;
    const onPointerMove = (event: PointerEvent) => {
      if (!rendererRef.current || !cameraRef.current) {
        return;
      }
      window.cancelAnimationFrame(hoverFrame);
      hoverFrame = window.requestAnimationFrame(() => {
        if (!rendererRef.current || !cameraRef.current) {
          return;
        }
        const bounds = rendererRef.current.domElement.getBoundingClientRect();
        const pointer = new THREE.Vector2(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        );
        raycasterRef.current.setFromCamera(pointer, cameraRef.current);
        const intersections = raycasterRef.current.intersectObjects(Array.from(meshByKeyRef.current.values()), false);
        rendererRef.current.domElement.style.cursor = intersections.length ? "pointer" : "grab";
      });
    };

    window.addEventListener("resize", onResize);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);

    cleanupRef.current = () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      window.cancelAnimationFrame(hoverFrame);
      renderer.domElement.style.cursor = "default";
      window.cancelAnimationFrame(animationFrame);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    const meshStore = meshByKeyRef.current;
    const fragmentModelStore = fragmentModelsByFileRef.current;
    const fragmentKeyStore = fragmentLocalIdByKeyRef.current;
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      for (const mesh of meshStore.values()) {
        disposeMesh(mesh);
      }
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      fragmentOperationRef.current += 1;
      const managerToDispose = fragmentsRef.current;
      fragmentsRef.current = null;
      fragmentModelStore.clear();
      fragmentKeyStore.clear();
      selectedFragmentRef.current = null;
      void managerToDispose?.dispose().catch(() => undefined);
      renderSceneRef.current = () => {};
      meshStore.clear();
      selectedMeshRef.current = null;
    };
  }, [canvasHost]);

  useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    let cancelled = false;

    async function disposeFragments() {
      const managerToDispose = fragmentsRef.current;
      fragmentsRef.current = null;
      fragmentModelsByFileRef.current.clear();
      fragmentLocalIdByKeyRef.current.clear();
      selectedFragmentRef.current = null;
      if (managerToDispose) {
        await managerToDispose.dispose().catch(() => undefined);
      }
    }

    async function renderFragments() {
      const operationId = (fragmentOperationRef.current += 1);
      await disposeFragments();
      if (!viewerFragments || !sceneRef.current || !cameraRef.current) {
        renderSceneRef.current();
        return;
      }

      setRenderState({
        status: "rendering",
        visibleElements: 0,
        totalElements: viewerElements.length,
      });

      const { FragmentsModels } = await import("@thatopen/fragments");
      if (cancelled || operationId !== fragmentOperationRef.current || !sceneRef.current || !cameraRef.current) {
        return;
      }

      const manager = new FragmentsModels(undefined, { maxWorkers: 2 });
      fragmentsRef.current = manager;
      let loadedElements = 0;

      for (const item of viewerFragments.models) {
        if (cancelled || operationId !== fragmentOperationRef.current || !sceneRef.current || !cameraRef.current) {
          return;
        }
        const buffer = new ArrayBuffer(item.bytes.byteLength);
        new Uint8Array(buffer).set(item.bytes);
        const model = await manager.load(buffer, {
          modelId: item.ifc_file_id,
          camera: cameraRef.current,
        });
        if (cancelled || operationId !== fragmentOperationRef.current || !sceneRef.current || !cameraRef.current) {
          return;
        }
        model.useCamera(cameraRef.current);
        sceneRef.current.add(model.object);
        fragmentModelsByFileRef.current.set(item.ifc_file_id, model);

        const modelElements = viewerElements.filter((row) => row.ifc_file_id === item.ifc_file_id);
        const localIds = await model.getLocalIdsByGuids(modelElements.map((row) => row.global_id));
        localIds.forEach((localId, index) => {
          if (localId !== null) {
            fragmentLocalIdByKeyRef.current.set(modelElements[index].key, { model, localId });
          }
        });
        loadedElements += modelElements.length;
        setRenderState({
          status: "rendering",
          visibleElements: loadedElements,
          totalElements: viewerElements.length,
        });
      }

      await manager.update(true);
      if (cancelled || operationId !== fragmentOperationRef.current) {
        return;
      }
      setRenderState({
        status: "ready",
        visibleElements: viewerElements.length,
        totalElements: viewerElements.length,
      });
      focusSceneRef.current();
      renderSceneRef.current();
    }

    void renderFragments();

    return () => {
      cancelled = true;
      fragmentOperationRef.current += 1;
      void disposeFragments();
    };
  }, [viewerElements, viewerFragments]);

  useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    for (const mesh of meshByKeyRef.current.values()) {
      sceneRef.current.remove(mesh);
      disposeMesh(mesh);
    }
    meshByKeyRef.current.clear();
    selectedMeshRef.current = null;
    setSelectedElement(null);
    setSelectedKey(null);

    const generation = (renderGenerationRef.current += 1);
    let cancelled = false;

    const geometryRows = viewerGeometry?.rows ?? [];
    setRenderState({
      status: geometryRows.length ? "rendering" : "idle",
      visibleElements: 0,
      totalElements: geometryRows.length,
    });
    if (!geometryRows.length) {
      renderSceneRef.current();
      return;
    }

    async function renderMeshes() {
      for (let index = 0; index < geometryRows.length; index += 1) {
        if (cancelled || renderGenerationRef.current !== generation || !sceneRef.current) {
          return;
        }
        const row = geometryRows[index];
        if (!elementByKey.has(row.key)) {
          continue;
        }

        const geometry = new THREE.BufferGeometry();
        const vertices = row.vertices instanceof Float32Array ? row.vertices : new Float32Array(row.vertices);
        const indices = row.indices instanceof Uint32Array ? row.indices : new Uint32Array(row.indices);
        geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.computeBoundingSphere();

        const item = elementByKey.get(row.key);
        const modelStyle = modelStyles[row.ifc_file_id] ?? defaultModelStyle(0);
        const baseColor = auditColoringEnabled
          ? colorMode === "status"
            ? statusColor(item?.status)
            : disciplineColor(row.discipline)
          : modelStyle.color;
        const material = new THREE.MeshBasicMaterial({
          color: baseColor,
          transparent: true,
          opacity: modelStyle.opacity,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.matrixAutoUpdate = false;
        mesh.userData = { key: row.key, baseColor };
        sceneRef.current.add(mesh);
        meshByKeyRef.current.set(row.key, mesh);

        if ((index + 1) % RENDER_BATCH_SIZE === 0) {
          renderSceneRef.current();
          setRenderState({
            status: "rendering",
            visibleElements: index + 1,
            totalElements: geometryRows.length,
          });
          await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
        }
      }

      if (cancelled || renderGenerationRef.current !== generation) {
        return;
      }
      const visibleCount = meshByKeyRef.current.size;
      setRenderState({
        status: "ready",
        visibleElements: visibleCount,
        totalElements: geometryRows.length,
      });

      if (meshByKeyRef.current.size > 0) {
        focusSceneRef.current();
      } else {
        renderSceneRef.current();
      }
    }

    void renderMeshes();
    return () => {
      cancelled = true;
    };
  }, [auditColoringEnabled, colorMode, elementByKey, modelStyles, viewerGeometry]);

  useEffect(() => {
    const meshMap = meshByKeyRef.current;
    for (const [key, mesh] of meshMap.entries()) {
      mesh.visible = filteredElementKeys.has(key);
      const item = elementByKey.get(key);
      const modelStyle = item ? modelStyles[item.ifc_file_id] ?? defaultModelStyle(0) : defaultModelStyle(0);
      const nextBaseColor = auditColoringEnabled
        ? colorMode === "status"
          ? statusColor(item?.status)
          : disciplineColor(item?.discipline)
        : modelStyle.color;
      mesh.userData.baseColor = nextBaseColor;
      setMeshOpacity(mesh, modelStyle.opacity);
      if (selectedKey !== key) {
        setMeshColor(mesh, nextBaseColor);
      }
    }

    if (fragmentLocalIdByKeyRef.current.size > 0) {
      const appearanceId = (fragmentAppearanceRef.current += 1);
      void (async () => {
        try {
          const manager = fragmentsRef.current;
          const entries = Array.from(fragmentLocalIdByKeyRef.current.entries());
          const allByModel = new Map<FragmentsModel, number[]>();
          const hiddenByModel = new Map<FragmentsModel, number[]>();
          const colorByModel = new Map<FragmentsModel, Map<string, number[]>>();
          const opacityByModel = new Map<FragmentsModel, number>();

          for (const [key, target] of entries) {
            const allIds = allByModel.get(target.model) ?? [];
            allIds.push(target.localId);
            allByModel.set(target.model, allIds);
            const item = elementByKey.get(key);
            const modelStyle = item ? modelStyles[item.ifc_file_id] ?? defaultModelStyle(0) : defaultModelStyle(0);
            opacityByModel.set(target.model, modelStyle.opacity);

            if (!filteredElementKeys.has(key)) {
              const hiddenIds = hiddenByModel.get(target.model) ?? [];
              hiddenIds.push(target.localId);
              hiddenByModel.set(target.model, hiddenIds);
            }

            if (auditColoringEnabled) {
              const color = colorMode === "status" ? statusColor(item?.status) : disciplineColor(item?.discipline);
              const byColor = colorByModel.get(target.model) ?? new Map<string, number[]>();
              const ids = byColor.get(color) ?? [];
              ids.push(target.localId);
              byColor.set(color, ids);
              colorByModel.set(target.model, byColor);
            } else {
              const byColor = colorByModel.get(target.model) ?? new Map<string, number[]>();
              const ids = byColor.get(modelStyle.color) ?? [];
              ids.push(target.localId);
              byColor.set(modelStyle.color, ids);
              colorByModel.set(target.model, byColor);
            }
          }

          for (const [model, localIds] of allByModel.entries()) {
            if (appearanceId !== fragmentAppearanceRef.current || manager !== fragmentsRef.current) {
              return;
            }
            await model.resetVisible();
            await model.resetColor(localIds);
            const hiddenIds = hiddenByModel.get(model) ?? [];
            if (hiddenIds.length > 0) {
              await model.setVisible(hiddenIds, false);
            }
            setObjectOpacity(model.object, opacityByModel.get(model) ?? 1);
            const colorGroups = colorByModel.get(model) ?? new Map<string, number[]>();
            for (const [color, ids] of colorGroups.entries()) {
              if (appearanceId !== fragmentAppearanceRef.current || manager !== fragmentsRef.current) {
                return;
              }
              await model.setColor(ids, new THREE.Color(color));
            }
          }
          if (selectedKey && !filteredElementKeys.has(selectedKey) && selectedFragmentRef.current) {
            await selectedFragmentRef.current.model.resetHighlight([selectedFragmentRef.current.localId]);
            selectedFragmentRef.current = null;
          }
          if (appearanceId !== fragmentAppearanceRef.current || manager !== fragmentsRef.current) {
            return;
          }
          await fragmentsRef.current?.update(true);
          renderSceneRef.current();
        } catch {
          selectedFragmentRef.current = null;
        }
      })();
    }

    const visibleCount = Array.from(meshMap.keys()).filter((key) => filteredElementKeys.has(key)).length;
    setRenderState((current) => ({
      ...current,
      visibleElements: viewerFragments ? filteredElements.length : visibleCount,
      totalElements: viewerFragments ? viewerElements.length : viewerGeometry?.rows.length ?? 0,
    }));

    if (selectedKey && !filteredElementKeys.has(selectedKey)) {
      if (selectedMeshRef.current) {
        setMeshColor(selectedMeshRef.current, selectedMeshRef.current.userData.baseColor as string);
      }
      selectedMeshRef.current = null;
      setSelectedKey(null);
      setSelectedElement(null);
    } else if (selectedKey && meshMap.has(selectedKey)) {
      const selectedMesh = meshMap.get(selectedKey);
      if (selectedMesh) {
        setMeshColor(selectedMesh, SELECTED_MESH_COLOR);
        selectedMeshRef.current = selectedMesh;
      }
    }
    renderSceneRef.current();
  }, [
    colorMode,
    auditColoringEnabled,
    elementByKey,
    filteredElementKeys,
    filteredElements.length,
    modelStyles,
    selectedKey,
    viewerElements.length,
    viewerFragments,
    viewerGeometry,
  ]);

  function toggleIfcFileSelection(ifcFileId: string) {
    setSelectedIfcFileIds((current) =>
      current.includes(ifcFileId) ? current.filter((id) => id !== ifcFileId) : [...current, ifcFileId],
    );
  }

  function updateModelStyle(ifcFileId: string, patch: Partial<ModelDisplayStyle>) {
    setModelStyles((current) => ({
      ...current,
      [ifcFileId]: {
        ...(current[ifcFileId] ?? defaultModelStyle(ifcFiles.findIndex((item) => item.id === ifcFileId))),
        ...patch,
      },
    }));
  }

  return (
    <AppShell variant="workspace">
      <section className="overflow-hidden rounded-lg border border-[#9aa7aa] bg-[#c9d1d3] shadow-[0_16px_44px_rgba(20,30,28,0.18)]">
        <div className="relative min-h-[calc(100vh-96px)] overflow-hidden bg-[#c9d1d3]">
            <div ref={setCanvasContainer} className="absolute inset-0 h-full w-full" />

            <div className="pointer-events-none absolute left-4 right-4 top-4 z-10 flex flex-col gap-3 lg:right-36 lg:flex-row lg:items-start lg:justify-between">
              <div className="pointer-events-auto w-full max-w-[620px] rounded-lg border border-white/25 bg-[#0f1514] p-3 text-white shadow-[0_18px_40px_rgba(0,0,0,0.42)]">
                <div className="mb-3 grid gap-2 lg:grid-cols-[minmax(220px,1fr)_190px_auto]">
                  <label className="text-[11px] font-semibold uppercase text-white/70">
                    Projeto
                    <select
                      className="mt-1 h-9 w-full rounded-md border border-white/20 bg-white px-2 text-sm font-medium text-[#203a33] outline-none focus:ring-2 focus:ring-white/30"
                      onChange={(event) => setSelectedProjectId(event.target.value)}
                      value={selectedProjectId}
                    >
                      <option value="">Selecione</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-[11px] font-semibold uppercase text-white/70">
                    Cor da auditoria
                    <span className="mt-1 grid h-9 grid-cols-2 overflow-hidden rounded-md border border-white/25 bg-[#263432] p-1">
                      <button
                        className={`rounded-md text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                          auditColoringEnabled && colorMode === "discipline"
                            ? "bg-white text-[#203a33] shadow-sm"
                            : "text-white hover:bg-white/15"
                        }`}
                        disabled={!auditColoringEnabled}
                        onClick={() => setColorMode("discipline")}
                        type="button"
                      >
                        Disc.
                      </button>
                      <button
                        className={`rounded-md text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                          auditColoringEnabled && colorMode === "status"
                            ? "bg-white text-[#203a33] shadow-sm"
                            : "text-white hover:bg-white/15"
                        }`}
                        disabled={!auditColoringEnabled}
                        onClick={() => setColorMode("status")}
                        type="button"
                      >
                        Status
                      </button>
                    </span>
                  </label>

                  <button
                    className="mt-5 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-white px-3 text-sm font-semibold text-[#203a33] transition hover:bg-[#e7f0ea] lg:mt-auto"
                    onClick={() => focusSceneRef.current()}
                    type="button"
                  >
                    <LocateFixed className="h-4 w-4" />
                    Enquadrar
                  </button>
                </div>

                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6a62]" />
                  <input
                    className="h-11 w-full rounded-md border border-white/20 bg-white pl-9 pr-3 text-sm text-[#203a33] outline-none focus:ring-2 focus:ring-white/30"
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar GlobalId, tipo, nome ou criterio"
                    value={searchTerm}
                  />
                </label>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  <select
                    className="h-9 rounded-md border border-white/20 bg-white px-2 text-sm text-[#203a33]"
                    onChange={(event) => setStatusFilter(event.target.value as "all" | ViewerElement["status"])}
                    value={statusFilter}
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border border-white/20 bg-white px-2 text-sm text-[#203a33]"
                    onChange={(event) => setSeverityFilter(event.target.value as "all" | "alta" | "moderada" | "baixa")}
                    value={severityFilter}
                  >
                    {SEVERITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border border-white/20 bg-white px-2 text-sm text-[#203a33]"
                    onChange={(event) => setDisciplineFilter(event.target.value)}
                    value={disciplineFilter}
                  >
                    <option value="all">Todas disciplinas</option>
                    {activeDisciplineOptions.map((discipline) => (
                      <option key={discipline} value={discipline}>
                        {discipline === "sem-disciplina" ? "Sem disciplina" : discipline}
                      </option>
                    ))}
                  </select>
                </div>
                {ifcFiles.length > 1 && (
                  <div className="mt-3 rounded-md border border-white/18 bg-white/8 p-2">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold uppercase text-white/70">Modelos exibidos</span>
                      <span className="text-[11px] text-white/60">
                        {selectedIfcFileIds.length}/{ifcFiles.length}
                      </span>
                    </div>
                    <div className="max-h-44 space-y-2 overflow-y-auto pr-1">
                      {ifcFiles.map((ifcFile, index) => {
                        const style = modelStyles[ifcFile.id] ?? defaultModelStyle(index);
                        const checked = selectedIfcFileIds.includes(ifcFile.id);
                        return (
                          <div className="rounded-md border border-white/14 bg-black/18 p-2" key={ifcFile.id}>
                            <label className="flex items-center gap-2 text-xs font-medium text-white">
                              <input
                                checked={checked}
                                className="h-4 w-4"
                                onChange={() => toggleIfcFileSelection(ifcFile.id)}
                                type="checkbox"
                              />
                              <span className="min-w-0 flex-1 truncate">{ifcFile.file_name}</span>
                            </label>
                            <div className="mt-2 grid grid-cols-[34px_1fr_42px] items-center gap-2">
                              <input
                                aria-label={`Cor de ${ifcFile.file_name}`}
                                className="h-8 w-8 rounded border border-white/30 bg-transparent"
                                disabled={!checked}
                                onChange={(event) => updateModelStyle(ifcFile.id, { color: event.target.value })}
                                type="color"
                                value={style.color}
                              />
                              <input
                                aria-label={`Transparencia de ${ifcFile.file_name}`}
                                className="w-full accent-white"
                                disabled={!checked}
                                max={100}
                                min={15}
                                onChange={(event) =>
                                  updateModelStyle(ifcFile.id, { opacity: Number(event.target.value) / 100 })
                                }
                                type="range"
                                value={Math.round(style.opacity * 100)}
                              />
                              <span className="text-right text-[11px] text-white/70">{Math.round(style.opacity * 100)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pointer-events-auto grid grid-cols-3 gap-2 lg:min-w-[360px]">
                <div className="rounded-lg border border-white/25 bg-[#0f1514] px-3 py-2 text-white shadow-[0_18px_40px_rgba(0,0,0,0.36)]">
                  <span className="text-xs font-semibold uppercase text-white/68">Visiveis</span>
                  <strong className="mt-1 block text-lg text-white">
                    {renderState.visibleElements}/{renderState.totalElements}
                  </strong>
                </div>
                <div className="rounded-lg border border-white/25 bg-[#0f1514] px-3 py-2 text-white shadow-[0_18px_40px_rgba(0,0,0,0.36)]">
                  <span className="text-xs font-semibold uppercase text-white/68">Falhas</span>
                  <strong className="mt-1 block text-lg text-[#ff8b7d]">{groupedByStatus.failed}</strong>
                </div>
                <div className="rounded-lg border border-white/25 bg-[#0f1514] px-3 py-2 text-white shadow-[0_18px_40px_rgba(0,0,0,0.36)]">
                  <span className="text-xs font-semibold uppercase text-white/68">Aprovados</span>
                  <strong className="mt-1 block text-lg text-[#9ce0b0]">{groupedByStatus.approved}</strong>
                </div>
              </div>
            </div>

            {error && (
              <div className="absolute left-4 top-[210px] z-10 max-w-2xl space-y-2">
                <p className="rounded-md bg-coral/95 px-3 py-2 text-sm font-medium text-white shadow-lg">{error}</p>
              </div>
            )}

            <div className="absolute bottom-4 left-4 z-10 max-w-lg rounded-lg border border-white/22 bg-[#0f1514] p-3 text-white shadow-[0_18px_40px_rgba(0,0,0,0.38)]">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md bg-white/16 px-2 py-1 text-white">
                  <Eye className="h-3.5 w-3.5" />
                  Clique para inspecionar
                </span>
                <span className="rounded-md bg-white/16 px-2 py-1 text-white">Arraste para orbitar</span>
                <span className="rounded-md bg-white/16 px-2 py-1 text-white">Roda para zoom</span>
              </div>
            </div>

            <div className="absolute left-4 top-[30rem] z-20 flex flex-col items-center rounded-lg border border-white/28 bg-black p-2 shadow-[0_18px_44px_rgba(0,0,0,0.55)]">
              {VIEWER_TOOL_OPTIONS.map((tool, index) => {
                const Icon = tool.icon;
                const active = activeViewerTool === tool.value;
                return (
                  <div className="flex flex-col items-center" key={tool.value}>
                    {index === 3 || index === 5 ? <span className="my-2 h-px w-8 bg-white/18" /> : null}
                    <button
                      aria-label={tool.label}
                      className={`inline-flex h-11 w-11 items-center justify-center rounded-md transition ${
                        active ? "bg-white text-[#0f1514]" : "text-white hover:bg-white/20"
                      }`}
                      onClick={() => {
                        if (tool.value === "fit") {
                          focusSceneRef.current();
                        }
                        setActiveViewerTool(tool.value);
                      }}
                      title={tool.label}
                      type="button"
                    >
                      <Icon className="h-5 w-5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {loading && (
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-transparent text-white">
                <div className="rounded-lg border border-white/25 bg-[#203a33] px-4 py-3 text-sm shadow-[0_18px_48px_rgba(0,0,0,0.45)]">
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                  Carregando geometria
                </div>
              </div>
            )}

          <button
            aria-label={inspectorOpen ? "Ocultar painel do viewer" : "Abrir painel do viewer"}
            className="absolute right-4 top-4 z-30 inline-flex h-10 items-center gap-2 rounded-md border border-white/28 bg-black px-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(0,0,0,0.45)] transition hover:bg-[#203a33]"
            onClick={() => setInspectorOpen((current) => !current)}
            type="button"
          >
            {inspectorOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            <span className="hidden sm:inline">{inspectorOpen ? "Ocultar painel" : "Painel"}</span>
          </button>

          <aside
            className={`absolute bottom-4 right-4 top-16 z-20 w-[min(390px,calc(100%-2rem))] overflow-y-auto rounded-lg border border-white/18 bg-[#f8faf7]/96 p-3 shadow-[0_22px_60px_rgba(0,0,0,0.28)] backdrop-blur transition duration-200 ${
              inspectorOpen ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-[calc(100%+2rem)] opacity-0"
            }`}
          >
            <div className="mb-3 flex items-center justify-between rounded-md border border-[#d3ded8] bg-white px-3 py-2">
              <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#203a33]">
                <SlidersHorizontal className="h-4 w-4 text-[#6a6f2f]" />
                Painel do viewer
              </div>
              <button
                aria-label="Fechar painel do viewer"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#d3ded8] text-[#203a33] transition hover:bg-[#eef5f2]"
                onClick={() => setInspectorOpen(false)}
                type="button"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <section className="rounded-lg border border-[#d3ded8] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-[#6a6f2f]">Inspector</p>
                    <h2 className="mt-1 text-lg font-semibold text-[#203a33]">Elemento selecionado</h2>
                  </div>
                  {selectedKey && (
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-[#d3ded8] px-3 text-sm font-semibold text-[#203a33] hover:bg-[#eef5f2]"
                      onClick={() => highlightByKey(selectedKey)}
                      type="button"
                    >
                      <LocateFixed className="h-4 w-4 text-[#6a6f2f]" />
                      Focar
                    </button>
                  )}
                </div>

                {selectedElement ? (
                  <dl className="mt-4 space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-[#5d6a62]">Modelo</dt>
                      <dd className="mt-1 font-medium text-[#203a33]">{selectedElement.ifc_file_name}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-[#5d6a62]">GlobalId</dt>
                      <dd className="mt-1 break-all font-mono text-xs text-[#203a33]">{selectedElement.global_id}</dd>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <dt className="text-xs font-semibold uppercase text-[#5d6a62]">Tipo</dt>
                        <dd className="mt-1 text-[#203a33]">{selectedElement.entity}</dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold uppercase text-[#5d6a62]">Status</dt>
                        <dd className="mt-1 capitalize text-[#203a33]">{selectedElement.status}</dd>
                      </div>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-4 rounded-md border border-[#d3ded8] bg-[#eef5f2] p-3 text-sm text-[#5d6a62]">
                    Selecione um elemento no modelo para ver propriedades e falhas relacionadas.
                  </p>
                )}
              </section>

              {(viewerGeometry || viewerFragments) && (
                <section className="rounded-lg border border-[#d3ded8] bg-white p-4">
                  <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#203a33]">
                    <Gauge className="h-4 w-4 text-[#6a6f2f]" />
                    Performance
                  </div>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between gap-3 rounded-md bg-[#f8faf7] px-3 py-2">
                      <span className="text-[#5d6a62]">Fonte</span>
                      <strong>{geometrySourceLabel(viewerFragments?.source ?? viewerGeometry?.source ?? "backend")}</strong>
                    </div>
                    <div className="flex justify-between gap-3 rounded-md bg-[#f8faf7] px-3 py-2">
                      <span className="text-[#5d6a62]">Tempo</span>
                      <strong>{viewerFragments?.durationMs ?? viewerGeometry?.durationMs} ms</strong>
                    </div>
                    <div className="flex justify-between gap-3 rounded-md bg-[#f8faf7] px-3 py-2">
                      <span className="text-[#5d6a62]">{viewerFragments ? "Cache" : "Triangulos"}</span>
                      <strong>
                        {viewerFragments
                          ? `${Math.round(viewerFragments.bytes / 1024).toLocaleString("pt-BR")} KB`
                          : viewerGeometry?.triangles.toLocaleString("pt-BR")}
                      </strong>
                    </div>
                  </div>
                </section>
              )}

              <section className="rounded-lg border border-[#d3ded8] bg-white p-4">
                <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#203a33]">
                  <Layers3 className="h-4 w-4 text-[#6a6f2f]" />
                  Modelos carregados
                </div>
                <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                  {ifcFiles.length === 0 ? (
                    <p className="text-sm text-[#5d6a62]">Nenhum modelo no projeto.</p>
                  ) : (
                    ifcFiles.map((ifcFile, index) => {
                      const style = modelStyles[ifcFile.id] ?? defaultModelStyle(index);
                      const checked = selectedIfcFileIds.includes(ifcFile.id);
                      return (
                        <div className="rounded-md border border-[#dce6df] px-3 py-2 text-sm" key={ifcFile.id}>
                          <label className="flex items-center gap-3">
                            <input
                              checked={checked}
                              onChange={() => toggleIfcFileSelection(ifcFile.id)}
                              type="checkbox"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-[#203a33]">{ifcFile.file_name}</span>
                              <span className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${disciplineTagTone(ifcFile.discipline)}`}>
                                {ifcFile.discipline ?? "sem disciplina"}
                              </span>
                            </span>
                          </label>
                          <div className="mt-2 grid grid-cols-[34px_1fr_42px] items-center gap-2">
                            <input
                              aria-label={`Cor de ${ifcFile.file_name}`}
                              className="h-8 w-8 rounded border border-[#d3ded8]"
                              disabled={!checked}
                              onChange={(event) => updateModelStyle(ifcFile.id, { color: event.target.value })}
                              type="color"
                              value={style.color}
                            />
                            <input
                              aria-label={`Transparencia de ${ifcFile.file_name}`}
                              className="w-full accent-[#203a33]"
                              disabled={!checked}
                              max={100}
                              min={15}
                              onChange={(event) => updateModelStyle(ifcFile.id, { opacity: Number(event.target.value) / 100 })}
                              type="range"
                              value={Math.round(style.opacity * 100)}
                            />
                            <span className="text-right text-xs text-[#5d6a62]">{Math.round(style.opacity * 100)}%</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-[#d3ded8] bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#203a33]">
                    <AlertTriangle className="h-4 w-4 text-coral" />
                    Falhas
                  </div>
                  <span className="rounded-md bg-coral/10 px-2 py-1 text-xs font-semibold text-coral">
                    {failedElements.length}
                  </span>
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {failedElements.length === 0 ? (
                    <p className="text-sm text-[#5d6a62]">Nenhuma falha para os filtros atuais.</p>
                  ) : (
                    failedElements.map((item) => (
                      <button
                        className="w-full rounded-md border border-[#dce6df] px-3 py-2 text-left text-xs transition hover:bg-[#f8faf7]"
                        key={item.key}
                        onClick={() => highlightByKey(item.key)}
                        type="button"
                      >
                        <span className="block truncate font-medium text-[#203a33]">{item.entity}</span>
                        <span className="mt-1 block truncate font-mono text-[#5d6a62]">{item.global_id}</span>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-lg border border-[#d3ded8] bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#203a33]">
                    <Filter className="h-4 w-4 text-[#6a6f2f]" />
                    Elementos filtrados
                  </div>
                  <span className="rounded-md bg-[#eef5f2] px-2 py-1 text-xs font-semibold text-[#203a33]">
                    {filteredElements.length}
                  </span>
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {filteredElements.length === 0 ? (
                    <p className="text-sm text-[#5d6a62]">Nenhum elemento encontrado.</p>
                  ) : (
                    filteredElements.slice(0, 120).map((item) => (
                      <button
                        className={`w-full rounded-md border px-3 py-2 text-left text-xs transition ${
                          selectedKey === item.key ? "border-[#d8b34e] bg-[#fff7e4]" : "border-[#dce6df] hover:bg-[#f8faf7]"
                        }`}
                        key={item.key}
                        onClick={() => highlightByKey(item.key)}
                        type="button"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-medium text-[#203a33]">{item.entity}</span>
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                              item.status === "failed"
                                ? "bg-coral/15 text-coral"
                                : item.status === "approved"
                                  ? "bg-moss/15 text-moss"
                                  : "bg-steel/15 text-steel"
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                        <div className="mt-1 truncate font-mono text-[#5d6a62]">{item.global_id}</div>
                      </button>
                    ))
                  )}
                </div>
                {filteredElements.length > 120 ? (
                  <p className="mt-2 text-xs text-[#5d6a62]">Mostrando 120 de {filteredElements.length} elementos.</p>
                ) : null}
              </section>
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
