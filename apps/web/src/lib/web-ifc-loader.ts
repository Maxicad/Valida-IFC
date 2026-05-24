import * as THREE from "three";
import type { FlatMesh, IfcAPI as IfcAPIType } from "web-ifc";

export interface BrowserIfcGeometryElement {
  global_id: string;
  entity: string;
  name?: string | null;
  express_id?: number | null;
  vertices: Float32Array;
  indices: Uint32Array;
}

export interface BrowserIfcLoadStats {
  bytes: number;
  duration_ms: number;
  elements: number;
  triangles: number;
  used_heap_mb?: number;
}

export interface BrowserIfcGeometry {
  ifc_file_id: string;
  source: "web-ifc";
  elements: BrowserIfcGeometryElement[];
  stats: BrowserIfcLoadStats;
}

type IfcLineValue = { value?: unknown };
type IfcLine = {
  Name?: IfcLineValue;
  GlobalId?: IfcLineValue;
};

function readLineValue(value: IfcLineValue | undefined): string | null {
  if (!value || value.value == null) {
    return null;
  }
  const text = String(value.value).trim();
  return text || null;
}

function usedHeapMb(): number | undefined {
  const runtime = performance as Performance & {
    memory?: { usedJSHeapSize?: number };
  };
  const heap = runtime.memory?.usedJSHeapSize;
  return typeof heap === "number" ? Math.round((heap / 1024 / 1024) * 10) / 10 : undefined;
}

function appendPlacedGeometry(
  ifcApi: IfcAPIType,
  modelId: number,
  flatMesh: FlatMesh,
): { vertices: Float32Array; indices: Uint32Array; triangles: number } {
  const positions: number[] = [];
  const indices: number[] = [];
  const vertex = new THREE.Vector3();

  for (let index = 0; index < flatMesh.geometries.size(); index += 1) {
    const placedGeometry = flatMesh.geometries.get(index);
    const geometry = ifcApi.GetGeometry(modelId, placedGeometry.geometryExpressID);
    const vertexData = ifcApi.GetVertexArray(geometry.GetVertexData(), geometry.GetVertexDataSize());
    const indexData = ifcApi.GetIndexArray(geometry.GetIndexData(), geometry.GetIndexDataSize());
    const stride = vertexData.length % 6 === 0 ? 6 : 3;
    const matrix = new THREE.Matrix4().fromArray(placedGeometry.flatTransformation);
    const vertexOffset = positions.length / 3;

    for (let vertexIndex = 0; vertexIndex < vertexData.length; vertexIndex += stride) {
      vertex.set(vertexData[vertexIndex], vertexData[vertexIndex + 1], vertexData[vertexIndex + 2]);
      vertex.applyMatrix4(matrix);
      positions.push(vertex.x, vertex.y, vertex.z);
    }

    for (let faceIndex = 0; faceIndex < indexData.length; faceIndex += 1) {
      indices.push(indexData[faceIndex] + vertexOffset);
    }
  }

  return {
    vertices: new Float32Array(positions),
    indices: new Uint32Array(indices),
    triangles: Math.floor(indices.length / 3),
  };
}

export async function loadIfcGeometryWithWebIfc(
  ifcFileId: string,
  bytes: Uint8Array,
): Promise<BrowserIfcGeometry> {
  const WebIFC = await import("web-ifc");
  const ifcApi = new WebIFC.IfcAPI();
  const startedAt = performance.now();
  const elements: BrowserIfcGeometryElement[] = [];
  let modelId = -1;
  let triangles = 0;

  ifcApi.SetWasmPath("/web-ifc/", true);
  await ifcApi.Init();

  try {
    modelId = ifcApi.OpenModel(bytes, { COORDINATE_TO_ORIGIN: true });
    if (modelId < 0) {
      throw new Error("web-ifc nao conseguiu abrir o modelo IFC.");
    }

    ifcApi.StreamAllMeshes(modelId, (flatMesh) => {
      try {
        const globalId = ifcApi.GetGuidFromExpressId(modelId, flatMesh.expressID);
        if (typeof globalId !== "string" || !globalId) {
          return;
        }

        const geometry = appendPlacedGeometry(ifcApi, modelId, flatMesh);
        if (!geometry.indices.length || !geometry.vertices.length) {
          return;
        }

        const line = ifcApi.GetLine(modelId, flatMesh.expressID, false) as IfcLine;
        const lineType = ifcApi.GetLineType(modelId, flatMesh.expressID) as number;
        const entity = ifcApi.GetNameFromTypeCode(lineType) as string;

        triangles += geometry.triangles;
        elements.push({
          global_id: globalId,
          entity,
          name: readLineValue(line.Name),
          express_id: flatMesh.expressID,
          vertices: geometry.vertices,
          indices: geometry.indices,
        });
      } finally {
        const disposableFlatMesh = flatMesh as FlatMesh & { delete?: () => void };
        disposableFlatMesh.delete?.();
      }
    });
  } finally {
    if (modelId >= 0) {
      ifcApi.CloseModel(modelId);
    }
  }

  return {
    ifc_file_id: ifcFileId,
    source: "web-ifc",
    elements,
    stats: {
      bytes: bytes.byteLength,
      duration_ms: Math.round(performance.now() - startedAt),
      elements: elements.length,
      triangles,
      used_heap_mb: usedHeapMb(),
    },
  };
}
