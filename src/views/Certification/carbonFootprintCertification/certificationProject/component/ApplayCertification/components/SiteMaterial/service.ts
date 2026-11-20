import { request } from '@api/request';

export type SiteMaterialFileType = 'IMAGE' | 'VIDEO';

export interface SiteMaterialFile {
  name: string;
  size: string;
  sizeUnit: string;
  url: string;
  uploadTime: string;
}

export interface SiteMaterialCard {
  id?: number;
  authId?: number;
  certId: number;
  authType: number;
  title: string;
  content: string;
  allowedFileTypes: SiteMaterialFileType[];
  requiredFlag: number;
  exampleFiles?: SiteMaterialFile[];
  files?: SiteMaterialFile[];
  sort?: number;
  remarked?: number;
  locked?: boolean;
}

export const getSiteMaterialList = (params: {
  authId?: number;
  certId: number;
  authType: number;
}) =>
  request<{ data: SiteMaterialCard[] }>({
    method: 'GET',
    url: '/authentication/authSiteMaterial/list',
    params,
  });

export const saveSiteMaterialFiles = (data: {
  id: number;
  authId: number;
  files: SiteMaterialFile[];
}) =>
  request<{ data: boolean }>({
    method: 'POST',
    url: '/authentication/authSiteMaterial/material-files',
    data,
  });
