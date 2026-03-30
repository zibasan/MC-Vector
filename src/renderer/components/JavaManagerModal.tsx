import { useEffect, useState } from 'react';
import {
  deleteJava,
  downloadJava,
  getJavaVersions,
  type JavaVersion,
  onJavaDownloadProgress,
  selectJavaBinary,
} from '../../lib/java-commands';
import { useToast } from './ToastProvider';

interface Props {
  onClose: () => void;
}

export default function JavaManagerModal({ onClose }: Props) {
  const [installed, setInstalled] = useState<JavaVersion[]>([]);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<string>('');
  const availableVersions = [8, 17, 21];
  const { showToast } = useToast();

  useEffect(() => {
    loadInstalled();

    let unlisten: (() => void) | undefined;
    onJavaDownloadProgress((data) => {
      setDownloadProgress(typeof data.progress === 'number' ? data.progress : null);
    }).then((u) => {
      unlisten = u;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const loadInstalled = async () => {
    const list = await getJavaVersions();
    setInstalled(list);
  };

  const handleDownload = async (ver: number) => {
    setDownloading(ver);
    setDownloadProgress(0);
    setDownloadStatus('');
    try {
      const ok = await downloadJava(ver);
      await loadInstalled();
      if (ok) {
        showToast(`Java ${ver} をダウンロードしました`, 'success');
      } else {
        showToast('Javaのダウンロードに失敗しました', 'error');
      }
    } catch {
      showToast('Javaのダウンロードに失敗しました', 'error');
    } finally {
      setDownloading(null);
      setDownloadProgress(null);
      setDownloadStatus('');
    }
  };

  const handleDelete = async (ver: number) => {
    const { ask } = await import('@tauri-apps/plugin-dialog');
    const confirmed = await ask(`Uninstall Java ${ver}?`, { title: 'Java削除', kind: 'warning' });
    if (!confirmed) return;
    await deleteJava(ver);
    loadInstalled();
    showToast(`Java ${ver} removed`, 'info');
  };

  return (
    <div className="java-manager-modal-overlay modal-backdrop" onClick={onClose}>
      <div className="java-manager-modal-panel modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="java-manager-modal__header">
          <h2 className="m-0">Java Runtime Manager</h2>
          <button onClick={onClose} className="java-manager-modal__close-button">
            ×
          </button>
        </div>

        <div className="mb-8">
          <h3 className="border-b border-zinc-700 pb-1.5 mb-4">Available Versions (Adoptium)</h3>
          <div className="grid grid-cols-3 gap-4">
            {availableVersions.map((v) => {
              const isInstalled = installed.some((i) => i.version === v);
              return (
                <div key={v} className="java-manager-modal__version-card">
                  <div className="java-manager-modal__version-title">Java {v}</div>
                  {isInstalled ? (
                    <div className="text-success font-bold">Installed</div>
                  ) : (
                    <button
                      className="btn-primary w-full disabled:opacity-50"
                      onClick={() => handleDownload(v)}
                      disabled={downloading !== null}
                    >
                      {downloading === v ? `Downloading... ${downloadProgress ?? ''}` : 'Download'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          {downloading !== null && (
            <div className="mt-3 text-xs text-zinc-400">{downloadStatus || 'Downloading...'}</div>
          )}
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="border-b border-zinc-700 pb-1.5 mb-2">手動でJavaを指定</h3>
            <p className="text-xs text-zinc-400">
              環境変数にパスを通す場合や、既存のJavaを利用したいときに選択できます。
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={async () => {
              const picked = await selectJavaBinary();
              if (picked) {
                try {
                  await navigator.clipboard.writeText(picked);
                  showToast('パスをクリップボードにコピーしました', 'success');
                } catch {
                  showToast('パス: ' + picked, 'info');
                }
              } else {
                showToast('選択がキャンセルされました', 'info');
              }
            }}
          >
            既存のJavaを選択
          </button>
        </div>

        <div>
          <h3 className="border-b border-zinc-700 pb-1.5 mb-4">Installed Runtimes</h3>
          {installed.length === 0 ? (
            <div className="text-zinc-400 italic">No runtimes managed by MC-Vector.</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {installed.map((java) => (
                <div key={java.path} className="java-manager-modal__runtime-row">
                  <div>
                    <div className="font-bold">{java.name}</div>
                    <div className="text-xs text-zinc-500 break-all">{java.path}</div>
                  </div>
                  <button
                    className="btn-stop py-1.5 px-2.5 text-xs min-w-0"
                    onClick={() => handleDelete(java.version)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
