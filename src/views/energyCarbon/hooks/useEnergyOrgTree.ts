import { request } from '@/api/request';
import { useQuery } from '@tanstack/react-query';
import type { OrgTree, ResponseData } from '../platform/types';

interface OrgOption {
  id: number;
  orgName: string;
  orgCode: string;
  pcode?: string;
}
/** 仅按后端返回的授权节点组树，不在前端补入未授权祖先。 */
export function useDataPermissionOrgTree(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['energy-carbon', 'org-tree'],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const response = await request<ResponseData<OrgOption[]>>({
        method: 'GET',
        url: '/energy/platform/orgs',
      });
      const nodes = new Map<string, OrgTree>();
      (response.data.data || []).forEach(row =>
        nodes.set(row.orgCode, {
          id: row.id,
          code: row.orgCode,
          name: row.orgName,
          pcode: row.pcode,
          children: [],
        }),
      );
      const roots: OrgTree[] = [];
      nodes.forEach(node => {
        const parent = node.pcode ? nodes.get(node.pcode) : undefined;
        if (parent) parent.children?.push(node);
        else roots.push(node);
      });
      return roots;
    },
  });
}
