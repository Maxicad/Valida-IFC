"use client";

import {
  AlertTriangle,
  Eye,
  Filter,
  Gauge,
  Layers3,
  LocateFixed,
  MousePointer2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const elements = [
  { id: "2fT9kP3D1A8xYbL0mN", name: "Parede eixo A", type: "IfcWall", status: "approved", discipline: "Arquitetura", severity: "baixa" },
  { id: "8KpL4mQ2V7sXcR9tE1", name: "Viga nivel 2", type: "IfcBeam", status: "failed", discipline: "Estrutura", severity: "alta" },
  { id: "5QaZ8nB3T2pLkR6hM4", name: "Duto principal", type: "IfcFlowSegment", status: "failed", discipline: "Instalacoes", severity: "moderada" },
  { id: "9MxC2vB7N1qWsE5rT8", name: "Laje cobertura", type: "IfcSlab", status: "approved", discipline: "Estrutura", severity: "baixa" },
  { id: "1HkN6vZ4P8aQmT3cS2", name: "Ambiente 204", type: "IfcSpace", status: "unknown", discipline: "Arquitetura", severity: "baixa" },
];

function statusTone(status: string): string {
  if (status === "failed") {
    return "bg-[#f7dfda] text-[#b8503f]";
  }
  if (status === "approved") {
    return "bg-[#dceee6] text-[#34765a]";
  }
  return "bg-[#e6edf1] text-[#4f6d7c]";
}

function disciplineColor(discipline: string): number {
  if (discipline === "Arquitetura") {
    return 0x2f6f73;
  }
  if (discipline === "Estrutura") {
    return 0x9a7130;
  }
  return 0x3f7b5f;
}

export default function ModernViewerConceptPage() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const [selectedId, setSelectedId] = useState(elements[1].id);
  const [query, setQuery] = useState("");
  const selectedElement = elements.find((item) => item.id === selectedId) ?? elements[0];

  const filteredElements = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) {
      return elements;
    }
    return elements.filter((item) => `${item.id} ${item.name} ${item.type} ${item.discipline}`.toLowerCase().includes(term));
  }, [query]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x162320);
    scene.fog = new THREE.Fog(0x162320, 28, 78);

    const camera = new THREE.PerspectiveCamera(45, host.clientWidth / host.clientHeight, 0.1, 1000);
    camera.position.set(12, 9, 13);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.6, 0);
    controlsRef.current = controls;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3935, 1.8));
    const sun = new THREE.DirectionalLight(0xffffff, 2.4);
    sun.position.set(14, 20, 12);
    sun.castShadow = true;
    scene.add(sun);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 28),
      new THREE.MeshStandardMaterial({ color: 0xdde7e1, roughness: 0.82 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.04;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(34, 24, 0x87a199, 0xc5d6d0);
    scene.add(grid);

    const group = new THREE.Group();
    const blockSpecs = [
      { x: -5, y: 1.3, z: -2.2, sx: 1.2, sy: 2.6, sz: 7.2, element: elements[0] },
      { x: -1.2, y: 3.4, z: -2.2, sx: 8.4, sy: 0.6, sz: 0.8, element: elements[1] },
      { x: 3.8, y: 2.2, z: 0.6, sx: 0.7, sy: 0.7, sz: 7.4, element: elements[2] },
      { x: 0.2, y: 0.18, z: 0, sx: 9.8, sy: 0.36, sz: 7.8, element: elements[3] },
      { x: 1.2, y: 1.2, z: 1.3, sx: 2.6, sy: 2.4, sz: 2.4, element: elements[4] },
    ];

    blockSpecs.forEach((spec) => {
      const material = new THREE.MeshStandardMaterial({
        color: disciplineColor(spec.element.discipline),
        roughness: 0.64,
        metalness: 0.08,
        transparent: true,
        opacity: spec.element.status === "unknown" ? 0.42 : 0.84,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(spec.sx, spec.sy, spec.sz), material);
      mesh.position.set(spec.x, spec.y, spec.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: spec.element.status === "failed" ? 0xff7a59 : 0xffffff, transparent: true, opacity: 0.42 }),
      );
      edges.position.copy(mesh.position);
      edges.scale.copy(mesh.scale);
      group.add(edges);
    });
    scene.add(group);

    camera.lookAt(0, 1.6, 0);
    controls.update();
    renderer.render(scene, camera);

    const animate = () => {
      controls.update();
      group.rotation.y += 0.0008;
      renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(animate);

    const onResize = () => {
      camera.aspect = host.clientWidth / host.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(host.clientWidth, host.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      renderer.setAnimationLoop(null);
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) {
            object.material.forEach((material) => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  function frameScene() {
    cameraRef.current?.position.set(12, 9, 13);
    controlsRef.current?.target.set(0, 1.6, 0);
    controlsRef.current?.update();
  }

  return (
    <main className="min-h-screen bg-[#e9efec] px-4 py-6 text-[#203a33] md:px-6">
      <section className="mx-auto w-full max-w-[1500px]">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <Link className="text-sm font-semibold underline-offset-4 hover:underline" href="/visualizador">
              Voltar ao visualizador atual
            </Link>
            <h1 className="mt-2 text-3xl font-semibold">Visualizador IFC Next</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex h-10 items-center gap-2 rounded-md border border-[#d3ded8] bg-white px-3 text-sm font-semibold" type="button">
              <SlidersHorizontal className="h-4 w-4 text-[#6a6f2f]" />
              Aparencia
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[#203a33] px-3 text-sm font-semibold text-white"
              onClick={frameScene}
              type="button"
            >
              <LocateFixed className="h-4 w-4" />
              Enquadrar
            </button>
          </div>
        </div>

        <div className="grid overflow-hidden rounded-lg border border-[#d3ded8] bg-white shadow-[0_18px_48px_rgba(45,42,35,0.11)] xl:grid-cols-[minmax(0,1fr)_390px]">
          <section className="relative min-h-[780px] bg-[#162320]">
            <div className="absolute inset-0" ref={hostRef} />

            <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="pointer-events-auto w-full max-w-xl rounded-lg border border-white/15 bg-white/90 p-3 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5d6a62]" />
                  <input
                    className="h-11 w-full rounded-md border border-[#d3ded8] bg-white pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#6a6f2f]/25"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar GlobalId, tipo ou disciplina"
                    value={query}
                  />
                </label>
                <div className="mt-2 grid gap-2 md:grid-cols-3">
                  {["Status", "Disciplina", "Severidade"].map((item) => (
                    <button
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[#d3ded8] bg-[#f8faf7] text-sm font-semibold text-[#203a33]"
                      key={item}
                      type="button"
                    >
                      <Filter className="h-3.5 w-3.5 text-[#6a6f2f]" />
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pointer-events-auto grid grid-cols-3 gap-2 lg:min-w-[360px]">
                <div className="rounded-lg border border-white/15 bg-white/86 px-3 py-2 shadow-[0_18px_40px_rgba(0,0,0,0.16)] backdrop-blur">
                  <span className="text-xs font-semibold uppercase text-[#5d6a62]">Elementos</span>
                  <strong className="mt-1 block text-lg text-[#203a33]">1.248</strong>
                </div>
                <div className="rounded-lg border border-white/15 bg-white/86 px-3 py-2 shadow-[0_18px_40px_rgba(0,0,0,0.16)] backdrop-blur">
                  <span className="text-xs font-semibold uppercase text-[#5d6a62]">Falhas</span>
                  <strong className="mt-1 block text-lg text-[#b8503f]">11</strong>
                </div>
                <div className="rounded-lg border border-white/15 bg-white/86 px-3 py-2 shadow-[0_18px_40px_rgba(0,0,0,0.16)] backdrop-blur">
                  <span className="text-xs font-semibold uppercase text-[#5d6a62]">Score</span>
                  <strong className="mt-1 block text-lg text-[#34765a]">86%</strong>
                </div>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 z-10 max-w-xl rounded-lg border border-white/15 bg-[#203a33]/92 p-3 text-white shadow-[0_18px_40px_rgba(0,0,0,0.2)] backdrop-blur">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md bg-white/12 px-2 py-1">
                  <MousePointer2 className="h-3.5 w-3.5" />
                  Selecionar elemento
                </span>
                <span className="rounded-md bg-white/12 px-2 py-1">Orbitar</span>
                <span className="rounded-md bg-white/12 px-2 py-1">Zoom</span>
                <span className="rounded-md bg-white/12 px-2 py-1">Pan</span>
              </div>
            </div>
          </section>

          <aside className="border-t border-[#d3ded8] bg-[#f8faf7] p-4 xl:border-l xl:border-t-0">
            <div className="space-y-4">
              <section className="rounded-lg border border-[#d3ded8] bg-white p-4">
                <p className="text-xs font-semibold uppercase text-[#6a6f2f]">Inspector</p>
                <h2 className="mt-1 text-lg font-semibold text-[#203a33]">{selectedElement.name}</h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold uppercase text-[#5d6a62]">GlobalId</dt>
                    <dd className="mt-1 break-all font-mono text-xs text-[#203a33]">{selectedElement.id}</dd>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-[#5d6a62]">Tipo</dt>
                      <dd className="mt-1 text-[#203a33]">{selectedElement.type}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-[#5d6a62]">Status</dt>
                      <dd className={`mt-1 inline-flex rounded-md px-2 py-1 text-xs font-semibold ${statusTone(selectedElement.status)}`}>
                        {selectedElement.status}
                      </dd>
                    </div>
                  </div>
                </dl>
              </section>

              <section className="rounded-lg border border-[#d3ded8] bg-white p-4">
                <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#203a33]">
                  <Gauge className="h-4 w-4 text-[#6a6f2f]" />
                  Performance
                </div>
                {[
                  ["Fonte", "Fragments cache"],
                  ["Tempo", "312 ms"],
                  ["Triangulos", "186.420"],
                ].map(([label, value]) => (
                  <div className="mb-2 flex justify-between gap-3 rounded-md bg-[#f8faf7] px-3 py-2 text-sm last:mb-0" key={label}>
                    <span className="text-[#5d6a62]">{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </section>

              <section className="rounded-lg border border-[#d3ded8] bg-white p-4">
                <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#203a33]">
                  <Layers3 className="h-4 w-4 text-[#6a6f2f]" />
                  Modelos federados
                </div>
                {["Arquitetura.ifc", "Estrutura.ifc", "Instalacoes.ifc"].map((model) => (
                  <label className="mb-2 flex items-center gap-3 rounded-md border border-[#dce6df] px-3 py-2 text-sm last:mb-0" key={model}>
                    <input defaultChecked type="checkbox" />
                    <span className="truncate font-medium text-[#203a33]">{model}</span>
                  </label>
                ))}
              </section>

              <section className="rounded-lg border border-[#d3ded8] bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#203a33]">
                    <AlertTriangle className="h-4 w-4 text-[#b8503f]" />
                    Falhas prioritarias
                  </div>
                  <span className="rounded-md bg-[#f7dfda] px-2 py-1 text-xs font-semibold text-[#b8503f]">11</span>
                </div>
                <div className="space-y-2">
                  {elements.filter((item) => item.status === "failed").map((item) => (
                    <button
                      className={`w-full rounded-md border px-3 py-2 text-left text-xs transition ${
                        selectedId === item.id ? "border-[#d8b34e] bg-[#fff7e4]" : "border-[#dce6df] hover:bg-[#f8faf7]"
                      }`}
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      type="button"
                    >
                      <span className="block truncate font-medium text-[#203a33]">{item.name}</span>
                      <span className="mt-1 block truncate font-mono text-[#5d6a62]">{item.id}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-lg border border-[#d3ded8] bg-white p-4">
                <div className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#203a33]">
                  <Eye className="h-4 w-4 text-[#6a6f2f]" />
                  Elementos
                </div>
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {filteredElements.map((item) => (
                    <button
                      className={`w-full rounded-md border px-3 py-2 text-left text-xs transition ${
                        selectedId === item.id ? "border-[#d8b34e] bg-[#fff7e4]" : "border-[#dce6df] hover:bg-[#f8faf7]"
                      }`}
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-[#203a33]">{item.name}</span>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${statusTone(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="mt-1 truncate font-mono text-[#5d6a62]">{item.id}</div>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
