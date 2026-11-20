import {
  CloseCircleFilled,
  CloudUploadOutlined,
  DownloadOutlined,
  EyeOutlined,
  InfoCircleOutlined,
  PlayCircleFilled,
} from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { Button, message, Spin, Upload } from 'antd';
import type { UploadFile } from 'antd';
import { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { commonRequestDownloadFile } from '@/api/commonRequest';
import { getToken } from '@/utils/cookie';
import { AnnotationListModal } from '@/views/subModules/CarbonFootprintModel/Certification/CertificationForm/components/CarbonLabelFile/AnnotationListModal';

import emptyImage from './empty.svg';
import styles from './index.module.less';
import { getSiteMaterialList, saveSiteMaterialFiles } from './service';
import type {
  SiteMaterialCard,
  SiteMaterialFile,
  SiteMaterialFileType,
} from './service';

const MAX_FILE_COUNT = 5;
const MAX_FILE_SIZE = 500 * 1024 * 1024;
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'];
const VIDEO_EXTENSIONS = [
  'mp4',
  'mov',
  'avi',
  'mkv',
  'wmv',
  'flv',
  'webm',
  'mpeg',
  'mpg',
  'm4v',
];

interface UploadResponse {
  code?: number;
  msg?: string;
  data?: string | { url?: string };
}

interface SiteMaterialProps {
  authId?: number;
  certId?: number;
  authType: number;
  readOnly?: boolean;
  saveImmediately?: boolean;
  onSaveReady?: (save?: (authId: number) => Promise<void>) => void;
}

const getExtension = (file: Pick<SiteMaterialFile, 'name' | 'url'>) => {
  const path = (file.name || file.url || '').split('?')[0];
  return path.includes('.') ? path.split('.').pop()?.toLowerCase() || '' : '';
};

const getAllowedExtensions = (types: SiteMaterialFileType[]) => [
  ...(types.includes('IMAGE') ? IMAGE_EXTENSIONS : []),
  ...(types.includes('VIDEO') ? VIDEO_EXTENSIONS : []),
];

const getUploadUrl = (file: UploadFile<UploadResponse>) => {
  const data = file.response?.data;
  return typeof data === 'string' ? data : data?.url;
};

const getCardKey = (card: SiteMaterialCard) =>
  `${card.certId}-${card.authType}-${card.sort ?? ''}-${card.title}-${
    card.content
  }`;

const isVideoFile = (file: SiteMaterialFile) =>
  VIDEO_EXTENSIONS.includes(getExtension(file));

const SiteMaterial: FC<SiteMaterialProps> = ({
  authId,
  certId,
  authType,
  readOnly = false,
  saveImmediately = false,
  onSaveReady,
}) => {
  const [cards, setCards] = useState<SiteMaterialCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<
    Record<string, UploadFile<UploadResponse>[]>
  >({});
  const [annotationListCard, setAnnotationListCard] =
    useState<SiteMaterialCard>();
  const cardsRef = useRef<SiteMaterialCard[]>([]);
  const dirtyCardKeysRef = useRef<Set<string>>(new Set());

  const updateCards = useCallback((nextCards: SiteMaterialCard[]) => {
    cardsRef.current = nextCards;
    setCards(nextCards);
  }, []);

  const loadCards = useCallback(
    async (currentAuthId = authId) => {
      if (!certId) {
        updateCards([]);
        return [];
      }
      setLoading(true);
      try {
        const { data } = await getSiteMaterialList({
          authId: currentAuthId,
          certId,
          authType,
        });
        const nextCards = data.data || [];
        dirtyCardKeysRef.current.clear();
        updateCards(nextCards);
        return nextCards;
      } finally {
        setLoading(false);
      }
    },
    [authId, authType, certId, updateCards],
  );

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const sortedCards = useMemo(
    () =>
      [...cards].sort(
        (a, b) => (b.sort ?? 0) - (a.sort ?? 0) || (b.id ?? 0) - (a.id ?? 0),
      ),
    [cards],
  );

  const updateCardFiles = useCallback(
    async (card: SiteMaterialCard, files: SiteMaterialFile[]) => {
      const cardKey = getCardKey(card);
      if (saveImmediately && card.id && card.authId) {
        await saveSiteMaterialFiles({
          id: card.id,
          authId: card.authId,
          files,
        });
        dirtyCardKeysRef.current.delete(cardKey);
        updateCards(
          cardsRef.current.map(item =>
            getCardKey(item) === cardKey
              ? { ...item, files, remarked: 0 }
              : item,
          ),
        );
        return;
      }
      dirtyCardKeysRef.current.add(cardKey);
      updateCards(
        cardsRef.current.map(item =>
          getCardKey(item) === cardKey ? { ...item, files } : item,
        ),
      );
    },
    [saveImmediately, updateCards],
  );

  const savePendingFiles = useCallback(
    async (currentAuthId: number) => {
      if (!certId || dirtyCardKeysRef.current.size === 0) return;
      const pendingCards = cardsRef.current.filter(card =>
        dirtyCardKeysRef.current.has(getCardKey(card)),
      );
      const { data } = await getSiteMaterialList({
        authId: currentAuthId,
        certId,
        authType,
      });
      const persistedCards = data.data || [];
      await Promise.all(
        pendingCards.map(card => {
          const persistedCard = persistedCards.find(
            item => getCardKey(item) === getCardKey(card),
          );
          if (!persistedCard?.id || !persistedCard.authId) {
            throw new Error(I18N.Certification.siteMaterialInitFailed);
          }
          return saveSiteMaterialFiles({
            id: persistedCard.id,
            authId: persistedCard.authId,
            files: card.files || [],
          });
        }),
      );
      dirtyCardKeysRef.current.clear();
      await loadCards(currentAuthId);
    },
    [authType, certId, loadCards],
  );

  useEffect(() => {
    onSaveReady?.(savePendingFiles);
    return () => onSaveReady?.();
  }, [onSaveReady, savePendingFiles]);

  const handleUploadChange = (
    card: SiteMaterialCard,
    nextUploadFiles: UploadFile<UploadResponse>[],
  ) => {
    const cardKey = getCardKey(card);
    setUploadFiles(pre => ({ ...pre, [cardKey]: nextUploadFiles }));
    if (nextUploadFiles.some(file => file.status === 'uploading')) return;

    const failedFiles = nextUploadFiles.filter(
      file => file.status === 'error' || !getUploadUrl(file),
    );
    if (failedFiles.length > 0) {
      message.error(
        failedFiles
          .map(
            file =>
              file.response?.msg ||
              I18N.template(I18N.Certification.siteMaterialFileUploadFailed, {
                val1: file.name,
              }),
          )
          .join('、'),
      );
    }

    const newFiles = nextUploadFiles
      .filter(file => file.status === 'done' && getUploadUrl(file))
      .map(file => ({
        name: file.name,
        size: ((file.size || 0) / 1024 / 1024).toFixed(2),
        sizeUnit: 'MB',
        url: getUploadUrl(file) || '',
        uploadTime: new Date().toISOString().slice(0, 10),
      }));

    if (newFiles.length === 0) {
      setUploadFiles(pre => ({ ...pre, [cardKey]: [] }));
      return;
    }

    const latestCard = cardsRef.current.find(
      item => getCardKey(item) === cardKey,
    );
    void updateCardFiles(card, [...(latestCard?.files || []), ...newFiles])
      .then(() => {
        message.success(I18N.Certification.siteMaterialUploadSuccess);
        setUploadFiles(pre => ({ ...pre, [cardKey]: [] }));
      })
      .catch(() => {
        message.error(I18N.Certification.siteMaterialUploadFailed);
        setUploadFiles(pre => ({ ...pre, [cardKey]: [] }));
      });
  };

  const deleteFile = (card: SiteMaterialCard, fileUrl: string) => {
    void updateCardFiles(
      card,
      (card.files || []).filter(file => file.url !== fileUrl),
    ).catch(() => message.error(I18N.Certification.siteMaterialDeleteFailed));
  };
  const handleDownload = async (file: SiteMaterialFile) => {
    try {
      await commonRequestDownloadFile(file.url, file.name);
    } catch {
      message.error(I18N.Certification.siteMaterialDownloadFailed);
    }
  };

  const renderFilePreview = (
    file: SiteMaterialFile,
    example: boolean,
    card?: SiteMaterialCard,
  ) => (
    <div
      className={styles.fileItem}
      key={`${example ? 'example' : 'file'}-${file.url}`}
    >
      <div className={styles.filePreview} title={file.name}>
        {isVideoFile(file) ? (
          <>
            <video
              className={styles.fileMedia}
              src={file.url}
              muted
              preload='metadata'
            />
            <PlayCircleFilled className={styles.playIcon} />
          </>
        ) : (
          <img className={styles.fileMedia} src={file.url} alt={file.name} />
        )}
        {example && (
          <span className={styles.exampleBadge}>
            {I18N.Certification.siteMaterialExample}
          </span>
        )}
        <div className={styles.fileActions}>
          <button
            className={styles.fileAction}
            type='button'
            title={I18N.Certification.siteMaterialView}
            aria-label={I18N.template(I18N.Certification.siteMaterialViewFile, {
              val1: file.name,
            })}
            onClick={() =>
              window.open(file.url, '_blank', 'noopener,noreferrer')
            }
          >
            <EyeOutlined />
          </button>
          <span className={styles.fileActionDivider} />
          <button
            className={styles.fileAction}
            type='button'
            title={I18N.Certification.siteMaterialDownload}
            aria-label={I18N.template(
              I18N.Certification.siteMaterialDownloadFile,
              { val1: file.name },
            )}
            onClick={() => handleDownload(file)}
          >
            <DownloadOutlined />
          </button>
        </div>
      </div>
      {!example && card && !readOnly && !card.locked && (
        <button
          className={styles.removeFile}
          type='button'
          aria-label={I18N.template(I18N.Certification.siteMaterialDeleteFile, {
            val1: file.name,
          })}
          onClick={() => deleteFile(card, file.url)}
        >
          <CloseCircleFilled />
        </button>
      )}
    </div>
  );

  return (
    <div className={styles.siteMaterial}>
      <div className={styles.sectionTitle}>
        {I18N.Certification.siteMaterialTitle}
      </div>
      <div className={styles.sectionDesc}>
        {I18N.Certification.siteMaterialDescription}
      </div>
      <Spin spinning={loading}>
        {sortedCards.length === 0 ? (
          <div className={styles.empty}>
            <img className={styles.emptyImage} src={emptyImage} alt='' />
            <div className={styles.emptyDescription}>
              {I18N.Certification.siteMaterialEmpty}
            </div>
          </div>
        ) : (
          <div className={styles.cardList}>
            {sortedCards.map(card => {
              const cardKey = getCardKey(card);
              const files = card.files || [];
              const allowedExtensions = getAllowedExtensions(
                card.allowedFileTypes || [],
              );
              const canEdit = !readOnly && !card.locked;
              const remainingCount = MAX_FILE_COUNT - files.length;
              const cardUploadFiles = uploadFiles[cardKey] || [];
              return (
                <div className={styles.card} key={cardKey}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardText}>
                      <div className={styles.cardTitle}>
                        {card.requiredFlag === 1 && (
                          <span className={styles.required}>*</span>
                        )}
                        {card.title}
                      </div>
                      <div className={styles.cardContent}>{card.content}</div>
                    </div>
                    {card.id && (
                      <Button
                        className={styles.annotationButton}
                        type='link'
                        icon={
                          card.remarked ? (
                            <InfoCircleOutlined style={{ color: '#BB6F44' }} />
                          ) : null
                        }
                        onClick={() => setAnnotationListCard(card)}
                      >
                        {I18N.subModules.viewComments}
                      </Button>
                    )}
                  </div>
                  <div className={styles.cardDivider} />
                  {Boolean(card.exampleFiles?.length) && (
                    <div className={styles.fileGallery}>
                      {card.exampleFiles?.map(file =>
                        renderFilePreview(file, true),
                      )}
                    </div>
                  )}
                  {files.length > 0 && (
                    <div className={styles.fileGallery}>
                      {files.map(file => renderFilePreview(file, false, card))}
                    </div>
                  )}
                  {canEdit && remainingCount > 0 && (
                    <Upload<UploadResponse>
                      accept={allowedExtensions
                        .map(extension => `.${extension}`)
                        .join(',')}
                      action={`${
                        process.env.REACT_APP_API_URL || ''
                      }/file/file/uploadOSS`}
                      headers={{ Authorization: getToken() }}
                      fileList={cardUploadFiles}
                      multiple
                      showUploadList={false}
                      beforeUpload={(file, selectedFiles) => {
                        const fileIndex = selectedFiles.findIndex(
                          selected => selected.uid === file.uid,
                        );
                        if (fileIndex >= remainingCount) {
                          if (fileIndex === remainingCount) {
                            message.warning(
                              I18N.Certification.siteMaterialMaxFileCount,
                            );
                          }
                          return Upload.LIST_IGNORE;
                        }
                        const extension = getExtension({
                          name: file.name,
                          url: '',
                        });
                        if (!allowedExtensions.includes(extension)) {
                          message.error(
                            I18N.template(
                              I18N.Certification.siteMaterialFileTypeInvalid,
                              { val1: file.name },
                            ),
                          );
                          return Upload.LIST_IGNORE;
                        }
                        if (file.size > MAX_FILE_SIZE) {
                          message.error(
                            I18N.template(
                              I18N.Certification.siteMaterialFileTooLarge,
                              { val1: file.name },
                            ),
                          );
                          return Upload.LIST_IGNORE;
                        }
                        return true;
                      }}
                      onChange={({ fileList }) =>
                        handleUploadChange(card, fileList)
                      }
                    >
                      <Button
                        className={styles.uploadButton}
                        type='link'
                        icon={<CloudUploadOutlined />}
                      >
                        {I18N.Certification.siteMaterialUploadFile}
                      </Button>
                    </Upload>
                  )}
                  <div className={styles.uploadTip}>
                    {I18N.template(I18N.Certification.siteMaterialUploadTip, {
                      val1:
                        card.allowedFileTypes?.includes('IMAGE') &&
                        card.allowedFileTypes?.includes('VIDEO')
                          ? I18N.template(
                              I18N.Certification
                                .siteMaterialSupportedImagesAndVideos,
                              {
                                val1: IMAGE_EXTENSIONS.join(', '),
                                val2: VIDEO_EXTENSIONS.join(', '),
                              },
                            )
                          : card.allowedFileTypes?.includes('IMAGE')
                          ? I18N.template(
                              I18N.Certification.siteMaterialSupportedImages,
                              { val1: IMAGE_EXTENSIONS.join(', ') },
                            )
                          : I18N.template(
                              I18N.Certification.siteMaterialSupportedVideos,
                              { val1: VIDEO_EXTENSIONS.join(', ') },
                            ),
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Spin>
      <AnnotationListModal
        open={Boolean(annotationListCard)}
        isBoss={false}
        authFileId={annotationListCard?.id || 0}
        type='site_file'
        onCancel={() => setAnnotationListCard(undefined)}
      />
    </div>
  );
};

export default SiteMaterial;
