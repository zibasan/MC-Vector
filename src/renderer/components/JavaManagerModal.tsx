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

        <div className="java-manager-modal__available-section">
          <h3 className="java-manager-modal__section-title">Available Versions (Adoptium)</h3>
          <div className="java-manager-modal__version-grid">
            {availableVersions.map((v) => {
              const isInstalled = installed.some((i) => i.version === v);
              return (
                <div key={v} className="java-manager-modal__version-card">
                  <div className="java-manager-modal__version-title">Java {v}</div>
                  {isInstalled ? (
                    <div className="text-success font-bold">Installed</div>
                  ) : (
                    <button
                      className="btn-primary java-manager-modal__download-btn disabled:opacity-50"
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
            <div className="java-manager-modal__download-status">
              {downloadStatus || 'Downloading...'}
            </div>
          )}
        </div>

        <div className="java-manager-modal__manual-section">
          <div className="java-manager-modal__manual-copy">
            <h3 className="java-manager-modal__section-title java-manager-modal__section-title--compact">
              手動でJavaを指定
            </h3>
            <p className="java-manager-modal__manual-note">
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

        <div className="java-manager-modal__installed-section">
          <h3 className="java-manager-modal__section-title">Installed Runtimes</h3>
          {installed.length === 0 ? (
            <div className="java-manager-modal__empty">No runtimes managed by MC-Vector.</div>
          ) : (
            <div className="java-manager-modal__runtime-list">
              {installed.map((java) => (
                <div key={java.path} className="java-manager-modal__runtime-row">
                  <div>
                    <div className="java-manager-modal__runtime-name">{java.name}</div>
                    <div className="java-manager-modal__runtime-path">{java.path}</div>
                  </div>
                  <button
                    className="btn-stop java-manager-modal__delete-btn"
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
