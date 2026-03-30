import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { tauriListen } from '../../lib/tauri-api';
import { type MinecraftServer } from '../components/../shared/server declaration';

interface Props {
  server: MinecraftServer;
}

export default function DashboardView({ server }: Props) {
  const [stats, setStats] = useState<{ time: string; cpu: number; memory: number }[]>([]);
  const [currentCpu, setCurrentCpu] = useState(0);
  const [currentMem, setCurrentMem] = useState(0);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    tauriListen<{ serverId: string; cpu: number; memory: number }>('server-stats', (data) => {
      if (data.serverId !== server.id) {
        return;
      }

      const now = new Date().toLocaleTimeString();
      const cpuVal = Math.round(data.cpu * 10) / 10;
      const memVal = Math.round(data.memory / 1024 / 1024);

      setCurrentCpu(cpuVal);
      setCurrentMem(memVal);

      setStats((prev) => {
        const newData = [...prev, { time: now, cpu: cpuVal, memory: memVal }];
        if (newData.length > 20) {
          newData.shift();
        }
        return newData;
      });
    }).then((u) => {
      unlisten = u;
    });

    return () => unlisten?.();
  }, [server.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return '#10b981';
      case 'offline':
        return '#ef4444';
      case 'starting':
        return '#eab308';
      case 'stopping':
        return '#f97316';
      case 'restarting':
        return '#3b82f6';
      default:
        return '#aaa';
    }
  };

  return (
    <div className="dashboard-view">
      <h2 className="dashboard-view__title">Dashboard: {server.name}</h2>

      <div className="dashboard-view__stats-grid">
        <div className="dashboard-view__stat-card">
          <div className="dashboard-view__stat-label">Status</div>
          <div
            className="dashboard-view__stat-value"
            style={{ color: getStatusColor(server.status) }}
          >
            {server.status.toUpperCase()}
          </div>
        </div>
        <div className="dashboard-view__stat-card">
          <div className="dashboard-view__stat-label">Software</div>
          <div className="dashboard-view__stat-value">{server.software}</div>
          <div className="dashboard-view__stat-sub">{server.version}</div>
        </div>
        <div className="dashboard-view__stat-card">
          <div className="dashboard-view__stat-label">Current CPU</div>
          <div className="dashboard-view__stat-value text-blue-500">{currentCpu}%</div>
        </div>
        <div className="dashboard-view__stat-card">
          <div className="dashboard-view__stat-label">Current Memory</div>
          <div className="dashboard-view__stat-value text-purple-500">{currentMem} MB</div>
        </div>
      </div>

      <div className="dashboard-view__chart-grid">
        <div className="dashboard-view__chart-card">
          <h3 className="dashboard-view__chart-title">CPU Usage (%)</h3>
          <div className="dashboard-view__chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" stroke="#666" tick={{ fontSize: 10 }} />
                <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3b82f6"
                  fill="rgba(59, 130, 246, 0.3)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="dashboard-view__chart-card">
          <h3 className="dashboard-view__chart-title">Memory Usage (MB)</h3>
          <div className="dashboard-view__chart-body">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" stroke="#666" tick={{ fontSize: 10 }} />
                <YAxis stroke="#666" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                <Area
                  type="monotone"
                  dataKey="memory"
                  stroke="#a855f7"
                  fill="rgba(168, 85, 247, 0.3)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
