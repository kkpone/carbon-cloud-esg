import I18N from '@src/lang/I18N';
import { Button, Input, Modal, Tag } from 'antd';
import { FC, useEffect, useMemo, useRef, useState } from 'react';

import { AppendixFile } from '@/components/Appendix/File';
import { AppendixLink } from '@/components/Appendix/Link';
import { AppendixItem, AppendixList } from '@/components/Appendix/ShowList';
import { AppendixText } from '@/components/Appendix/Text';
import { uuid } from '@/utils';

import styles from './index.module.less';
import { ReportReferFile, SectionAttachment } from '../../service';

export interface ISectionAttachmentModalProps {
  open: boolean;
  sectionTitle: string;
  value: SectionAttachment[];
  sectionPrompt?: string;
  globalReferFiles?: ReportReferFile[];
  globalReferLinks?: string[];
  globalReferTexts?: string[];
  onCancel: () => void;
  onConfirm: (payload: {
    attachments: SectionAttachment[];
    sectionPrompt: string;
  }) => void;
}

const toAppendixItem = (item: SectionAttachment): AppendixItem => ({
  uuid: item.id || uuid(),
  type: item.type,
  value: {
    showName: item.type === 'text' ? item.content || item.name : item.name,
    fileUrl: item.url,
    fileSize: item.fileSize,
  },
});

const fromAppendixItem = (item: AppendixItem): SectionAttachment => ({
  id: item.uuid,
  type: item.type,
  name: item.value.showName,
  url: item.value.fileUrl,
  content: item.type === 'text' ? item.value.showName : undefined,
  fileSize: item.value.fileSize,
});

export const SectionAttachmentModal: FC<ISectionAttachmentModalProps> = ({
  open,
  sectionTitle,
  value,
  sectionPrompt = '',
  globalReferFiles = [],
  globalReferLinks = [],
  globalReferTexts = [],
  onCancel,
  onConfirm,
}) => {
  const [items, setItems] = useState<AppendixItem[]>([]);
  const [promptText, setPromptText] = useState('');
  const appendixFileRef = useRef<{
    delFile: (uid: string) => void;
    delAllFiles?: () => void;
  }>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setItems(value.map(toAppendixItem));
    setPromptText(sectionPrompt || '');
  }, [open, value, sectionPrompt]);

  const globalReferences = useMemo(() => {
    const refs: SectionAttachment[] = [];
    globalReferFiles.forEach(file => {
      refs.push({
        type: 'file',
        name: file.name,
        url: file.url,
      });
    });
    globalReferLinks.forEach(link => {
      refs.push({
        type: 'link',
        name: link,
        url: link,
      });
    });
    globalReferTexts.forEach(txt => {
      refs.push({
        type: 'text',
        name: txt,
        content: txt,
      });
    });
    return refs;
  }, [globalReferFiles, globalReferLinks, globalReferTexts]);

  const isAlreadyAdded = (refItem: SectionAttachment) =>
    items.some(
      existing =>
        existing.type === refItem.type &&
        (existing.value.fileUrl || existing.value.showName) ===
          (refItem.url || refItem.name),
    );

  const hasUploading = items.some(item => item.value.status === 'uploading');

  return (
    <Modal
      title={`${I18N.esg.sectionAttachmentTitle} - ${sectionTitle}`}
      width={720}
      open={open}
      destroyOnClose
      footer={null}
      onCancel={onCancel}
    >
      <div className={styles.content}>
        <div className={styles.tip}>{I18N.esg.addSectionAttachmentTip}</div>
        <AppendixList
          items={items}
          canDelete
          del={id => {
            const target = items.find(item => item.uuid === id);
            if (target?.type === 'file' && target.fileUid) {
              appendixFileRef.current?.delFile(target.fileUid);
            }
            setItems(prev => prev.filter(item => item.uuid !== id));
          }}
        />
        <div className={styles.actionBar}>
          <AppendixFile
            ref={appendixFileRef}
            maxCount={Math.max(0, 10 - items.length)}
            submit={uploadedList => {
              setItems(prev => {
                const valueMap = new Map(
                  uploadedList.map(file => [file.fileUid, file]),
                );
                const updatedPrev = prev.map(existing => {
                  if (existing.fileUid && valueMap.has(existing.fileUid)) {
                    const matched = valueMap.get(existing.fileUid)!;
                    valueMap.delete(existing.fileUid);
                    return {
                      ...existing,
                      value: {
                        showName: matched.showName,
                        fileSize: matched.fileSize,
                        fileUrl: matched.fileUrl,
                        status: matched.status,
                      },
                    };
                  }
                  return existing;
                });
                const appended: AppendixItem[] = [];
                valueMap.forEach(file => {
                  appended.push({
                    uuid: uuid(),
                    type: 'file',
                    fileUid: file.fileUid,
                    value: {
                      showName: file.showName,
                      fileSize: file.fileSize,
                      fileUrl: file.fileUrl,
                      status: file.status,
                    },
                  });
                });
                return [...updatedPrev, ...appended];
              });
            }}
          />
          <AppendixLink
            submit={linkVal => {
              if (!linkVal) {
                return;
              }
              setItems(prev => [
                ...prev,
                {
                  uuid: uuid(),
                  type: 'link',
                  value: { showName: linkVal },
                },
              ]);
            }}
          />
          <AppendixText
            submit={textVal => {
              if (!textVal) {
                return;
              }
              setItems(prev => [
                ...prev,
                {
                  uuid: uuid(),
                  type: 'text',
                  value: { showName: textVal },
                },
              ]);
            }}
          />
        </div>
        {globalReferences.length > 0 && (
          <div className={styles.globalRefBox}>
            <div className={styles.globalRefTitle}>
              {I18N.esg.addFromReportLibrary}
            </div>
            <div className={styles.globalRefList}>
              {globalReferences.map(refItem => {
                const added = isAlreadyAdded(refItem);
                return (
                  <Tag
                    key={`${refItem.type}-${refItem.url || refItem.name}`}
                    color={added ? 'cyan' : 'default'}
                    style={{ cursor: added ? 'default' : 'pointer', margin: 0 }}
                    onClick={() => {
                      if (added || items.length >= 10) {
                        return;
                      }
                      setItems(prev => [...prev, toAppendixItem(refItem)]);
                    }}
                  >
                    {added ? '- ' : '+ '}
                    {refItem.name}
                  </Tag>
                );
              })}
            </div>
          </div>
        )}
        <div className={styles.promptBox}>
          <div className={styles.promptLabel}>{I18N.esg.sectionPrompt}</div>
          <Input.TextArea
            value={promptText}
            onChange={e => setPromptText(e.target.value)}
            placeholder={I18N.esg.sectionPromptPlaceholder}
            autoSize={{ minRows: 2, maxRows: 5 }}
            maxLength={500}
            showCount
          />
        </div>
      </div>
      <div className={styles.footer}>
        <Button onClick={onCancel}>{I18N.carbonFootprint.cancel}</Button>
        <Button
          type='primary'
          disabled={hasUploading}
          onClick={() => {
            onConfirm({
              attachments: items
                .filter(item => item.value.status !== 'error')
                .map(fromAppendixItem),
              sectionPrompt: promptText.trim(),
            });
            onCancel();
          }}
        >
          {I18N.carbonFootprint.confirm2}
        </Button>
      </div>
    </Modal>
  );
};
