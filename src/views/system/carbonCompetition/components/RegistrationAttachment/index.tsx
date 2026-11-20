import I18N from '@/lang/I18N';
import { Button, Space, Spin, Upload } from 'antd';
import pdfIcon from '@/assets/images/carbonCompetition/registration-pdf.svg';
import pngIcon from '@/assets/images/carbonCompetition/registration-png.svg';
import { useEffect, useState } from 'react';
import { competitionAssets as assets } from '../../assets';
import { call, prefix } from '../../service';
import type { FileRef, Overview } from '../../types';
import styles from './index.module.less';

type UploadedFile = FileRef & {
  fileName?: string;
  fileSize?: string | number;
  mimeType?: string;
};
type Props = {
  event: Overview;
  category: 'LICENSE' | 'LOGO';
  value?: FileRef;
  teamId?: string;
  savedFileKey?: string;
  disabled: boolean;
  onChange: (file?: FileRef) => void;
  onError: (error: string) => void;
  onUploadingChange: (uploading: boolean) => void;
};

export default function RegistrationAttachment({
  event,
  category,
  value,
  teamId,
  savedFileKey,
  disabled,
  onChange,
  onError,
  onUploadingChange,
}: Props) {
  const t = I18N.carbonCompetition;
  const d = t.design;
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<UploadedFile>();
  const [savedPreview, setSavedPreview] = useState<{
    key: string;
    url: string;
  }>();
  const [localPreview, setLocalPreview] = useState<{
    key: string;
    url: string;
  }>();
  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview.url);
    },
    [localPreview],
  );
  const file = uploaded?.fileKey === value?.fileKey ? uploaded : value;
  const name =
    uploaded?.fileKey === value?.fileKey ? uploaded?.fileName : undefined;
  const size =
    uploaded?.fileKey === value?.fileKey ? uploaded?.fileSize : undefined;
  const isLogo = category === 'LOGO';
  const label = isLogo ? t.logo : t.license;
  const saved = !!teamId && value?.fileKey === savedFileKey;
  useEffect(() => {
    if (!isLogo || !saved || !savedFileKey || !teamId) return;
    let cancelled = false;
    call<{ url: string }>(
      `${prefix(event.id)}/files/${encodeURIComponent(
        savedFileKey,
      )}/download?contextType=TEAM&contextId=${encodeURIComponent(teamId)}`,
    )
      .then(result => {
        if (!cancelled) setSavedPreview({ key: savedFileKey, url: result.url });
      })
      .catch(error => {
        if (!cancelled)
          onError(error instanceof Error ? error.message : t.failed);
      });
    return () => {
      cancelled = true;
    };
  }, [event.id, isLogo, saved, savedFileKey, teamId, onError, t.failed]);
  const previewImage = [localPreview, savedPreview].find(
    item => item?.key === value?.fileKey,
  );
  const uploadLabel = isLogo ? d.uploadImage : t.upload;
  const upload = (
    <Upload
      accept={isLogo ? '.png' : '.pdf,.jpg,.jpeg,.png'}
      showUploadList={false}
      disabled={disabled || uploading}
      beforeUpload={picked => {
        if (
          !(isLogo ? /\.png$/i : /\.(pdf|jpe?g|png)$/i).test(picked.name) ||
          picked.size > 10 * 1024 * 1024 ||
          picked.size === 0
        ) {
          onError(d.fileInvalid);
          return Upload.LIST_IGNORE;
        }
        setUploading(true);
        onError('');
        onUploadingChange(true);
        const data = new FormData();
        data.append('file', picked);
        data.append('category', category);
        data.append('requestId', crypto.randomUUID());
        call<UploadedFile>(`${prefix(event.id)}/files/upload`, data)
          .then(ref => {
            setUploaded(ref);
            onChange({
              fileKey: ref.fileKey,
              uploadReceipt: ref.uploadReceipt,
            });
            if (isLogo)
              setLocalPreview({
                key: ref.fileKey,
                url: URL.createObjectURL(picked),
              });
          })
          .catch(error =>
            onError(error instanceof Error ? error.message : t.failed),
          )
          .finally(() => {
            setUploading(false);
            onUploadingChange(false);
          });
        return false;
      }}
    >
      <Button
        type={value ? 'link' : 'default'}
        disabled={disabled || uploading}
        icon={
          !value && (
            <img
              src={assets['registration-img4']}
              alt=''
              width={16}
              height={16}
            />
          )
        }
      >
        {value ? d.reupload : uploadLabel}
      </Button>
    </Upload>
  );
  const preview = async () => {
    if (!file || !teamId) return;
    try {
      const result = await call<{ url: string }>(
        `${prefix(event.id)}/files/${encodeURIComponent(
          file.fileKey,
        )}/download?contextType=TEAM&contextId=${encodeURIComponent(teamId)}`,
      );
      window.location.assign(result.url);
    } catch (error) {
      onError(error instanceof Error ? error.message : t.failed);
    }
  };
  if (!value)
    return (
      <Spin spinning={uploading}>
        <div className={styles.empty} aria-busy={uploading}>
          {upload}
          <span>{isLogo ? d.logoHint : d.fileHint}</span>
        </div>
      </Spin>
    );
  return (
    <Spin spinning={uploading}>
      <div
        className={`${styles.file} ${
          isLogo && disabled ? styles.readOnlyLogo : ''
        }`}
        aria-busy={uploading}
      >
        {isLogo && (
          <div className={styles.preview}>
            {previewImage && (
              <img
                src={previewImage.url}
                alt={label}
                width={100}
                height={100}
              />
            )}
          </div>
        )}
        <div className={styles.info}>
          <div className={styles.name}>
            <img src={isLogo ? pngIcon : pdfIcon} alt='' />
            <span>{name || label}</span>
          </div>
          <p>
            {size
              ? I18N.template(d.fileSize, {
                  size: `${Math.ceil(Number(size) / 1024)} KB`,
                })
              : d.uploaded}
          </p>
          <Space wrap size={12}>
            {!disabled && (
              <>
                {upload}
                <Button
                  type='link'
                  danger
                  disabled={uploading}
                  onClick={() => onChange(undefined)}
                >
                  {d.deleteFile}
                </Button>
              </>
            )}
            {saved && (
              <Button type='link' onClick={preview}>
                {d.preview}
              </Button>
            )}
          </Space>
        </div>
      </div>
    </Spin>
  );
}
