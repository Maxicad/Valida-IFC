"use client";

import { AlertTriangle, CheckCircle2, Eye, Loader2, MinusCircle, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { apiGet } from "@/services/api";
import type { IfcFile, Project, ViewerData, ViewerElement, ViewerGeometry } from "@/types/api";

type ElementStatus = "approved" | "failed" | "unknown";

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

  const [projects, setProjects] = useState<Project[]>([]);
  const [ifcFiles, setIfcFiles] = useState<IfcFile[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedIfcFileId, setSelectedIfcFileId] = useState("");
  const [viewerData, setViewerData] = useState<ViewerData | null>(null);
  const [viewerGeometry, setViewerGeometry] = useState<ViewerGeometry | null>(null);
  const [selectedElement, setSelectedElement] = useState<ViewerElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (selectedMeshRef.current && selectedMeshRef.current.material instanceof THREE.MeshStandardMaterial) {
        selectedMeshRef.current.material.emissive.set("#000000");
        selectedMeshRef.current.material.emissiveIntensity = 0;
      }
      if (mesh.material instanceof THREE.MeshStandardMaterial) {
        mesh.material.emissive.set("#d5e0e7");
        mesh.material.emissiveIntensity = 0.45;
      }
      selectedMeshRef.current = mesh;
      setSelectedElement(elementByGuid.get(globalId) ?? null);

      const box = new THREE.Box3().setFromObject(mesh);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3()).length() || 10;
      const direction = new THREE.Vector3(1.4, 1.2, 1.4).normalize();
      cameraRef.current?.position.copy(center.clone().add(direction.multiplyScalar(size)));
      controlsRef.current?.target.copy(center);
      controlsRef.current?.update();
    },
    [elementByGuid]
  );

  useEffect(() => {
    highlightRef.current = highlightByGlobalId;
  }, [highlightByGlobalId]);

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
      return;
    }

    let cancelled = false;
    async function loadViewerPayload() {
      setLoading(true);
      setError(null);
      try {
        const [data, geometry] = await Promise.all([
          apiGet<ViewerData>(`/ifc-files/${selectedIfcFileId}/viewer-data`),
          apiGet<ViewerGeometry>(`/ifc-files/${selectedIfcFileId}/viewer-geometry`),
        ]);
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
    if (!containerRef.current || rendererRef.current) {
      return;
    }

    const container = containerRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#dbe4e8");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 5000);
    camera.position.set(14, 16, 20);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controlsRef.current = controls;

    scene.add(new THREE.AmbientLight("#ffffff", 0.75));
    const directionalLight = new THREE.DirectionalLight("#ffffff", 1.2);
    directionalLight.position.set(20, 30, 18);
    scene.add(directionalLight);

    const grid = new THREE.GridHelper(80, 48, "#6c8088", "#9cb0b7");
    grid.position.y = -1.2;
    scene.add(grid);

    let animationId = 0;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animationId = requestAnimationFrame(animate);

    const onResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) {
        return;
      }
      const { clientWidth, clientHeight } = containerRef.current;
      cameraRef.current.aspect = clientWidth / clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(clientWidth, clientHeight);
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
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      controls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };

    const meshStore = meshByGuidRef.current;
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      meshStore.clear();
      selectedMeshRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    for (const mesh of meshByGuidRef.current.values()) {
      sceneRef.current.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    meshByGuidRef.current.clear();
    selectedMeshRef.current = null;

    const geometryRows = viewerGeometry?.elements ?? [];
    if (!geometryRows.length) {
      return;
    }

    const codeNeedle = criteriaCodeFilter.trim().toLowerCase();
    const guidNeedle = globalIdSearch.trim().toLowerCase();

    for (const row of geometryRows) {
      const elementStatus = elementByGuid.get(row.global_id);
      if (!elementStatus) {
        continue;
      }

      if (!statusFilter[elementStatus.status]) {
        continue;
      }
      const severityKey = elementStatus.severity ?? "none";
      if (!severityFilter[severityKey]) {
        continue;
      }
      if (guidNeedle && !row.global_id.toLowerCase().includes(guidNeedle)) {
        continue;
      }
      if (
        codeNeedle &&
        !elementStatus.failed_criteria_codes.some((code) => code.toLowerCase().includes(codeNeedle))
      ) {
        continue;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(row.vertices, 3));
      geometry.setIndex(row.indices);
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        color: statusColor(elementStatus.status, elementStatus.severity),
        roughness: 0.45,
        metalness: 0.12,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = { globalId: row.global_id };
      sceneRef.current.add(mesh);
      meshByGuidRef.current.set(row.global_id, mesh);
    }

    const firstGlobalId = Array.from(meshByGuidRef.current.keys())[0];
    if (firstGlobalId) {
      highlightByGlobalId(firstGlobalId);
    }
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
        Geometria IFC renderizada a partir do backend com filtros por status, severidade e criterios.
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
            <span>Elementos renderizados: {meshByGuidRef.current.size}</span>
          )}
        </div>
      </section>

      {error && <p className="mb-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

      <section className="grid min-h-[680px] gap-4 xl:grid-cols-[1fr_380px]">
        <div className="relative overflow-hidden rounded-lg border border-line bg-[#dbe4e8]">
          <div ref={containerRef} className="h-[680px] w-full" />
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
