/** 上传接口返回的文件信息（与 OpenAPI FileUpload schema 对齐） */
export interface FileInfo {
  /** 文件名 */
  fileName: string;
  /** 服务端存储路径（部分接口返回 null，以 url 作为唯一标识） */
  filePath: string | null;
  /** 外网可访问 URL */
  url: string;
  /** 部分列表/历史接口返回的文件 URL 字段 */
  fileUrl?: string | null;
  /** 服务端文件 id（分配支撑材料等 JSON 回放/提交时与 base 一致） */
  fileId?: string;
}
