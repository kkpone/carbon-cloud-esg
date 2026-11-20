import { downloadFile } from '../../platform/files';

/** 下载当前可见导入记录的源文件或错误文件。 */
export function downloadByUrl(url: string, fileName?: string) {
  downloadFile({ url, fileName });
}
