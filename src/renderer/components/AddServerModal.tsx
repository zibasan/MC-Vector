import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { getServerRoot } from '../../lib/config-commands';
import { VERSION_OPTIONS } from '../constants/versionOptions';

interface AddServerModalProps {
  onClose: () => void;
  onAdd: (serverData: unknown) => void;
}

const AddServerModal: FC<AddServerModalProps> = ({ onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [software, setSoftware] = useState('Paper');
  const [version, setVersion] = useState('1.21.10');
  const [port, setPort] = useState(25565);
  const [memory, setMemory] = useState(4);
  const [rootPath, setRootPath] = useState<string>('');

  useEffect(() => {
    const fetchRoot = async () => {
      try {
        const path = await getServerRoot();
        setRootPath(path);
      } catch (e) {
        console.error(e);
      }
    };
    fetchRoot();
  }, []);

  const previewPath = rootPath
    ? `${rootPath}/${name || 'server-id'}`.replace(/\\/g, '/')
    : 'Loading...';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedName = name.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'server';
    const serverPath = rootPath ? `${rootPath}/${sanitizedName}` : '';
    onAdd({ name, software, version, port, memory, path: serverPath });
  };

  return (
    <div className="add-server-modal-backdrop modal-backdrop">
      <div className="add-server-modal-panel modal-panel">
        <h3 className="add-server-modal__title">新しいサーバーを追加</h3>

        <form onSubmit={handleSubmit}>
          <div className="add-server-modal__section">
            <label className="add-server-modal__label">サーバー名</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: Survival Server"
              className="add-server-modal__field add-server-modal__field--text"
            />
            <div className="add-server-modal__path-preview">保存先: {previewPath}</div>
          </div>

          <div className="add-server-modal__row">
            <div className="add-server-modal__field-group">
              <label className="add-server-modal__label">ソフトウェア</label>
              <select
                value={software}
                onChange={(e) => setSoftware(e.target.value)}
                className="add-server-modal__field"
              >
                <optgroup label="Standard">
                  <option value="Vanilla">Vanilla (公式)</option>
                  <option value="Paper">Paper (推奨)</option>
                  <option value="LeafMC">LeafMC (Paper Fork)</option>
                  <option value="Spigot">Spigot</option>
                </optgroup>
                <optgroup label="Modded">
                  <option value="Fabric">Fabric</option>
                  <option value="Forge">Forge</option>
                </optgroup>
                <optgroup label="Proxy">
                  <option value="Velocity">Velocity</option>
                  <option value="Waterfall">Waterfall</option>
                  <option value="BungeeCord">BungeeCord</option>
                </optgroup>
              </select>
            </div>

            <div className="add-server-modal__field-group">
              <label className="add-server-modal__label">バージョン</label>
              <select
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className="add-server-modal__field"
              >
                {VERSION_OPTIONS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="add-server-modal__row add-server-modal__row--spaced">
            <div className="add-server-modal__field-group">
              <label className="add-server-modal__label">ポート</label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="add-server-modal__field"
              />
            </div>
            <div className="add-server-modal__field-group">
              <label className="add-server-modal__label">メモリ(GB)</label>
              <input
                type="number"
                required
                value={memory}
                onChange={(e) => setMemory(Number(e.target.value))}
                className="add-server-modal__field"
              />
            </div>
          </div>

          <div className="add-server-modal__footer">
            <button type="button" onClick={onClose} className="add-server-modal__cancel-btn">
              キャンセル
            </button>
            <button type="submit" className="add-server-modal__submit-btn">
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddServerModal;
