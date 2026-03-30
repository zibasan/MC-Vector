import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { getServerRoot } from '../../lib/config-commands';
import type { ServerTemplate } from '../../lib/server-commands';
import { VERSION_OPTIONS } from '../constants/versionOptions';

interface AddServerModalProps {
  onClose: () => void;
  onAdd: (serverData: unknown) => void;
  templates: ServerTemplate[];
}

const AddServerModal: FC<AddServerModalProps> = ({ onClose, onAdd, templates }) => {
  const [name, setName] = useState('');
  const [profileName, setProfileName] = useState('');
  const [groupName, setGroupName] = useState('');
  const [software, setSoftware] = useState('Paper');
  const [version, setVersion] = useState('1.21.10');
  const [port, setPort] = useState(25565);
  const [memory, setMemory] = useState(4);
  const [rootPath, setRootPath] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

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

  useEffect(() => {
    if (!selectedTemplateId) {
      return;
    }

    const template = templates.find((item) => item.id === selectedTemplateId);
    if (!template) {
      return;
    }

    setSoftware(template.software || 'Paper');
    setVersion(template.version || '1.21.10');
    setPort(template.port || 25565);
    setMemory(Math.max(1, Math.floor((template.memory || 1024) / 1024)));
    setProfileName(template.profileName || '');
    setGroupName(template.groupName || '');
  }, [selectedTemplateId, templates]);

  const previewPath = rootPath
    ? `${rootPath}/${name || 'server-id'}`.replace(/\\/g, '/')
    : 'Loading...';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const template = templates.find((item) => item.id === selectedTemplateId);
    const sanitizedName = name.trim().replace(/[^a-zA-Z0-9_-]/g, '-') || 'server';
    const serverPath = rootPath ? `${rootPath}/${sanitizedName}` : '';
    onAdd({
      name,
      profileName: profileName.trim() || undefined,
      groupName: groupName.trim() || undefined,
      software,
      version,
      port,
      memory,
      path: serverPath,
      javaPath: template?.javaPath,
      autoRestartOnCrash: template?.autoRestartOnCrash,
      maxAutoRestarts: template?.maxAutoRestarts,
      autoRestartDelaySec: template?.autoRestartDelaySec,
      autoBackupEnabled: template?.autoBackupEnabled,
      autoBackupIntervalMin: template?.autoBackupIntervalMin,
      autoBackupScheduleType: template?.autoBackupScheduleType,
      autoBackupTime: template?.autoBackupTime,
      autoBackupWeekday: template?.autoBackupWeekday,
    });
  };

  return (
    <div className="add-server-modal-backdrop modal-backdrop">
      <div className="add-server-modal-panel modal-panel">
        <h3 className="add-server-modal__title">新しいサーバーを追加</h3>

        <form onSubmit={handleSubmit}>
          {templates.length > 0 && (
            <div className="add-server-modal__section">
              <label className="add-server-modal__label">テンプレート</label>
              <select
                value={selectedTemplateId}
                onChange={(event) => setSelectedTemplateId(event.target.value)}
                className="add-server-modal__field"
              >
                <option value="">テンプレートを選択しない</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          )}

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
              <label className="add-server-modal__label">プロファイル名</label>
              <input
                type="text"
                value={profileName}
                onChange={(event) => setProfileName(event.target.value)}
                placeholder="例: Survival / Creative"
                className="add-server-modal__field"
              />
            </div>

            <div className="add-server-modal__field-group">
              <label className="add-server-modal__label">グループ名</label>
              <input
                type="text"
                value={groupName}
                onChange={(event) => setGroupName(event.target.value)}
                placeholder="例: Production"
                className="add-server-modal__field"
              />
            </div>
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
