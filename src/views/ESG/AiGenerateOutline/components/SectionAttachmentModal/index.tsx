import {
  DeleteOutlined,
  LinkOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { Button, Input, Modal, Select, Spin, Tag, Tooltip } from 'antd';
import { FC, useEffect, useMemo, useRef, useState } from 'react';

import { AppendixFile } from '@/components/Appendix/File';
import { AppendixLink } from '@/components/Appendix/Link';
import { AppendixItem } from '@/components/Appendix/ShowList';
import { AppendixText } from '@/components/Appendix/Text';
import { IconAlibabaNew } from '@/components/iconfont';
import { getFileIcon, uuid } from '@/utils';

import styles from './index.module.less';
import { inferMaterialCategoryFromName } from '../../promptUtils';
import {
  ReportReferFile,
  SectionAttachment,
  SectionMaterialCategory,
  SectionWritingTemplate,
} from '../../service';

export interface ISectionAttachmentModalProps {
  open: boolean;
  sectionTitle: string;
  sectionPath?: string;
  sectionDepth?: number;
  value: SectionAttachment[];
  inheritedAttachments?: SectionAttachment[];
  sectionPrompt?: string;
  writingTemplate?: SectionWritingTemplate;
  globalReferFiles?: ReportReferFile[];
  globalReferLinks?: string[];
  globalReferTexts?: string[];
  onCancel: () => void;
  onConfirm: (payload: {
    attachments: SectionAttachment[];
    sectionPrompt: string;
    writingTemplate: SectionWritingTemplate;
  }) => void;
}

type ModalAppendixItem = AppendixItem & {
  category: SectionMaterialCategory;
  note?: string;
};

const toAppendixItem = (item: SectionAttachment): ModalAppendixItem => ({
  uuid: item.id || uuid(),
  type: item.type,
  category: item.category || inferMaterialCategoryFromName(item.name || ''),
  note: item.note || '',
  value: {
    showName: item.type === 'text' ? item.content || item.name : item.name,
    fileUrl: item.url,
    fileSize: item.fileSize,
  },
});

const fromAppendixItem = (item: ModalAppendixItem): SectionAttachment => ({
  id: item.uuid,
  type: item.type,
  name: item.value.showName,
  url: item.value.fileUrl,
  content: item.type === 'text' ? item.value.showName : undefined,
  fileSize: item.value.fileSize,
  category: item.category,
  note: item.note?.trim() || undefined,
});

export const SectionAttachmentModal: FC<ISectionAttachmentModalProps> = ({
  open,
  sectionTitle,
  sectionPath,
  sectionDepth = 0,
  value,
  inheritedAttachments = [],
  sectionPrompt = '',
  writingTemplate = 'auto',
  globalReferFiles = [],
  globalReferLinks = [],
  globalReferTexts = [],
  onCancel,
  onConfirm,
}) => {
  const [items, setItems] = useState<ModalAppendixItem[]>([]);
  const [promptText, setPromptText] = useState('');
  const [templateVal, setTemplateVal] =
    useState<SectionWritingTemplate>('auto');
  const appendixFileRef = useRef<{
    delFile: (uid: string) => void;
    delAllFiles?: () => void;
  }>(null);

  const categoryOptions = useMemo(
    () => [
      { label: I18N.esg.evidenceCategoryPolicy, value: 'policy' },
      { label: I18N.esg.evidenceCategoryLedger, value: 'ledger' },
      { label: I18N.esg.evidenceCategoryCertificate, value: 'certificate' },
      { label: I18N.esg.evidenceCategoryCase, value: 'case_material' },
      { label: I18N.esg.evidenceCategoryOther, value: 'other' },
    ],
    [],
  );

  const templateOptions = useMemo(
    () => [
      { label: I18N.esg.writingTemplateAuto, value: 'auto' },
      { label: I18N.esg.writingTemplateFiveStep, value: 'five_step' },
      { label: I18N.esg.writingTemplateFourPillar, value: 'four_pillar' },
      { label: I18N.esg.writingTemplateStarCase, value: 'star_case' },
    ],
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setItems(value.map(toAppendixItem));
    setPromptText(sectionPrompt || '');
    setTemplateVal(writingTemplate || 'auto');
  }, [open, value, sectionPrompt, writingTemplate]);

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
      width={780}
      open={open}
      destroyOnClose
      footer={null}
      onCancel={onCancel}
    >
      <div className={styles.content}>
        {sectionPath && (
          <div className={styles.pathBar}>
            <Tag
              color={sectionDepth === 0 ? 'geekblue' : 'cyan'}
              style={{ margin: 0 }}
            >
              {sectionDepth === 0
                ? I18N.esg.chapterLevelTag
                : I18N.esg.subsectionLevelTag}
            </Tag>
            <span className={styles.pathText}>
              {`${I18N.esg.sectionPathLabel}：${sectionPath}`}
            </span>
          </div>
        )}
        <div className={styles.tip}>{I18N.esg.addSectionAttachmentTip}</div>
        {inheritedAttachments.length > 0 && (
          <div className={styles.inheritedBox}>
            <div className={styles.inheritedTitle}>
              {I18N.template(I18N.esg.inheritedEvidenceTip, {
                val1: inheritedAttachments.length,
              })}
            </div>
            <div className={styles.inheritedList}>
              {inheritedAttachments.map(att => (
                <Tag
                  key={`inh-${att.id || att.url || att.name}`}
                  style={{ margin: 0 }}
                >
                  {att.name}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {items.length > 0 && (
          <div className={styles.evidenceList}>
            {items.map(item => (
              <Spin
                key={item.uuid}
                spinning={item.value.status === 'uploading'}
              >
                <div className={styles.evidenceItem}>
                  <div className={styles.evidenceTop}>
                    <div className={styles.evidenceNameWrap}>
                      {item.type === 'file' && (
                        <IconAlibabaNew
                          style={{ fontSize: 18, flexShrink: 0 }}
                          type={getFileIcon(
                            item.value.fileUrl || item.value.showName,
                          )}
                        />
                      )}
                      {item.type === 'link' && (
                        <LinkOutlined
                          style={{ color: '#026961', flexShrink: 0 }}
                        />
                      )}
                      {item.type === 'text' && (
                        <FileTextOutlined
                          style={{ color: '#026961', flexShrink: 0 }}
                        />
                      )}
                      <Tooltip title={item.value.showName}>
                        <span className={styles.evidenceName}>
                          {item.value.showName}
                        </span>
                      </Tooltip>
                      {item.type === 'file' && item.value.fileSize && (
                        <span className={styles.evidenceSize}>
                          {`(${item.value.fileSize})`}
                        </span>
                      )}
                    </div>
                    <div className={styles.evidenceControls}>
                      <Select<SectionMaterialCategory>
                        size='small'
                        style={{ width: 112 }}
                        value={item.category}
                        options={categoryOptions}
                        onChange={category =>
                          setItems(prev =>
                            prev.map(cur =>
                              cur.uuid === item.uuid
                                ? { ...cur, category }
                                : cur,
                            ),
                          )
                        }
                      />
                      <Button
                        type='text'
                        size='small'
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => {
                          if (item.type === 'file' && item.fileUid) {
                            appendixFileRef.current?.delFile(item.fileUid);
                          }
                          setItems(prev =>
                            prev.filter(cur => cur.uuid !== item.uuid),
                          );
                        }}
                      />
                    </div>
                  </div>
                  <Input
                    size='small'
                    value={item.note || ''}
                    placeholder={I18N.esg.evidenceNotePlaceholder}
                    maxLength={120}
                    onChange={e => {
                      const nextNote = e.target.value;
                      setItems(prev =>
                        prev.map(cur =>
                          cur.uuid === item.uuid
                            ? { ...cur, note: nextNote }
                            : cur,
                        ),
                      );
                    }}
                  />
                </div>
              </Spin>
            ))}
          </div>
        )}
        <div className={styles.actionBar}>
          <AppendixFile
            ref={appendixFileRef}
            maxCount={Math.max(0, 20 - items.length)}
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
                const appended: ModalAppendixItem[] = [];
                valueMap.forEach(file => {
                  appended.push({
                    uuid: uuid(),
                    type: 'file',
                    category: inferMaterialCategoryFromName(file.showName),
                    note: '',
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
                  category: 'other',
                  note: '',
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
                  category: 'case_material',
                  note: '',
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
                      if (added || items.length >= 20) {
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
          <div className={styles.promptLabel}>
            {I18N.esg.sectionWritingTemplateLabel}
          </div>
          <Select<SectionWritingTemplate>
            value={templateVal}
            options={templateOptions}
            onChange={setTemplateVal}
          />
        </div>
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
              writingTemplate: templateVal,
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
