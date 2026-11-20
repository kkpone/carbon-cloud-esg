import { PreviewFile, PreviewType } from './types';

const IMAGE_EXTENSIONS = new Set([
  'bmp',
  'gif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'webp',
]);
const OFFICE_EXTENSIONS = new Set(['doc', 'docx', 'xls', 'xlsx']);

export function getFileExtension(fileName: string): string {
  return fileName.split('?')[0].split('.').pop()?.toLowerCase() || '';
}

export function getPreviewType(file: PreviewFile): PreviewType {
  const extension = getFileExtension(file.name);

  if (IMAGE_EXTENSIONS.has(extension)) return 'image';
  if (extension === 'pdf') return 'pdf';
  if (OFFICE_EXTENSIONS.has(extension)) return 'office';
  return 'unsupported';
}

export function getOfficeType(fileName: string): 's' | 'w' {
  return ['xls', 'xlsx'].includes(getFileExtension(fileName)) ? 's' : 'w';
}
