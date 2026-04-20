import { useMemo } from 'react';
import type { Translate } from '../../i18n';
import type { AppServerGroup } from '../components/AppServerSidebar';
import type { MinecraftServer } from '../shared/server declaration';

interface UseGroupedServersOptions {
  servers: MinecraftServer[];
  t: Translate;
}

export function useGroupedServers({ servers, t }: UseGroupedServersOptions): AppServerGroup[] {
  return useMemo(() => {
    const grouped = new Map<string, MinecraftServer[]>();
    for (const server of servers) {
      const groupName = server.groupName?.trim() || t('server.list.ungrouped');
      const bucket = grouped.get(groupName) ?? [];
      bucket.push(server);
      grouped.set(groupName, bucket);
    }

    return Array.from(grouped.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([groupName, entries]) => ({
        groupName,
        servers: [...entries].sort((left, right) => left.name.localeCompare(right.name)),
      }));
  }, [servers, t]);
}
