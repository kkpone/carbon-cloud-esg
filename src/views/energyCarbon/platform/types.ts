/** 碳云统一响应。 */
export interface ResponseData<T = unknown> {
  code: number;
  msg: string;
  data: T;
}
/** 组织树来自能碳后端同一权限边界。 */
export interface OrgTree {
  id: number;
  code: string;
  name: string;
  pcode?: string;
  children?: OrgTree[];
  orgStatus?: number;
  orgAbbr?: string;
}
