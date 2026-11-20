/** 角色数据范围：全部、所属分组及下级、所属节点、仅本人。 */
export type RoleDataScope = 1 | 2 | 3 | 4;

export interface Column {
  id: string;
  roleName: string;
  type: boolean;
  roleInfo: string;
  staff_count: string;
  is_master: boolean;
  roleId: number | string;
  dataScope?: RoleDataScope;
}
