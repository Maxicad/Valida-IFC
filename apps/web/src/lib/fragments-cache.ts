import { ApiError, apiGet, apiGetArrayBuffer, apiPutUpload } from "@/services/api";
import type { ViewerFragmentCache } from "@/types/api";

export interface ViewerFragmentBytes {
  bytes: Uint8Array;
  cached: boolean;
  generated: boolean;
}

const fragmentMemoryCache = new Map<string, Uint8Array>();

async function convertIfcToFragments(ifcBytes: Uint8Array): Promise<Uint8Array> {
  const { IfcImporter } = await import("@thatopen/fragments");
  const importer = new IfcImporter();
  importer.wasm = {
    absolute: true,
    path: `${window.location.origin}/web-ifc/`,
  };
  importer.webIfcSettings = {
    COORDINATE_TO_ORIGIN: true,
  };
  return importer.process({ bytes: ifcBytes });
}

async function uploadFragmentCache(ifcFileId: string, bytes: Uint8Array): Promise<void> {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const formData = new FormData();
  formData.append("file", new File([buffer], `${ifcFileId}.frag`, { type: "application/octet-stream" }));
  await apiPutUpload<ViewerFragmentCache>(`/ifc-files/${ifcFileId}/viewer-fragment`, formData);
}

export async function loadOrCreateViewerFragment(ifcFileId: string): Promise<ViewerFragmentBytes> {
  const memoryBytes = fragmentMemoryCache.get(ifcFileId);
  if (memoryBytes) {
    return { bytes: memoryBytes, cached: true, generated: false };
  }

  try {
    const cached = await apiGetArrayBuffer(`/ifc-files/${ifcFileId}/viewer-fragment`);
    const bytes = new Uint8Array(cached);
    fragmentMemoryCache.set(ifcFileId, bytes);
    return { bytes, cached: true, generated: false };
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 404) {
      throw err;
    }
  }

  const ifcBuffer = await apiGetArrayBuffer(`/ifc-files/${ifcFileId}/download`);
  const fragmentBytes = await convertIfcToFragments(new Uint8Array(ifcBuffer));
  await uploadFragmentCache(ifcFileId, fragmentBytes);
  fragmentMemoryCache.set(ifcFileId, fragmentBytes);
  return { bytes: fragmentBytes, cached: false, generated: true };
}

export async function loadCachedViewerFragment(ifcFileId: string): Promise<ViewerFragmentBytes | null> {
  const memoryBytes = fragmentMemoryCache.get(ifcFileId);
  if (memoryBytes) {
    return { bytes: memoryBytes, cached: true, generated: false };
  }

  const metadata = await apiGet<ViewerFragmentCache>(`/ifc-files/${ifcFileId}/viewer-fragment-cache`);
  if (!metadata.cached) {
    return null;
  }

  const cached = await apiGetArrayBuffer(`/ifc-files/${ifcFileId}/viewer-fragment`);
  const bytes = new Uint8Array(cached);
  fragmentMemoryCache.set(ifcFileId, bytes);
  return { bytes, cached: true, generated: false };
}
