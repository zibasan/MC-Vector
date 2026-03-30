import { openUrl } from '@tauri-apps/plugin-opener';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Download,
  ExternalLink,
  Flame,
  Loader2,
  type LucideIcon,
  Package,
  Search,
  Server,
  Sparkles,
  Star,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { deleteItem, listFiles } from '../../lib/file-commands';
import {
  installHangarProject,
  installModrinthProject,
  installSpigotProject,
  resolveHangarDownload,
  type SpigetResource,
  searchHangar,
  searchModrinth,
  searchSpigot,
} from '../../lib/plugin-commands';
import { type MinecraftServer } from '../components/../shared/server declaration';
import { useToast } from './ToastProvider';

interface Props {
  server: MinecraftServer;
}

type BrowserPlatform = 'Modrinth' | 'Hangar' | 'CurseForge' | 'Spigot';

interface ProjectItem {
  id: string;
  title: string;
  description: string;
  author: string;
  icon_url?: string;
  downloads?: number;
  stars?: number;
  platform: 'Modrinth' | 'Hangar' | 'Spigot';
  slug?: string;
  source_obj: Record<string, unknown>;
}

interface PlatformOption {
  key: BrowserPlatform;
  label: string;
  hint: string;
  inApp: boolean;
  icon: LucideIcon;
}

const LIMIT = 30;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toSlug(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'plugin';
}

function normalizeFileExtension(value?: string): string {
  if (!value) {
    return '.jar';
  }
  return value.startsWith('.') ? value : `.${value}`;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function mapSpigotResource(resource: SpigetResource): ProjectItem {
  return {
    id: String(resource.id),
    title: resource.name,
    description: resource.tag || 'No description provided.',
    author: resource.authorName || 'Unknown',
    icon_url: resource.iconUrl,
    downloads: resource.downloads,
    slug: toSlug(resource.name),
    platform: 'Spigot',
    source_obj: {
      ...resource,
    },
  };
}

export default function PluginBrowser({ server }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installedFiles, setInstalledFiles] = useState<string[]>([]);
  const [dupDialog, setDupDialog] = useState<{ item: ProjectItem; installedFile: string } | null>(
    null
  );
  const [page, setPage] = useState(0);

  const isModServer = ['Fabric', 'Forge', 'NeoForge'].includes(server.software || '');
  const [platform, setPlatform] = useState<BrowserPlatform>('Modrinth');
  const isPaper = ['Paper', 'LeafMC', 'Waterfall', 'Velocity'].includes(server.software || '');
  const { showToast } = useToast();
  const folderName = isModServer ? 'mods' : 'plugins';

  const platformOptions = useMemo<PlatformOption[]>(() => {
    const options: PlatformOption[] = [
      {
        key: 'Modrinth',
        label: 'Modrinth',
        hint: isModServer ? 'Mods + Datapacks' : 'Plugins + Mods',
        inApp: true,
        icon: Package,
      },
    ];

    if (isPaper) {
      options.push({
        key: 'Hangar',
        label: 'Hangar',
        hint: 'Paper ecosystem',
        inApp: true,
        icon: Server,
      });
    }

    if (!isModServer) {
      options.push({
        key: 'Spigot',
        label: 'SpigotMC',
        hint: 'Spiget API',
        inApp: true,
        icon: Flame,
      });
    }

    if (isModServer) {
      options.push({
        key: 'CurseForge',
        label: 'CurseForge',
        hint: 'Open in web',
        inApp: false,
        icon: ExternalLink,
      });
    }

    return options;
  }, [isModServer, isPaper]);

  useEffect(() => {
    if (!platformOptions.some((option) => option.key === platform)) {
      setPlatform(platformOptions[0]?.key ?? 'Modrinth');
      setPage(0);
    }
  }, [platform, platformOptions]);

  const selectedPlatform =
    platformOptions.find((option) => option.key === platform) ?? platformOptions[0];
  const isInAppSearch = selectedPlatform?.inApp ?? false;

  const refreshInstalled = async () => {
    try {
      const dirPath = `${server.path}/${folderName}`;
      const entries = await listFiles(dirPath);
      setInstalledFiles(entries.filter((entry) => !entry.isDirectory).map((entry) => entry.name));
    } catch (error) {
      console.error(error);
      setInstalledFiles([]);
    }
  };

  useEffect(() => {
    if (isInAppSearch) {
      void search();
      return;
    }

    setLoading(false);
    setResults([]);
  }, [page, platform, isInAppSearch]);

  useEffect(() => {
    void refreshInstalled();
  }, [server.id, server.path, isModServer]);

  const normalize = (text?: unknown) =>
    String(text ?? '')
      .toLowerCase()
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9]/g, '');

  const findInstalledMatch = (item: ProjectItem) => {
    const candidates = [
      item.slug,
      item.title,
      item.id,
      item.source_obj.slug,
      item.source_obj.project_id,
      item.source_obj.name,
      item.source_obj.id,
    ]
      .map(normalize)
      .filter(Boolean);

    const plainCandidates = [item.slug, item.title, item.source_obj.slug]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    return (
      installedFiles.find((file) => {
        const base = normalize(file);
        const fileLower = file.toLowerCase();
        const fileBase = fileLower.replace(/\.[^.]+$/, '').replace(/-[\d.]+$/, '');

        if (candidates.some((candidate) => base.includes(candidate) || candidate.includes(base))) {
          return true;
        }

        if (
          plainCandidates.some(
            (candidate) => fileLower.includes(candidate) || fileBase === candidate
          )
        ) {
          return true;
        }

        return false;
      }) || null
    );
  };

  async function search() {
    if (!isInAppSearch) {
      return;
    }

    setLoading(true);
    setResults([]);

    try {
      const offset = page * LIMIT;
      let items: ProjectItem[] = [];

      if (platform === 'Modrinth') {
        const searchType = isModServer ? 'mod' : 'plugin';
        const facets = `[["project_type:${searchType}"],["versions:${server.version}"]]`;
        const result = await searchModrinth(query, facets, offset);

        items = result.hits
          .map((hit) => ({
            id: hit.project_id || hit.slug,
            title: hit.title,
            description: hit.description,
            author: hit.author || 'Unknown',
            icon_url: hit.icon_url || undefined,
            downloads: hit.downloads || undefined,
            slug: hit.slug || hit.project_id || '',
            platform: 'Modrinth' as const,
            source_obj: {
              ...hit,
            },
          }))
          .filter((item) => Boolean(item.id));
      } else if (platform === 'Hangar') {
        const data = await searchHangar(query, offset);

        items = data.result.map((project) => ({
          id: `${project.namespace.owner}/${project.namespace.slug}`,
          title: project.name,
          description: project.description,
          author: project.namespace.owner,
          icon_url: project.avatarUrl || undefined,
          stars: project.stats.stars || undefined,
          downloads: project.stats.downloads || undefined,
          slug: project.namespace.slug,
          platform: 'Hangar' as const,
          source_obj: {
            ...project,
          },
        }));
      } else if (platform === 'Spigot') {
        const resources = await searchSpigot(query, page + 1, LIMIT);
        items = resources.map(mapSpigotResource);
      }

      setResults(items);
    } catch (error) {
      console.error(error);
      const message = toErrorMessage(error);
      if (platform === 'Hangar') {
        showToast(`Hangarの取得に失敗しました: ${message}`, 'error');
      } else if (platform === 'Spigot') {
        showToast(`Spigotの取得に失敗しました: ${message}`, 'error');
      } else {
        showToast('データの取得に失敗しました', 'error');
      }
    } finally {
      setLoading(false);
    }
  }

  const performInstall = async (
    item: ProjectItem,
    mode: 'fresh' | 'overwrite' | 'update',
    installedFile?: string
  ) => {
    if (installedFile) {
      const targetPath = `${server.path}/${folderName}/${installedFile}`;
      try {
        await deleteItem(targetPath);
      } catch (error) {
        console.error(error);
        showToast('既存ファイルの削除に失敗しました', 'error');
        return;
      }
    }

    setInstallingId(item.id);
    try {
      if (item.platform === 'Modrinth') {
        const loader = server.software.toLowerCase();
        const params = new URLSearchParams();
        params.append('loaders', `["${loader}"]`);
        params.append('game_versions', `["${server.version}"]`);

        const response = await fetch(
          `https://api.modrinth.com/v2/project/${item.id}/version?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error(`Modrinth version fetch failed: ${response.status}`);
        }

        const versionsPayload = (await response.json()) as unknown;
        if (!Array.isArray(versionsPayload) || versionsPayload.length === 0) {
          showToast('対応バージョンが見つかりませんでした', 'error');
          return;
        }

        const firstVersion = versionsPayload[0];
        if (!isRecord(firstVersion) || typeof firstVersion.id !== 'string') {
          showToast('バージョン情報の取得に失敗しました', 'error');
          return;
        }

        let fileName = `${item.slug || item.id}.jar`;
        if (Array.isArray(firstVersion.files)) {
          const firstFile = firstVersion.files.find(
            (entry) => isRecord(entry) && typeof entry.filename === 'string'
          );
          if (isRecord(firstFile) && typeof firstFile.filename === 'string') {
            fileName = firstFile.filename;
          }
        }

        await installModrinthProject(firstVersion.id, fileName, `${server.path}/${folderName}`);
      } else if (item.platform === 'Hangar') {
        const owner = item.author;
        const slug = item.slug || item.title;
        const resolved = await resolveHangarDownload({
          owner,
          slug,
          software: server.software || 'Paper',
          minecraftVersion: server.version || '',
        });

        if (!resolved) {
          showToast('対応バージョンが見つかりませんでした', 'error');
          return;
        }

        if (!resolved.downloadUrl) {
          const externalUrl = resolved.externalUrl || `https://hangar.papermc.io/${owner}/${slug}`;
          await openExternal(externalUrl);
          showToast('このHangarリソースはブラウザ経由でのダウンロードが必要です', 'info');
          return;
        }

        await installHangarProject(
          resolved.downloadUrl,
          resolved.fileName,
          `${server.path}/${folderName}`
        );
      } else if (item.platform === 'Spigot') {
        const resourceId = Number(item.id);
        if (!Number.isFinite(resourceId)) {
          showToast('SpigotリソースIDが不正です', 'error');
          return;
        }

        const shouldOpenBrowser =
          item.source_obj.external === true || item.source_obj.premium === true;
        if (shouldOpenBrowser) {
          await openExternal(`https://www.spigotmc.org/resources/${resourceId}/`);
          showToast('このリソースはブラウザ経由でのダウンロードが必要です', 'info');
          return;
        }

        const extension = normalizeFileExtension(
          typeof item.source_obj.fileType === 'string' ? item.source_obj.fileType : '.jar'
        );
        const versionId =
          typeof item.source_obj.latestVersionId === 'number'
            ? item.source_obj.latestVersionId
            : undefined;
        const fileName = `${toSlug(item.title)}-${resourceId}${extension}`;

        await installSpigotProject(resourceId, fileName, `${server.path}/${folderName}`, versionId);
      }

      const successLabel =
        mode === 'fresh'
          ? 'インストール完了'
          : mode === 'overwrite'
            ? '上書き完了'
            : 'アップデート完了';
      showToast(`${successLabel}: ${item.title}`, 'success');
    } catch (error) {
      console.error(error);
      showToast('インストールエラー', 'error');
    } finally {
      setInstallingId(null);
      await refreshInstalled();
    }
  };

  const handleInstall = (item: ProjectItem) => {
    const installedMatch = findInstalledMatch(item);
    if (installedMatch) {
      setDupDialog({ item, installedFile: installedMatch });
      return;
    }

    void performInstall(item, 'fresh');
  };

  const openExternal = async (url: string) => {
    try {
      await openUrl(url);
    } catch (error) {
      console.error(error);
      showToast('ブラウザを開けませんでした', 'error');
    }
  };

  const actionLabel = (item: ProjectItem) => {
    if (installingId === item.id) {
      return 'Installing...';
    }
    const requiresBrowser =
      item.platform === 'Spigot' &&
      (item.source_obj.external === true || item.source_obj.premium === true);
    return requiresBrowser ? 'Open' : 'Install';
  };

  return (
    <div className="plugin-browser">
      <div className="plugin-browser__hero">
        <div>
          <h2 className="plugin-browser__hero-title">
            Discover {isModServer ? 'Mods' : 'Plugins'}
          </h2>
          <p className="plugin-browser__hero-description">
            {selectedPlatform?.label} から直接検索して、{folderName}{' '}
            フォルダへ即時インストールできます。
          </p>
        </div>
        <div className="plugin-browser__hero-chip">
          <Sparkles size={14} />
          <span>In-app installer</span>
        </div>
      </div>

      <div className="plugin-browser__platform-grid">
        {platformOptions.map((option) => {
          const Icon = option.icon;
          const active = option.key === platform;

          return (
            <motion.button
              key={option.key}
              type="button"
              whileTap={{ scale: 0.97 }}
              whileHover={{ y: -1 }}
              className={`plugin-browser__platform-chip ${active ? 'is-active' : ''}`}
              onClick={() => {
                setPlatform(option.key);
                setPage(0);
              }}
            >
              <Icon size={16} />
              <div className="plugin-browser__platform-copy">
                <span className="plugin-browser__platform-label">{option.label}</span>
                <span className="plugin-browser__platform-hint">{option.hint}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {isInAppSearch ? (
        <div className="plugin-browser__search-row">
          <div className="plugin-browser__search-input-wrap">
            <Search size={16} />
            <input
              type="text"
              className="plugin-browser__search-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search on ${selectedPlatform?.label || platform}...`}
              onKeyDown={(event) => event.key === 'Enter' && void search()}
            />
          </div>

          <button
            type="button"
            className="plugin-browser__search-btn"
            onClick={() => void search()}
            disabled={loading}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span>{loading ? 'Searching...' : 'Search'}</span>
          </button>
        </div>
      ) : (
        <div className="plugin-browser__unsupported-panel">
          <p>このプラットフォームはアプリ内検索に対応していません。</p>
          <button
            type="button"
            className="plugin-browser__unsupported-btn"
            onClick={() => openExternal('https://www.curseforge.com/minecraft/mc-mods')}
          >
            <ExternalLink size={16} />
            <span>ブラウザで {selectedPlatform?.label || platform} を開く</span>
          </button>
          <p className="plugin-browser__unsupported-note">
            ダウンロードした .jar は Files から {folderName} フォルダへ配置してください。
          </p>
        </div>
      )}

      {isInAppSearch && platform === 'Spigot' && (
        <div className="plugin-browser__platform-note">
          Spigot にはブラウザ経由でのみ配布されるリソースがあります。Open
          と表示される場合は外部ページから取得してください。
        </div>
      )}

      {isInAppSearch && platform === 'Hangar' && (
        <div className="plugin-browser__platform-note">
          Hangar には直接ダウンロード URL
          を公開していないバージョンがあります。その場合は自動的に外部ページを開きます。
        </div>
      )}

      {isInAppSearch && (
        <>
          <div className="plugin-browser__results-grid">
            <AnimatePresence initial={false}>
              {results.map((item, index) => {
                const installedMatch = findInstalledMatch(item);
                const requiresBrowser =
                  item.platform === 'Spigot' &&
                  (item.source_obj.external === true || item.source_obj.premium === true);

                return (
                  <motion.div
                    key={`${item.platform}-${item.id}`}
                    layout
                    initial={{ opacity: 0, y: 14, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.16) }}
                    className="plugin-browser__result-card"
                  >
                    <div
                      className="plugin-browser__result-icon"
                      style={{
                        backgroundImage: item.icon_url ? `url(${item.icon_url})` : 'none',
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />

                    <div className="plugin-browser__result-body">
                      <div className="plugin-browser__result-top">
                        <div className="plugin-browser__result-title-wrap">
                          <div className="plugin-browser__result-title">{item.title}</div>
                          <div className="plugin-browser__result-source">{item.platform}</div>
                        </div>

                        <div className="plugin-browser__result-actions">
                          {installedMatch && (
                            <span className="plugin-browser__installed-badge">Installed</span>
                          )}

                          <button
                            type="button"
                            onClick={() => handleInstall(item)}
                            disabled={installingId === item.id}
                            className={`plugin-browser__install-btn ${
                              requiresBrowser ? 'plugin-browser__install-btn--external' : ''
                            }`}
                          >
                            {installingId === item.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : requiresBrowser ? (
                              <ExternalLink size={14} />
                            ) : (
                              <Download size={14} />
                            )}
                            <span>{actionLabel(item)}</span>
                          </button>
                        </div>
                      </div>

                      <div className="plugin-browser__result-description">
                        {item.description || 'No description provided.'}
                      </div>

                      <div className="plugin-browser__result-meta">
                        <span className="plugin-browser__meta-item">
                          <Server size={13} />
                          <span>{item.author}</span>
                        </span>
                        <span className="plugin-browser__meta-item">
                          <Download size={13} />
                          <span>{item.downloads ? item.downloads.toLocaleString() : '-'}</span>
                        </span>
                        {item.stars ? (
                          <span className="plugin-browser__meta-item">
                            <Star size={13} />
                            <span>{item.stars}</span>
                          </span>
                        ) : null}
                      </div>

                      {requiresBrowser && (
                        <div className="plugin-browser__result-tag">External download required</div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {results.length === 0 && !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="plugin-browser__result-empty"
                >
                  結果がありません。
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="plugin-browser__pager">
            <button
              type="button"
              className="plugin-browser__pager-btn"
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              disabled={page === 0 || loading}
            >
              <ArrowLeft size={14} />
              <span>Prev</span>
            </button>

            <span className="plugin-browser__pager-label">Page {page + 1}</span>

            <button
              type="button"
              className="plugin-browser__pager-btn"
              onClick={() => setPage((value) => value + 1)}
              disabled={results.length < LIMIT || loading}
            >
              <span>Next</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </>
      )}

      {dupDialog && (
        <div className="plugin-browser__dup-overlay modal-backdrop">
          <div className="plugin-browser__dup-panel modal-panel">
            <h3 className="plugin-browser__dup-title">既にインストール済みです</h3>
            <p className="plugin-browser__dup-description">
              {dupDialog.item.title} は既に {folderName} フォルダに存在します。どうしますか？
            </p>

            <div className="plugin-browser__dup-file">既存ファイル: {dupDialog.installedFile}</div>

            <div className="plugin-browser__dup-notes">
              <div>・上書き: そのまま置き換えます。</div>
              <div>・アップデート: サーバーバージョンに合う最新ビルドを入れ直します。</div>
            </div>

            <div className="plugin-browser__dup-actions">
              <button
                type="button"
                className="plugin-browser__dup-btn plugin-browser__dup-btn--cancel"
                onClick={() => setDupDialog(null)}
              >
                キャンセル
              </button>

              <button
                type="button"
                className="plugin-browser__dup-btn plugin-browser__dup-btn--overwrite"
                onClick={() => {
                  const target = dupDialog;
                  setDupDialog(null);
                  if (target) {
                    void performInstall(target.item, 'overwrite', target.installedFile);
                  }
                }}
              >
                上書き
              </button>

              <button
                type="button"
                className="plugin-browser__dup-btn plugin-browser__dup-btn--update"
                onClick={() => {
                  const target = dupDialog;
                  setDupDialog(null);
                  if (target) {
                    void performInstall(target.item, 'update', target.installedFile);
                  }
                }}
              >
                アップデート
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
