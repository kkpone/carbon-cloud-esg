import { baseUrl } from '@/api/request';
import I18N from '@/lang/I18N';
import { UPLOAD_FILES_RANDOM_NAME_URL } from '@/utils/const';
import { getToken } from '@/utils/cookie';
import { UploadOutlined } from '@ant-design/icons';
import {
  type UploadFile,
  type UploadProps,
  Button,
  Upload,
  message,
} from 'antd';

import { useEffect, useState } from 'react';
import type { FileInfo } from './types';

export type { FileInfo } from './types';
interface Props {
  value?: FileInfo[];
  onChange?: (files: FileInfo[]) => void;
  disabled?: boolean;
  maxCount?: number;
  maxSizeMB?: number;
  accept?: string[];
  uploadUrl?: string;
  'data-testid'?: string;
}
const EMPTY_FILES: FileInfo[] = [];
/** 上传复用碳云接口；上传中保留本地进度，只把已确认回执写入业务表单。 */
export default function FileUpload({
  value = EMPTY_FILES,
  onChange,
  disabled,
  maxCount = 10,
  maxSizeMB = 10,
  accept,
  uploadUrl,
  ...rest
}: Props) {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  useEffect(
    () =>
      setFileList(
        value.map(file => ({
          uid: file.url,
          name: file.fileName,
          url: file.url,
          status: 'done',
        })),
      ),
    [value],
  );
  const handleChange: UploadProps['onChange'] = info => {
    setFileList(info.fileList);
    if (info.file.status === 'uploading') return;
    if (info.file.status === 'error')
      message.error(I18N.importFile.status.failed);
    const files = info.fileList
      .filter(file => file.status === 'done' || file.status === undefined)
      .flatMap(file => {
        const payload = file.response?.data;
        const url = payload?.url || payload?.filePath || file.url;
        return url
          ? [
              {
                fileName: payload?.fileName || file.name,
                filePath: payload?.filePath || url,
                url,
              },
            ]
          : [];
      });
    if (
      info.file.status === 'done' &&
      !info.file.response?.data?.url &&
      !info.file.response?.data?.filePath
    )
      message.error(I18N.importFile.status.failed);
    onChange?.(files);
  };
  return (
    <Upload
      {...rest}
      action={`${baseUrl}${uploadUrl || UPLOAD_FILES_RANDOM_NAME_URL}`}
      headers={{ Authorization: getToken() }}
      disabled={disabled}
      maxCount={maxCount}
      accept={accept?.map(item => `.${item.replace(/^\./, '')}`).join(',')}
      fileList={fileList}
      onChange={handleChange}
      beforeUpload={file => {
        if (file.size > maxSizeMB * 1024 * 1024) {
          message.error(I18N.importFile.status.failed);
          return Upload.LIST_IGNORE;
        }
        return true;
      }}
    >
      <Button disabled={disabled} icon={<UploadOutlined />}>
        {I18N.energyCarbon.inventoryImportFile}
      </Button>
    </Upload>
  );
}
