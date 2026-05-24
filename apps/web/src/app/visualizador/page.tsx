"use client";

import { AlertTriangle, CheckCircle2, Eye, Gauge, Loader2, MinusCircle, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { loadIfcGeometryWithWebIfc } from "@/lib/web-ifc-loader";
import { apiGet, apiGetArrayBuffer } from "@/services/api";
import type {
  IfcFile,
  Project,
  ViewerData,
  ViewerElement,
  ViewerGeometry,
  ViewerGeometryElement,
} from "@/types/api";

type ElementStatus = "approved" | "failed" | "unknown";
type ViewerGeometrySource = "web-ifc" | "backend";

interface RenderableGeometryElement extends Omit<ViewerGeometryElement, "vertices" | "indices"> {
  vertices: Float32Array | number[];
  indices: Uint32Array | number[];
}

interface ViewerLoadStats {
  bytes?: number;
  duration_ms: number;
  elements: number;
  triangles: number;
  used_heap_mb?: number;
}

interface RenderableViewerGeometry {
  ifc_file_id: string;
  source: ViewerGeometrySource;
  elements: RenderableGeometryElement[];
  stats: ViewerLoadStats;
}

interface ViewerRenderState {
  status: "idle" | "rendering" | "ready";
  visibleElements: number;
  totalElements: number;
  durationMs?: number;
}

const RENDER_BATCH_SIZE = 35;
const LARGE_MODEL_TRIANGLE_WARNING = 250_000;
const LARGE_MODEL_CANVAS_TRIANGLE_BUDGET = 450_000;
const LARGE_MODEL_CANVAS_ELEMENT_BUDGET = 800;

function statusColor(status: ElementStatus, severity?: ViewerElement["severity"]): string {
  if (status === "approved") {
    return "#2f7a44";
  }
  if (status === "failed") {
    if (severity === "moderada") {
      return "#cc8a2d";
    }
    if (severity === "baixa") {
      return "#c2a536";
    }
    return "#bf3a3a";
  }
  return "#6a7a83";
}

function parseQueryIfcFileId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return new URLSearchParams(window.location.search).get("ifc_file_id") ?? "";
}

function countTriangles(elements: ViewerGeometry["elements"]): number {
  return elements.reduce((total, element) => total + Math.floor(element.indices.length / 3), 0);
}

function countElementTriangles(element: RenderableGeometryElement): number {
  return Math.floor(element.indices.length / 3);
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
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

async function loadBackendGeometry(ifcFileId: string): Promise<RenderableViewerGeometry> {
  const startedAt = performance.now();
  const geometry = await apiGet<ViewerGeometry>(`/ifc-files/${ifcFileId}/viewer-geometry`);
  return {
    ...geometry,
    source: "backend",
    stats: {
      duration_ms: Math.round(performance.now() - startedAt),
      elements: geometry.elements.length,
      triangles: countTriangles(geometry.elements),
    },
  };
}

async function loadBrowserGeometry(ifcFileId: string): Promise<RenderableViewerGeometry> {
  const buffer = await apiGetArrayBuffer(`/ifc-files/${ifcFileId}/download`);
  const geometry = await loadIfcGeometryWithWebIfc(ifcFileId, new Uint8Array(buffer));
  return geometry;
}

export default function ViewerPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const meshByGuidRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const selectedMeshRef = useRef<THREE.Mesh | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const highlightRef = useRef<(globalId: string) => void>(() => {});
  const renderGenerationRef = useRef(0);
  const renderSceneRef = useRef<() => void>(() => {});

  const [canvasHost, setCanvasHost] = useState<HTMLDivElement | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [ifcFiles, setIfcFiles] = useState<IfcFile[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedIfcFileId, setSelectedIfcFileId] = useState("");
  const [viewerData, setViewerData] = useState<ViewerData | null>(null);
  const [viewerGeometry, setViewerGeometry] = useState<RenderableViewerGeometry | null>(null);
  const [selectedElement, setSelectedElement] = useState<ViewerElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaderWarning, setLoaderWarning] = useState<string | null>(null);
  const [renderState, setRenderState] = useState<ViewerRenderState>({
    status: "idle",
    visibleElements: 0,
    totalElements: 0,
  });

  const [statusFilter, setStatusFilter] = useState<Record<ElementStatus, boolean>>({
    approved: true,
    failed: true,
    unknown: true,
  });
  const [severityFilter, setSeverityFilter] = useState<Record<string, boolean>>({
    alta: true,
    moderada: true,
    baixa: true,
    none: true,
  });
  const [criteriaCodeFilter, setCriteriaCodeFilter] = useState("");
  const [globalIdSearch, setGlobalIdSearch] = useState("");

  const elementByGuid = useMemo(() => {
    const map = new Map<string, ViewerElement>();
    for (const element of viewerData?.elements ?? []) {
      map.set(element.global_id, element);
    }
    return map;
  }, [viewerData]);

  const groupedByStatus = useMemo(() => {
    const groups = { approved: 0, failed: 0, unknown: 0 };
    for (const item of viewerData?.elements ?? []) {
      groups[item.status] += 1;
    }
    return groups;
  }, [viewerData]);

  const failedElements = useMemo(
    () => (viewerData?.elements ?? []).filter((item) => item.status === "failed"),
    [viewerData]
  );

  const filteredFailedElements = useMemo(() => {
    const codeNeedle = criteriaCodeFilter.trim().toLowerCase();
    const guidNeedle = globalIdSearch.trim().toLowerCase();
    return failedElements.filter((item) => {
      if (guidNeedle && !item.global_id.toLowerCase().includes(guidNeedle)) {
        return false;
      }
      if (!statusFilter[item.status]) {
        return false;
      }
      const severityKey = item.severity ?? "none";
      if (!severityFilter[severityKey]) {
        return false;
      }
      if (codeNeedle) {
        return item.failed_criteria_codes.some((code) => code.toLowerCase().includes(codeNeedle));
      }
      return true;
    });
  }, [criteriaCodeFilter, failedElements, globalIdSearch, severityFilter, statusFilter]);

  const highlightByGlobalId = useCallback(
    (globalId: string) => {
      const mesh = meshByGuidRef.current.get(globalId);
      if (!mesh) {
        return;
      }
      if (selectedMeshRef.current) {
        setMeshColor(selectedMeshRef.current, selectedMeshRef.current.userData.baseColor as string);
      }
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.emissive.set("#000000");
        mesh.material.emissiveIntensity = 0;
      }
      setMeshColor(mesh, "#d5e0e7");
      selectedMeshRef.current = mesh;
      setSelectedElement(elementByGuid.get(globalId) ?? null);

      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length() || 10;
      const direction = new THREE.Vector3(1.4, 1.2, 1.4).normalize();
      cameraRef.current?.position.copy(center.clone().add(direction.multiplyScalar(size)));
      controlsRef.current?.target.copy(center);
      controlsRef.current?.update();
      renderSceneRef.current();
    },
    [elementByGuid]
  );

  useEffect(() => {
    highlightRef.current = highlightByGlobalId;
  }, [highlightByGlobalId]);

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

        const requestedIfcFileId = parseQueryIfcFileId();
        if (requestedIfcFileId) {
          const ifcFile = await apiGet<IfcFile>(`/ifc-files/${requestedIfcFileId}`);
          if (cancelled) {
            return;
          }
          setSelectedProjectId(ifcFile.project_id);
          setSelectedIfcFileId(ifcFile.id);
          await loadIfcFilesForProject(ifcFile.project_id, ifcFile.id);
          return;
        }

        const firstProjectId = loadedProjects[0]?.id ?? "";
        setSelectedProjectId(firstProjectId);
        if (firstProjectId) {
          await loadIfcFilesForProject(firstProjectId);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Nao foi possivel carregar viewer.");
        }
      }
    }

    async function loadIfcFilesForProject(projectId: string, preferredIfcFileId?: string) {
      const loadedFiles = await apiGet<IfcFile[]>(`/projects/${projectId}/ifc-files`);
      if (cancelled) {
        return;
      }
      setIfcFiles(loadedFiles);
      setSelectedIfcFileId(preferredIfcFileId ?? loadedFiles[0]?.id ?? "");
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
        setSelectedIfcFileId((current) => {
          if (current && files.some((row) => row.id === current)) {
            return current;
          }
          return files[0]?.id ?? "";
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Nao foi possivel carregar arquivos IFC.");
        }
      }
    }
    void refreshFiles();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedIfcFileId) {
      setViewerData(null);
      setViewerGeometry(null);
      setSelectedElement(null);
      setRenderState({ status: "idle", visibleElements: 0, totalElements: 0 });
      return;
    }

    let cancelled = false;
    async function loadViewerPayload() {
      setLoading(true);
      setError(null);
      setLoaderWarning(null);
      setRenderState({ status: "idle", visibleElements: 0, totalElements: 0 });
      try {
        const dataPromise = apiGet<ViewerData>(`/ifc-files/${selectedIfcFileId}/viewer-data`);
        let geometry: RenderableViewerGeometry;
        try {
          geometry = await loadBrowserGeometry(selectedIfcFileId);
          if (!geometry.elements.length) {
            throw new Error("web-ifc nao retornou elementos com geometria.");
          }
        } catch (browserErr) {
          geometry = await loadBackendGeometry(selectedIfcFileId);
          if (!cancelled) {
            const message = browserErr instanceof Error ? browserErr.message : "falha desconhecida";
            setLoaderWarning(`Loader web-ifc indisponivel para este modelo; usando geometria backend (${message}).`);
          }
        }
        const data = await dataPromise;
        if (!cancelled) {
          setViewerData(data);
          setViewerGeometry(geometry);
          setSelectedElement(data.elements[0] ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Nao foi possivel carregar dados do viewer.");
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
  }, [selectedIfcFileId]);

  useEffect(() => {
    if (!canvasHost || rendererRef.current) {
      return;
    }

    const container = canvasHost;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#dbe4e8");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 5000);
    camera.position.set(14, 16, 20);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight("#ffffff", 0.75));
    const directionalLight = new THREE.DirectionalLight("#ffffff", 1.2);
    directionalLight.position.set(20, 30, 18);
    scene.add(directionalLight);

    const grid = new THREE.GridHelper(80, 48, "#6c8088", "#9cb0b7");
    grid.position.y = -1.2;
    scene.add(grid);

    const renderScene = () => {
      renderer.render(scene, camera);
    };
    renderSceneRef.current = renderScene;
    controls.addEventListener("change", renderScene);
    renderScene();

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
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1
      );

      raycasterRef.current.setFromCamera(pointer, cameraRef.current);
      const intersections = raycasterRef.current.intersectObjects(
        Array.from(meshByGuidRef.current.values()),
        false
      );
      if (!intersections.length) {
        return;
      }

      const picked = intersections[0].object as THREE.Mesh;
      const globalId = picked.userData.globalId as string;
      highlightRef.current(globalId);
    };

    window.addEventListener("resize", onResize);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    cleanupRef.current = () => {
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      controls.removeEventListener("change", renderScene);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };

    const meshStore = meshByGuidRef.current;
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
      renderSceneRef.current = () => {};
      meshStore.clear();
      selectedMeshRef.current = null;
    };
  }, [canvasHost]);

  useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    for (const mesh of meshByGuidRef.current.values()) {
      sceneRef.current.remove(mesh);
      disposeMesh(mesh);
    }
    meshByGuidRef.current.clear();
    selectedMeshRef.current = null;

    const generation = (renderGenerationRef.current += 1);
    let cancelled = false;

    const geometryRows = viewerGeometry?.elements ?? [];
    setRenderState({
      status: geometryRows.length ? "rendering" : "idle",
      visibleElements: 0,
      totalElements: geometryRows.length,
    });
    if (!geometryRows.length) {
      renderSceneRef.current();
      return;
    }

    const codeNeedle = criteriaCodeFilter.trim().toLowerCase();
    const guidNeedle = globalIdSearch.trim().toLowerCase();
    const filteredRows = geometryRows.filter((row) => {
      const elementStatus = elementByGuid.get(row.global_id);
      if (!elementStatus) {
        return false;
      }

      if (!statusFilter[elementStatus.status]) {
        return false;
      }
      const severityKey = elementStatus.severity ?? "none";
      if (!severityFilter[severityKey]) {
        return false;
      }
      if (guidNeedle && !row.global_id.toLowerCase().includes(guidNeedle)) {
        return false;
      }
      if (
        codeNeedle &&
        !elementStatus.failed_criteria_codes.some((code) => code.toLowerCase().includes(codeNeedle))
      ) {
        return false;
      }

      return true;
    });
    const rowsToRender: RenderableGeometryElement[] = [];
    let budgetTriangles = 0;
    const enforceLargeModelBudget = viewerGeometry
      ? viewerGeometry.stats.triangles >= LARGE_MODEL_TRIANGLE_WARNING && !guidNeedle
      : false;

    for (const row of filteredRows) {
      const rowTriangles = countElementTriangles(row);
      const exceedsElementBudget = rowsToRender.length >= LARGE_MODEL_CANVAS_ELEMENT_BUDGET;
      const exceedsTriangleBudget =
        budgetTriangles > 0 && budgetTriangles + rowTriangles > LARGE_MODEL_CANVAS_TRIANGLE_BUDGET;
      if (enforceLargeModelBudget && (exceedsElementBudget || exceedsTriangleBudget)) {
        break;
      }
      rowsToRender.push(row);
      budgetTriangles += rowTriangles;
    }

    if (!rowsToRender.length) {
      setRenderState({ status: "ready", visibleElements: 0, totalElements: geometryRows.length, durationMs: 0 });
      setSelectedElement(null);
      renderSceneRef.current();
      return;
    }

    async function renderMeshes() {
      const startedAt = performance.now();
      for (let index = 0; index < rowsToRender.length; index += 1) {
        if (cancelled || renderGenerationRef.current !== generation || !sceneRef.current) {
          return;
        }

        const row = rowsToRender[index];
        const elementStatus = elementByGuid.get(row.global_id);
        if (!elementStatus) {
          continue;
        }

        const geometry = new THREE.BufferGeometry();
        const vertices = row.vertices instanceof Float32Array ? row.vertices : new Float32Array(row.vertices);
        const indices = row.indices instanceof Uint32Array ? row.indices : new Uint32Array(row.indices);
        geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.computeBoundingSphere();

        const baseColor = statusColor(elementStatus.status, elementStatus.severity);
        const material = new THREE.MeshBasicMaterial({
          color: baseColor,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.matrixAutoUpdate = false;
        mesh.userData = { globalId: row.global_id, baseColor };
        sceneRef.current.add(mesh);
        meshByGuidRef.current.set(row.global_id, mesh);

        if ((index + 1) % RENDER_BATCH_SIZE === 0) {
          renderSceneRef.current();
          setRenderState({
            status: "rendering",
            visibleElements: index + 1,
            totalElements: filteredRows.length,
          });
          await nextAnimationFrame();
        }
      }

      if (cancelled || renderGenerationRef.current !== generation) {
        return;
      }

      const durationMs = Math.round(performance.now() - startedAt);
      setRenderState({
        status: "ready",
        visibleElements: meshByGuidRef.current.size,
        totalElements: filteredRows.length,
        durationMs,
      });

      const firstGlobalId = Array.from(meshByGuidRef.current.keys())[0];
      if (firstGlobalId) {
        highlightByGlobalId(firstGlobalId);
      } else {
        renderSceneRef.current();
      }
    }

    void renderMeshes();

    return () => {
      cancelled = true;
    };
  }, [criteriaCodeFilter, elementByGuid, globalIdSearch, highlightByGlobalId, severityFilter, statusFilter, viewerGeometry]);

  function toggleStatus(status: ElementStatus) {
    setStatusFilter((current) => ({ ...current, [status]: !current[status] }));
  }

  function toggleSeverity(key: "alta" | "moderada" | "baixa" | "none") {
    setSeverityFilter((current) => ({ ...current, [key]: !current[key] }));
  }

  return (
    <AppShell>
      <h1 className="mb-2 text-2xl font-semibold">Visualizador IFC</h1>
      <p className="mb-6 text-sm text-ink/65">
        Geometria IFC renderizada no navegador com web-ifc, mantendo fallback backend para auditoria e inspecao.
      </p>

      <section className="mb-4 grid gap-3 rounded-lg border border-line bg-panel p-4 md:grid-cols-3">
        <label className="text-sm font-medium">
          Projeto
          <select
            className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
          >
            <option value="">Selecione</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Arquivo IFC
          <select
            className="mt-2 h-10 w-full rounded-md border border-line bg-white px-3"
            value={selectedIfcFileId}
            onChange={(event) => setSelectedIfcFileId(event.target.value)}
          >
            <option value="">Selecione</option>
            {ifcFiles.map((ifcFile) => (
              <option key={ifcFile.id} value={ifcFile.id}>
                {ifcFile.file_name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end justify-end gap-2 text-sm text-ink/70">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando malha IFC
            </span>
          ) : (
            <span>
              {viewerGeometry?.source === "web-ifc" ? "Browser web-ifc" : "Geometria backend"}:{" "}
              {renderState.totalElements > renderState.visibleElements
                ? `${renderState.visibleElements}/${renderState.totalElements}`
                : renderState.visibleElements}{" "}
              elementos
            </span>
          )}
        </div>
      </section>

      {error && <p className="mb-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}
      {loaderWarning && (
        <p className="mb-4 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">{loaderWarning}</p>
      )}
      {viewerGeometry?.stats.triangles && viewerGeometry.stats.triangles >= LARGE_MODEL_TRIANGLE_WARNING && (
        <p className="mb-4 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-800">
          Modelo volumoso detectado. A malha e montada em lotes para manter a interface responsiva durante filtros,
          selecao e navegacao.
        </p>
      )}

      {viewerGeometry && (
        <section className="mb-4 grid gap-3 rounded-lg border border-line bg-panel p-4 text-sm md:grid-cols-5">
          <div className="inline-flex items-center gap-2 font-medium">
            <Gauge className="h-4 w-4 text-steel" />
            {viewerGeometry.source === "web-ifc" ? "Loader browser" : "Fallback backend"}
          </div>
          <div>
            <span className="text-ink/55">Tempo</span>
            <strong className="ml-2">{viewerGeometry.stats.duration_ms} ms</strong>
          </div>
          <div>
            <span className="text-ink/55">Triangulos</span>
            <strong className="ml-2">{viewerGeometry.stats.triangles.toLocaleString("pt-BR")}</strong>
          </div>
          <div>
            <span className="text-ink/55">Heap</span>
            <strong className="ml-2">
              {viewerGeometry.stats.used_heap_mb ? `${viewerGeometry.stats.used_heap_mb} MB` : "n/d"}
            </strong>
          </div>
          <div>
            <span className="text-ink/55">Canvas</span>
            <strong className="ml-2">
              {renderState.status === "rendering"
                ? `${renderState.visibleElements}/${renderState.totalElements}`
                : renderState.totalElements > renderState.visibleElements
                  ? `${renderState.visibleElements}/${renderState.totalElements}`
                  : `${renderState.visibleElements}`}
            </strong>
            {renderState.durationMs != null && (
              <span className="ml-1 text-ink/55">em {renderState.durationMs} ms</span>
            )}
          </div>
        </section>
      )}

      <section className="grid min-h-[680px] gap-4 xl:grid-cols-[1fr_380px]">
        <div className="relative overflow-hidden rounded-lg border border-line bg-[#dbe4e8]">
          <div ref={setCanvasContainer} className="h-[680px] w-full" />
        </div>

        <Card>
          <div className="space-y-4">
            <div className="rounded-md bg-surface p-3 text-sm">
              <p className="font-semibold">Resumo do status</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <span className="rounded-md bg-moss/15 px-2 py-2 text-moss">
                  <CheckCircle2 className="mx-auto mb-1 h-4 w-4" />
                  {groupedByStatus.approved}
                </span>
                <span className="rounded-md bg-coral/15 px-2 py-2 text-coral">
                  <AlertTriangle className="mx-auto mb-1 h-4 w-4" />
                  {groupedByStatus.failed}
                </span>
                <span className="rounded-md bg-steel/15 px-2 py-2 text-steel">
                  <MinusCircle className="mx-auto mb-1 h-4 w-4" />
                  {groupedByStatus.unknown}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Filtros</h2>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <button
                  className={`rounded-md border px-2 py-1 ${statusFilter.approved ? "border-moss text-moss" : "border-line"}`}
                  onClick={() => toggleStatus("approved")}
                  type="button"
                >
                  Aprovado
                </button>
                <button
                  className={`rounded-md border px-2 py-1 ${statusFilter.failed ? "border-coral text-coral" : "border-line"}`}
                  onClick={() => toggleStatus("failed")}
                  type="button"
                >
                  Reprovado
                </button>
                <button
                  className={`rounded-md border px-2 py-1 ${statusFilter.unknown ? "border-steel text-steel" : "border-line"}`}
                  onClick={() => toggleStatus("unknown")}
                  type="button"
                >
                  Sem status
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 text-sm">
                {(["alta", "moderada", "baixa", "none"] as const).map((severityKey) => (
                  <button
                    key={severityKey}
                    className={`rounded-md border px-2 py-1 ${severityFilter[severityKey] ? "border-ink text-ink" : "border-line text-ink/40"}`}
                    onClick={() => toggleSeverity(severityKey)}
                    type="button"
                  >
                    {severityKey === "none" ? "sem" : severityKey}
                  </button>
                ))}
              </div>
              <label className="block text-sm">
                Codigo do criterio
                <input
                  className="mt-1 h-9 w-full rounded-md border border-line px-2"
                  value={criteriaCodeFilter}
                  onChange={(event) => setCriteriaCodeFilter(event.target.value)}
                  placeholder="ex: IFC-PROP"
                />
              </label>
              <label className="block text-sm">
                Buscar GlobalId
                <div className="mt-1 flex items-center rounded-md border border-line bg-white px-2">
                  <Search className="h-4 w-4 text-ink/50" />
                  <input
                    className="h-9 w-full px-2"
                    value={globalIdSearch}
                    onChange={(event) => setGlobalIdSearch(event.target.value)}
                    placeholder="ex: 2jHf..."
                  />
                </div>
              </label>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">Elemento selecionado</h2>
              {selectedElement ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/60">GlobalId</dt>
                    <dd className="font-mono text-xs">{selectedElement.global_id}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/60">Tipo</dt>
                    <dd>{selectedElement.entity}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/60">Status</dt>
                    <dd className="capitalize">{selectedElement.status}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/60">Criticidade</dt>
                    <dd className="capitalize">{selectedElement.severity ?? "-"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-ink/60">Selecione um elemento no canvas.</p>
              )}
            </div>

            <div className="rounded-md bg-surface p-3 text-sm text-ink/70">
              <div className="mb-2 inline-flex items-center gap-2 font-medium">
                <Eye className="h-4 w-4" />
                Falhas clicaveis ({filteredFailedElements.length})
              </div>
              <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
                {filteredFailedElements.length === 0 ? (
                  <p className="text-ink/60">Nenhuma falha para os filtros atuais.</p>
                ) : (
                  filteredFailedElements.map((item) => (
                    <button
                      key={item.global_id}
                      className="w-full rounded-md border border-line px-2 py-2 text-left text-xs hover:bg-white"
                      onClick={() => highlightByGlobalId(item.global_id)}
                      type="button"
                    >
                      <div className="font-mono">{item.global_id}</div>
                      <div className="mt-1 truncate">{item.failed_criteria_codes.join(", ") || "sem codigo"}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
