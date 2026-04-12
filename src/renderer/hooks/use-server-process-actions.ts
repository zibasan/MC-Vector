import { useCallback } from 'react';
import {
  isServerRunning,
  startServer as startServerApi,
  stopServer as stopServerApi,
} from '../../lib/server-commands';
import type { ToastKind } from '../components/ToastProvider';
import type { MinecraftServer } from '../shared/server declaration';

type Translate = (key: string, values?: Record<string, unknown>) => string;
type SetServers = (
  nextServers: MinecraftServer[] | ((prevServers: MinecraftServer[]) => MinecraftServer[]),
) => void;

interface UseServerProcessActionsOptions {
  activeServer: MinecraftServer | undefined;
  selectedServerId: string;
  setServers: SetServers;
  showToast: (message: string, type?: ToastKind) => void;
  t: Translate;
  clearExpectedOffline: (serverId: string) => void;
  resetAutoRestartState: (serverId: string) => void;
  markExpectedOffline: (serverId: string) => void;
  clearAutoRestartTimer: (serverId: string) => void;
}

export function useServerProcessActions({
  activeServer,
  selectedServerId,
  setServers,
  showToast,
  t,
  clearExpectedOffline,
  resetAutoRestartState,
  markExpectedOffline,
  clearAutoRestartTimer,
}: UseServerProcessActionsOptions) {
  const startServerProcess = useCallback(async (server: MinecraftServer) => {
    const javaPath = server.javaPath || 'java';
    const jarFile = server.software === 'Forge' ? 'forge-server.jar' : 'server.jar';
    await startServerApi(server.id, javaPath, server.path, server.memory, jarFile);
  }, []);

  const handleStart = useCallback(async () => {
    if (!activeServer) {
      showToast(t('server.toast.noServerSelected'), 'error');
      return;
    }

    const serverId = activeServer.id;
    clearExpectedOffline(serverId);
    resetAutoRestartState(serverId);
    setServers((prev) =>
      prev.map((server) => (server.id === serverId ? { ...server, status: 'starting' } : server)),
    );

    try {
      await startServerProcess(activeServer);
    } catch (error) {
      console.error('Start failed:', error);
      setServers((prev) =>
        prev.map((server) => (server.id === serverId ? { ...server, status: 'offline' } : server)),
      );
      showToast(t('server.toast.startFailed'), 'error');
    }
  }, [
    activeServer,
    clearExpectedOffline,
    resetAutoRestartState,
    setServers,
    showToast,
    startServerProcess,
    t,
  ]);

  const handleStop = useCallback(async () => {
    if (!selectedServerId) {
      return;
    }

    markExpectedOffline(selectedServerId);
    clearAutoRestartTimer(selectedServerId);
    setServers((prev) =>
      prev.map((server) =>
        server.id === selectedServerId ? { ...server, status: 'stopping' } : server,
      ),
    );

    try {
      await stopServerApi(selectedServerId);
    } catch (error) {
      console.error('Stop failed:', error);
      clearExpectedOffline(selectedServerId);
      resetAutoRestartState(selectedServerId);
      setServers((prev) =>
        prev.map((server) =>
          server.id === selectedServerId ? { ...server, status: 'offline' } : server,
        ),
      );
      showToast(t('server.toast.stopFailed'), 'error');
    }
  }, [
    clearAutoRestartTimer,
    clearExpectedOffline,
    markExpectedOffline,
    resetAutoRestartState,
    selectedServerId,
    setServers,
    showToast,
    t,
  ]);

  const handleRestart = useCallback(async () => {
    if (!activeServer) {
      showToast(t('server.toast.noServerSelected'), 'error');
      return;
    }

    const serverId = activeServer.id;
    markExpectedOffline(serverId);
    clearAutoRestartTimer(serverId);
    setServers((prev) =>
      prev.map((server) => (server.id === serverId ? { ...server, status: 'restarting' } : server)),
    );

    try {
      await stopServerApi(serverId);

      const maxWait = 30;
      for (let index = 0; index < maxWait; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const running = await isServerRunning(serverId);
        if (!running) {
          break;
        }
      }

      const running = await isServerRunning(serverId);
      if (running) {
        throw new Error('Timed out waiting for server shutdown');
      }

      await startServerProcess(activeServer);
    } catch (error) {
      console.error('Restart failed:', error);
      clearExpectedOffline(serverId);
      resetAutoRestartState(serverId);
      setServers((prev) =>
        prev.map((server) => (server.id === serverId ? { ...server, status: 'offline' } : server)),
      );
      showToast(t('server.toast.restartFailed'), 'error');
    }
  }, [
    activeServer,
    clearAutoRestartTimer,
    clearExpectedOffline,
    markExpectedOffline,
    resetAutoRestartState,
    setServers,
    showToast,
    startServerProcess,
    t,
  ]);

  return {
    handleStart,
    handleStop,
    handleRestart,
  };
}
