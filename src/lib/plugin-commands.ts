import { fetch } from '@tauri-apps/plugin-http';
import { tauriInvoke } from './tauri-api';

type JsonRecord = Record<string, unknown>;

export interface ModrinthProject {
  slug: string;
  project_id?: string;
  title: string;
  description: string;
  author?: string;
  icon_url: string;
  downloads: number;
  project_type: string;
}

export interface HangarProject {
  name: string;
  namespace: { owner: string; slug: string };
  stats: { downloads: number; stars: number };
  description: string;
  avatarUrl: string;
}

export interface HangarDownloadInfo {
  downloadUrl: string;
  externalUrl: string | null;
  fileName: string | null;
}

export interface HangarVersion {
  name: string;
  downloads: Record<string, HangarDownloadInfo>;
  platformDependencies: Record<string, string[]>;
}

export interface HangarResolvedDownload {
  versionName: string;
  fileName: string;
  downloadUrl: string;
}

export interface SpigetResource {
  id: number;
  name: string;
  tag: string;
  downloads: number;
  premium: boolean;
  external: boolean;
  iconUrl?: string;
  authorName?: string;
  fileType?: string;
  latestVersionId?: number;
}

interface HangarSearchResponse {
  result: unknown[];
  pagination: unknown;
}

interface HangarVersionResponse {
  result: unknown[];
  pagination: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${url}`);
  }
  return response.json() as Promise<T>;
}

function parseHangarProject(project: unknown): HangarProject | null {
  if (!isRecord(project)) {
    return null;
  }

  const namespaceRaw = isRecord(project.namespace) ? project.namespace : null;
  const statsRaw = isRecord(project.stats) ? project.stats : null;

  const owner = asString(namespaceRaw?.owner);
  const slug = asString(namespaceRaw?.slug);
  const name = asString(project.name);

  if (!owner || !slug || !name) {
    return null;
  }

  return {
    name,
    namespace: {
      owner,
      slug,
    },
    stats: {
      downloads: asNumber(statsRaw?.downloads),
      stars: asNumber(statsRaw?.stars),
    },
    description: asString(project.description),
    avatarUrl: asString(project.avatarUrl),
  };
}

function parseHangarVersion(version: unknown): HangarVersion | null {
  if (!isRecord(version)) {
    return null;
  }

  const name = asString(version.name);
  if (!name) {
    return null;
  }

  const downloadsRaw = isRecord(version.downloads) ? version.downloads : null;
  if (!downloadsRaw) {
    return null;
  }

  const downloads: Record<string, HangarDownloadInfo> = {};
  for (const [platform, payload] of Object.entries(downloadsRaw)) {
    if (!isRecord(payload)) {
      continue;
    }
    const downloadUrl = asString(payload.downloadUrl);
    if (!downloadUrl) {
      continue;
    }

    const fileInfoRaw = isRecord(payload.fileInfo) ? payload.fileInfo : null;
    downloads[platform.toUpperCase()] = {
      downloadUrl,
      externalUrl: typeof payload.externalUrl === 'string' ? payload.externalUrl : null,
      fileName: fileInfoRaw ? asString(fileInfoRaw.name) || null : null,
    };
  }

  const depsRaw = isRecord(version.platformDependencies) ? version.platformDependencies : null;
  const platformDependencies: Record<string, string[]> = {};
  if (depsRaw) {
    for (const [platform, values] of Object.entries(depsRaw)) {
      if (!Array.isArray(values)) {
        continue;
      }
      platformDependencies[platform.toUpperCase()] = values
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    }
  }

  if (Object.keys(downloads).length === 0) {
    return null;
  }

  return {
    name,
    downloads,
    platformDependencies,
  };
}

function toSpigotIconUrl(iconPath: string): string {
  if (!iconPath) {
    return '';
  }
  if (/^https?:\/\//i.test(iconPath)) {
    return iconPath;
  }
  return `https://www.spigotmc.org/${iconPath.replace(/^\/+/, '')}`;
}

function parseSpigetResource(resource: unknown): SpigetResource | null {
  if (!isRecord(resource)) {
    return null;
  }

  const id = asNumber(resource.id, -1);
  const name = asString(resource.name);
  if (id < 0 || !name) {
    return null;
  }

  const iconRaw = isRecord(resource.icon) ? resource.icon : null;
  const authorRaw = isRecord(resource.author) ? resource.author : null;
  const fileRaw = isRecord(resource.file) ? resource.file : null;
  const fileUrl = fileRaw ? asString(fileRaw.url) : '';
  const versionMatch = fileUrl.match(/[?&]version=(\d+)/);
  const latestVersionId = versionMatch ? Number(versionMatch[1]) : undefined;

  return {
    id,
    name,
    tag: asString(resource.tag),
    downloads: asNumber(resource.downloads),
    premium: Boolean(resource.premium),
    external: Boolean(resource.external),
    iconUrl: iconRaw ? toSpigotIconUrl(asString(iconRaw.url)) || undefined : undefined,
    authorName: authorRaw ? asString(authorRaw.name) || undefined : undefined,
    fileType: fileRaw ? asString(fileRaw.type) || undefined : undefined,
    latestVersionId,
  };
}

function sanitizeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isMatchingMinecraftVersion(
  availableVersions: string[],
  minecraftVersion: string
): boolean {
  if (availableVersions.length === 0 || !minecraftVersion) {
    return true;
  }

  const normalized = minecraftVersion.trim();
  const versionParts = normalized.split('.');
  const majorMinor =
    versionParts.length >= 2 ? `${versionParts[0]}.${versionParts[1]}` : normalized;

  return availableVersions.some((candidate) => {
    const target = candidate.trim();
    return target === normalized || target === majorMinor;
  });
}

function resolveHangarPlatform(software: string): string {
  const normalized = software.toLowerCase();
  if (normalized.includes('velocity')) return 'VELOCITY';
  if (normalized.includes('waterfall') || normalized.includes('bungeecord')) return 'WATERFALL';
  return 'PAPER';
}

export async function searchModrinth(
  query: string,
  facets: string,
  offset: number = 0,
  limit: number = 20
): Promise<{ hits: ModrinthProject[]; total_hits: number }> {
  const url = new URL('https://api.modrinth.com/v2/search');
  url.searchParams.set('query', query);
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('limit', String(limit));
  if (facets) url.searchParams.set('facets', facets);

  return fetchJson<{ hits: ModrinthProject[]; total_hits: number }>(url.toString());
}

export async function getModrinthVersions(projectId: string): Promise<unknown[]> {
  return fetchJson<unknown[]>(`https://api.modrinth.com/v2/project/${projectId}/version`);
}

export async function searchHangar(
  query: string,
  offset: number = 0
): Promise<{ result: HangarProject[]; pagination: unknown }> {
  const url = new URL('https://hangar.papermc.io/api/v1/projects');
  url.searchParams.set('query', query);
  url.searchParams.set('offset', String(offset));
  url.searchParams.set('limit', '25');

  const payload = await fetchJson<HangarSearchResponse>(url.toString());
  const result = Array.isArray(payload.result)
    ? payload.result
        .map(parseHangarProject)
        .filter((project): project is HangarProject => project !== null)
    : [];

  return {
    result,
    pagination: payload.pagination,
  };
}

export async function getHangarVersions(
  owner: string,
  slug: string,
  platform?: string
): Promise<HangarVersion[]> {
  const encodedOwner = encodeURIComponent(owner);
  const encodedSlug = encodeURIComponent(slug);
  const endpoint = `https://hangar.papermc.io/api/v1/projects/${encodedOwner}/${encodedSlug}/versions`;

  const fetchVersions = async (targetPlatform?: string) => {
    const url = new URL(endpoint);
    url.searchParams.set('limit', '30');
    if (targetPlatform) {
      url.searchParams.set('platform', targetPlatform);
    }

    const payload = await fetchJson<HangarVersionResponse>(url.toString());
    if (!Array.isArray(payload.result)) {
      return [];
    }

    return payload.result
      .map(parseHangarVersion)
      .filter((version): version is HangarVersion => version !== null);
  };

  const primary = await fetchVersions(platform);
  if (primary.length > 0 || !platform) {
    return primary;
  }

  return fetchVersions();
}

export async function resolveHangarDownload(params: {
  owner: string;
  slug: string;
  software: string;
  minecraftVersion: string;
}): Promise<HangarResolvedDownload | null> {
  const platform = resolveHangarPlatform(params.software);
  const versions = await getHangarVersions(params.owner, params.slug, platform);
  if (versions.length === 0) {
    return null;
  }

  const compatibleVersion = versions.find((version) => {
    const dependencies = version.platformDependencies[platform] ?? [];
    return isMatchingMinecraftVersion(dependencies, params.minecraftVersion);
  });

  const selected = compatibleVersion ?? versions[0];
  const selectedDownload = selected.downloads[platform] ?? Object.values(selected.downloads)[0];
  if (!selectedDownload) {
    return null;
  }

  const fileNameBase = `${params.slug}-${selected.name}`;
  const fileName = selectedDownload.fileName || `${sanitizeFileName(fileNameBase)}.jar`;

  return {
    versionName: selected.name,
    fileName,
    downloadUrl: selectedDownload.downloadUrl,
  };
}

export async function searchSpigot(
  query: string,
  page: number = 1,
  size: number = 25
): Promise<SpigetResource[]> {
  const trimmed = query.trim();
  const url = new URL(
    trimmed
      ? `https://api.spiget.org/v2/search/resources/${encodeURIComponent(trimmed)}`
      : 'https://api.spiget.org/v2/resources/free'
  );
  url.searchParams.set('size', String(size));
  url.searchParams.set('page', String(Math.max(1, page)));
  url.searchParams.set('sort', '-downloads');

  const resources = await fetchJson<unknown[]>(url.toString(), {
    headers: {
      'User-Agent': 'MC-Vector/2.0',
    },
  });

  return resources
    .map(parseSpigetResource)
    .filter((resource): resource is SpigetResource => resource !== null);
}

export async function downloadPlugin(url: string, dest: string, eventId: string): Promise<void> {
  return tauriInvoke('download_file', { url, dest, eventId });
}

export async function installModrinthProject(
  versionId: string,
  fileName: string,
  destDir: string
): Promise<void> {
  // Modrinth version の詳細を取得してダウンロード URL を得る
  const response = await fetch(`https://api.modrinth.com/v2/version/${versionId}`);
  if (!response.ok) throw new Error('Failed to get Modrinth version');
  const version = (await response.json()) as {
    files: { url: string; filename: string }[];
  };
  const file = version.files[0];
  if (!file) throw new Error('No files in version');

  const destPath = `${destDir}/${file.filename || fileName}`;
  await tauriInvoke('download_file', {
    url: file.url,
    dest: destPath,
    eventId: `plugin-${versionId}`,
  });
}

export async function installHangarProject(
  downloadUrl: string,
  fileName: string,
  destDir: string
): Promise<void> {
  const destPath = `${destDir}/${fileName}`;
  await tauriInvoke('download_file', {
    url: downloadUrl,
    dest: destPath,
    eventId: `plugin-hangar`,
  });
}

export async function installSpigotProject(
  resourceId: number,
  fileName: string,
  destDir: string,
  versionId?: number
): Promise<void> {
  const url = new URL(`https://api.spiget.org/v2/resources/${resourceId}/download`);
  if (typeof versionId === 'number' && Number.isFinite(versionId) && versionId > 0) {
    url.searchParams.set('version', String(versionId));
  }

  const destPath = `${destDir}/${fileName}`;
  await tauriInvoke('download_file', {
    url: url.toString(),
    dest: destPath,
    eventId: `plugin-spigot-${resourceId}`,
  });
}
