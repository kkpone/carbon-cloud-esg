export interface PreviewFile {
  id: number | string;
  name: string;
  url: string;
}

export type PreviewType = 'image' | 'office' | 'pdf' | 'unsupported';
