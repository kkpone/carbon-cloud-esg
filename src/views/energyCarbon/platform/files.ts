import { commonRequestDownloadFile } from '@/api/commonRequest';

/** 源文件和错误文件均使用碳云现有下载方法。 */
export async function downloadFile({
  url,
  fileName,
}: {
  url?: string;
  fileName?: string;
}) {
  if (url) await commonRequestDownloadFile(url, fileName || 'download');
}
