import I18N from '@/lang/I18N';
import type { OrgBoundaryType } from './types';

/** 页面、菜单和后端鉴权共用权限标识。 */
export const ORG_BOUNDARY_PAGE_PERMISSION =
  '/energyCarbon/orgBoundary' as const;

/** 组织边界按钮权限。 */
export const ORG_BOUNDARY_BUTTON_PERMISSION = {
  /** 新增组织边界。 */
  ADD: '/energyCarbon/orgBoundary/add',
  /** 编辑组织边界。 */
  EDIT: '/energyCarbon/orgBoundary/edit',
  /** 删除组织边界。 */
  DELETE: '/energyCarbon/orgBoundary/delete',
  /** 查看组织边界。 */
  VIEW: '/energyCarbon/orgBoundary/view',
  /** 配置组织综合能耗统计边界。 */
  STATISTICS_CONFIG: '/energyCarbon/orgBoundary/statisticsConfig',
} as const;

/** 三类组织边界固定编码。 */
export const ORG_BOUNDARY_TYPE = {
  /** 生产系统边界。 */
  PRODUCTION_SYSTEM: 1,
  /** 地理位置边界。 */
  GEOGRAPHIC_LOCATION: 2,
  /** 组织机构边界。 */
  ORGANIZATION: 3,
} as const satisfies Record<string, OrgBoundaryType>;

/** 组织边界 Tab，顺序与需求固定顺序一致。 */
export const getOrgBoundaryTypeOptions = (): Array<{
  value: OrgBoundaryType;
  label: string;
}> => [
  {
    value: ORG_BOUNDARY_TYPE.PRODUCTION_SYSTEM,
    label: I18N.energyCarbon.productionSystem,
  },
  {
    value: ORG_BOUNDARY_TYPE.GEOGRAPHIC_LOCATION,
    label: I18N.energyCarbon.geographicalLocation,
  },
  {
    value: ORG_BOUNDARY_TYPE.ORGANIZATION,
    label: I18N.energyCarbon.organizationalStructure,
  },
];

/** 根据类型编码返回页面展示名称。 */
export function getOrgBoundaryTypeName(type: OrgBoundaryType) {
  return (
    getOrgBoundaryTypeOptions().find(option => option.value === type)?.label ??
    '-'
  );
}
