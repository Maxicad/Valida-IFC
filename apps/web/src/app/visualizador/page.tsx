"use client";

import { AlertTriangle, CheckCircle2, Eye, Loader2, MinusCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { apiGet } from "@/services/api";
import type { IfcFile, Project, ViewerData, ViewerElement } from "@/types/api";

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

export default function ViewerPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const meshesRef = useRef<THREE.Mesh[]>([]);
  const selectedMeshRef = useRef<THREE.Mesh | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [ifcFiles, setIfcFiles] = useState<IfcFile[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedIfcFileId, setSelectedIfcFileId] = useState("");
  const [requestedIfcFileId, setRequestedIfcFileId] = useState("");
  const [viewerData, setViewerData] = useState<ViewerData | null>(null);
  const [selectedElement, setSelectedElement] = useState<ViewerElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupedByStatus = useMemo(() => {
    const groups = { approved: 0, failed: 0, unknown: 0 };
    for (const item of viewerData?.elements ?? []) {
      groups[item.status] += 1;
    }
    return groups;
  }, [viewerData]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const queryIfcFileId = new URLSearchParams(window.location.search).get("ifc_file_id");
    setRequestedIfcFileId(queryIfcFileId ?? "");
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
  }, [requestedIfcFileId]);

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
      setSelectedElement(null);
      return;
    }

    let cancelled = false;
    async function loadViewerData() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet<ViewerData>(`/ifc-files/${selectedIfcFileId}/viewer-data`);
        if (!cancelled) {
          setViewerData(data);
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
    void loadViewerData();
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

    const camera = new THREE.PerspectiveCamera(55, container.clientWidth / container.clientHeight, 0.1, 1000);
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

    const grid = new THREE.GridHelper(40, 24, "#6c8088", "#9cb0b7");
    grid.position.y = -1.2;
    scene.add(grid);

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    let animationId = requestAnimationFrame(animate);

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
      const intersections = raycasterRef.current.intersectObjects(meshesRef.current, false);
      if (!intersections.length) {
        return;
      }

      const picked = intersections[0].object as THREE.Mesh;
      highlightMesh(picked);
      setSelectedElement(picked.userData.element as ViewerElement);
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

    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      meshesRef.current = [];
      selectedMeshRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) {
      return;
    }

    meshesRef.current.forEach((mesh) => {
      sceneRef.current?.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });
    meshesRef.current = [];
    selectedMeshRef.current = null;

    const elements = viewerData?.elements ?? [];
    if (!elements.length) {
      return;
    }

    const columns = Math.max(4, Math.ceil(Math.sqrt(elements.length)));
    const spacing = 2.2;

    elements.forEach((element, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;
      const geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
      const material = new THREE.MeshStandardMaterial({
        color: statusColor(element.status, element.severity),
        roughness: 0.45,
        metalness: 0.12,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set((col - columns / 2) * spacing, 0.2 + (element.status === "failed" ? 0.4 : 0), row * -spacing);
      mesh.userData = { element };
      sceneRef.current?.add(mesh);
      meshesRef.current.push(mesh);
    });

    if (meshesRef.current[0]) {
      highlightMesh(meshesRef.current[0]);
    }
  }, [viewerData]);

  function highlightMesh(mesh: THREE.Mesh) {
    if (selectedMeshRef.current && selectedMeshRef.current.material instanceof THREE.MeshStandardMaterial) {
      selectedMeshRef.current.material.emissive.set("#000000");
      selectedMeshRef.current.material.emissiveIntensity = 0;
    }
    if (mesh.material instanceof THREE.MeshStandardMaterial) {
      mesh.material.emissive.set("#d5e0e7");
      mesh.material.emissiveIntensity = 0.45;
    }
    selectedMeshRef.current = mesh;
  }

  return (
    <AppShell>
      <h1 className="mb-2 text-2xl font-semibold">Visualizador IFC</h1>
      <p className="mb-6 text-sm text-ink/65">
        Visualizacao 3D inicial conectada ao backend, com cores por resultado de auditoria e selecao por GlobalId.
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
              Carregando dados do modelo
            </span>
          ) : (
            <span>Elementos: {viewerData?.elements.length ?? 0}</span>
          )}
        </div>
      </section>

      {error && <p className="mb-4 rounded-md bg-coral/10 px-3 py-2 text-sm text-coral">{error}</p>}

      <section className="grid min-h-[680px] gap-4 xl:grid-cols-[1fr_360px]">
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
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
                Elemento selecionado
              </h2>
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
                    <dt className="text-ink/60">Nome</dt>
                    <dd className="text-right">{selectedElement.name ?? "-"}</dd>
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
                Criterios com falha
              </div>
              {selectedElement?.failed_criteria_codes.length ? (
                <ul className="space-y-1">
                  {selectedElement.failed_criteria_codes.map((code) => (
                    <li key={code} className="font-mono text-xs">
                      {code}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-ink/60">Sem criterios reprovados para este elemento.</p>
              )}
            </div>
          </div>
        </Card>
      </section>
    </AppShell>
  );
}
