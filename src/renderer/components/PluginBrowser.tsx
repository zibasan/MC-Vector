import { openUrl } from '@tauri-apps/plugin-opener';
import { useEffect, useState } from 'react';
import { deleteItem, listFiles } from '../../lib/file-commands';
import {
  installHangarProject,
  installModrinthProject,
  searchHangar,
  searchModrinth,
} from '../../lib/plugin-commands';
import { type MinecraftServer } from '../components/../shared/server declaration';
import { useToast } from './ToastProvider';

interface Props {
  server: MinecraftServer;
}

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
  const LIMIT = 30;
  const isModServer = ['Fabric', 'Forge', 'NeoForge'].includes(server.software || '');
  const [platform, setPlatform] = useState<'Modrinth' | 'Hangar' | 'CurseForge' | 'Spigot'>(
    isModServer ? 'Modrinth' : 'Modrinth'
  );
  const isPaper = ['Paper', 'LeafMC', 'Waterfall', 'Velocity'].includes(server.software || '');
  const { showToast } = useToast();
  const folderName = isModServer ? 'mods' : 'plugins';

  const refreshInstalled = async () => {
    try {
      const dirPath = `${server.path}/${folderName}`;
      const entries = await listFiles(dirPath);
      setInstalledFiles(entries.filter((e) => !e.isDirectory).map((e) => e.name));
    } catch (e) {
      console.error(e);
      setInstalledFiles([]);
    }
  };

  useEffect(() => {
    search();
  }, [page, platform]);

  useEffect(() => {
    refreshInstalled();
  }, [server.id, server.path, isModServer]);

  const normalize = (text?: unknown) =>
    String(text ?? '')
      .toLowerCase()
      .replace(/\.[^.]+$/, '')
      .replace(/[^a-z0-9]/g, '');

  const findInstalledMatch = (item: ProjectItem) => {
    // Strategy 1: normalized slug/title/id matching
    const candidates = [
      item.slug,
      item.title,
      item.id,
      item.source_obj?.slug,
      item.source_obj?.project_id,
    ]
      .map(normalize)
      .filter(Boolean);

    // Strategy 2: case-insensitive plain name matching (less aggressive)
    const plainCandidates = [item.slug, item.title, item.source_obj?.slug]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase());

    return (
      installedFiles.find((file) => {
        const base = normalize(file);
        const fileLower = file.toLowerCase();
        // Remove extension and version number for loose matching
        const fileBase = fileLower.replace(/\.[^.]+$/, '').replace(/-[\d.]+$/, '');

        // Normalized match (existing logic)
        if (candidates.some((c) => base.includes(c) || c.includes(base))) return true;
        // Plain case-insensitive match on filename
        if (plainCandidates.some((c) => fileLower.includes(c) || fileBase === c)) return true;
        return false;
      }) || null
    );
  };

  const search = async () => {
    setLoading(true);
    setResults([]);

    try {
      const offset = page * LIMIT;
      let items: ProjectItem[] = [];

      if (platform === 'Modrinth') {
        const searchType = isModServer ? 'mod' : 'plugin';
        const facets = `[["project_type:${searchType}"],["versions:${server.version}"]]`;
        const result = await searchModrinth(query, facets, offset);
        const hits = result.hits;

        items = hits.map((h: unknown) => {
          const hh = h as Record<string, unknown>;
          return {
            id: (hh.project_id as string) || '',
            title: (hh.title as string) || '',
            description: (hh.description as string) || '',
            author: (hh.author as string) || '',
            icon_url: (hh.icon_url as string) || undefined,
            downloads: (hh.downloads as number) || undefined,
            slug: (hh.slug as string) || (hh.project_id as string) || '',
            platform: 'Modrinth',
            source_obj: hh,
          } as ProjectItem;
        });
      } else if (platform === 'Hangar') {
        const data = await searchHangar(query, server.version, offset);
        const hits = data.result;

        items = hits.map((h: unknown) => {
          const hh = h as Record<string, unknown>;
          const namespace = hh.namespace as Record<string, unknown> | undefined;
          const stats = hh.stats as Record<string, unknown> | undefined;
          return {
            id: (hh.name as string) || '',
            title: (hh.name as string) || '',
            description: (hh.description as string) || '',
            author: (namespace?.owner as string) || '',
            icon_url: (hh.avatarUrl as string) || undefined,
            stars: (stats?.stars as number) || undefined,
            downloads: (stats?.downloads as number) || undefined,
            slug: (namespace?.slug as string) || (hh.name as string) || '',
            platform: 'Hangar',
            source_obj: hh,
          } as ProjectItem;
        });
      }

      setResults(items);
    } catch (e) {
      console.error(e);
      showToast('データの取得に失敗しました', 'error');
    } finally {
      setLoading(false);
    }
  };

  const performInstall = async (
    item: ProjectItem,
    mode: 'fresh' | 'overwrite' | 'update',
    installedFile?: string
  ) => {
    if (installedFile) {
      const targetPath = `${server.path}/${folderName}/${installedFile}`;
      try {
        await deleteItem(targetPath);
      } catch (err) {
        console.error(err);
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

        const res = await fetch(
          `https://api.modrinth.com/v2/project/${item.id}/version?${params.toString()}`
        );
        const versions = await res.json();

        if (!versions || versions.length === 0) {
          showToast('対応バージョンが見つかりませんでした', 'error');
          return;
        }
        const file = versions[0].files[0];

        await installModrinthProject(versions[0].id, file.filename, `${server.path}/${folderName}`);
        showToast(
          `${mode === 'fresh' ? 'インストール完了' : mode === 'overwrite' ? '上書き完了' : 'アップデート完了'}: ${item.title}`,
          'success'
        );
      } else if (item.platform === 'Hangar') {
        const author = item.author || '';
        const slug = item.slug || '';
        const res = await fetch(
          `https://hangar.papermc.io/api/v1/projects/${author}/${slug}/versions?limit=1&platform=PAPER&platformVersion=${server.version}`
        );
        const data = await res.json();

        if (!data.result || data.result.length === 0) {
          showToast('対応バージョンが見つかりませんでした', 'error');
          return;
        }

        const version = data.result[0];
        const downloadUrl = version.downloads.PAPER.downloadUrl;
        const fileName = `${slug}-${version.name}.jar`;

        await installHangarProject(downloadUrl, fileName, `${server.path}/${folderName}`);
        showToast(
          `${mode === 'fresh' ? 'インストール完了' : mode === 'overwrite' ? '上書き完了' : 'アップデート完了'}: ${item.title}`,
          'success'
        );
      }
    } catch (e) {
      console.error(e);
      showToast('インストールエラー', 'error');
    } finally {
      setInstallingId(null);
      refreshInstalled();
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
    await openUrl(url);
  };

  return (
    <div className="plugin-browser">
      <div className="plugin-browser__header">
        <h2 className="plugin-browser__title">{isModServer ? 'Mod' : 'Plugin'} Browser</h2>

        <div className="plugin-browser__platform-controls">
          <select
            className="input-field plugin-browser__platform-select"
            value={platform}
            onChange={(e) => {
              setPlatform(e.target.value as unknown as typeof platform);
              setPage(0);
            }}
          >
            <option value="Modrinth">Modrinth</option>
            {isPaper && <option value="Hangar">Hangar (Paper)</option>}
            {isModServer && <option value="CurseForge">CurseForge (Web)</option>}
            {!isModServer && <option value="Spigot">SpigotMC (Web)</option>}
          </select>
        </div>
      </div>

      {platform === 'Modrinth' || platform === 'Hangar' ? (
        <div className="plugin-browser__search-row">
          <input
            type="text"
            className="input-field flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search on ${platform}...`}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <button className="btn-primary disabled:opacity-50" onClick={search} disabled={loading}>
            {loading ? '...' : 'Search'}
          </button>
        </div>
      ) : (
        <div className="plugin-browser__unsupported-panel">
          <p>このプラットフォームはアプリ内検索に対応していません。</p>
          <button
            className="btn-primary plugin-browser__unsupported-btn"
            onClick={() =>
              openExternal(
                platform === 'CurseForge'
                  ? 'https://www.curseforge.com/minecraft/mc-mods'
                  : 'https://www.spigotmc.org/resources/'
              )
            }
          >
            ブラウザで {platform} を開く
          </button>
          <p className="plugin-browser__unsupported-note">
            ダウンロードした.jarは Files から plugins フォルダへ配置してください。
          </p>
        </div>
      )}

      {(platform === 'Modrinth' || platform === 'Hangar') && (
        <>
          <div className="plugin-browser__results-grid">
            {results.map((item) => (
              <div key={item.id} className="plugin-browser__result-card">
                <div
                  className="plugin-browser__result-icon"
                  style={{
                    backgroundImage: item.icon_url ? `url(${item.icon_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                ></div>

                <div className="plugin-browser__result-body">
                  <div className="plugin-browser__result-top">
                    <div className="plugin-browser__result-title">{item.title}</div>
                    <div className="plugin-browser__result-actions">
                      {findInstalledMatch(item) && (
                        <span className="plugin-browser__installed-badge">Installed</span>
                      )}
                      <button
                        onClick={() => handleInstall(item)}
                        disabled={installingId === item.id}
                        className="plugin-browser__install-btn"
                      >
                        {installingId === item.id ? '...' : 'Install'}
                      </button>
                    </div>
                  </div>

                  <div className="plugin-browser__result-description">{item.description}</div>

                  <div className="plugin-browser__result-meta">
                    <span>By {item.author}</span>
                    <span>
                      {item.downloads
                        ? `⬇ ${item.downloads.toLocaleString()}`
                        : item.stars
                          ? `★ ${item.stars}`
                          : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {results.length === 0 && !loading && (
              <div className="plugin-browser__result-empty">結果がありません。</div>
            )}
          </div>

          <div className="plugin-browser__pager">
            <button
              className="btn-secondary disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              ← Prev
            </button>
            <span className="plugin-browser__pager-label">Page {page + 1}</span>
            <button
              className="btn-secondary disabled:opacity-50"
              onClick={() => setPage((p) => p + 1)}
              disabled={results.length < LIMIT || loading}
            >
              Next →
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
                className="plugin-browser__dup-btn plugin-browser__dup-btn--cancel"
                onClick={() => setDupDialog(null)}
              >
                キャンセル
              </button>
              <button
                className="plugin-browser__dup-btn plugin-browser__dup-btn--overwrite"
                onClick={() => {
                  const target = dupDialog;
                  setDupDialog(null);
                  if (target) void performInstall(target.item, 'overwrite', target.installedFile);
                }}
              >
                上書き
              </button>
              <button
                className="plugin-browser__dup-btn plugin-browser__dup-btn--update"
                onClick={() => {
                  const target = dupDialog;
                  setDupDialog(null);
                  if (target) void performInstall(target.item, 'update', target.installedFile);
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
