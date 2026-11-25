import {
  BarChartOutlined,
  DeleteOutlined,
  PaperClipOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import I18N from '@src/lang/I18N';
import { Input, Spin, Tag, Tooltip, Upload } from 'antd';
import classNames from 'classnames';
import { isNil } from 'lodash-es';
import { CSSProperties, FC, useEffect, useMemo, useRef, useState } from 'react';

import { Toast, uuid } from '@/utils';

import { convertTreeToMarkdown } from './convertTreeToMarkdown';
import handleSvg from './image/handle.svg';
import styles from './index.module.less';
import { parseMarkdownToTree } from './parseMarkdownToTree';
import {
  inferMaterialCategoryFromName,
  saveStoredOutlineSections,
} from '../../promptUtils';
import {
  isEsgMockModeEnabled,
  isMockReportId,
  saveMockOutline,
} from '../../../mockReportService';
import {
  OutlineSectionNode,
  ReportDetailsType,
  ReportPromptConfig,
  SectionAttachment,
  SectionIndicatorRef,
  SectionWritingTemplate,
  postEditOutline,
  postEsgAnalyzeFilesExtractImages,
} from '../../service';
import { SectionAttachmentModal } from '../SectionAttachmentModal';
import { SectionIndicatorModal } from '../SectionIndicatorModal';

let preScrollTop = 0;

const QUICK_UPLOAD_ACCEPT =
  '.png,.jpg,.jpeg,.xlsx,.xls,.doc,.docx,.pdf,.PNG,.JPG,.JPEG,.XLSX,.XLS,.DOC,.DOCX,.PDF';

const getWritingTemplateShortLabel = (
  template?: SectionWritingTemplate,
): string => {
  if (template === 'five_step') return I18N.esg.writingTemplateFiveStep;
  if (template === 'four_pillar') return I18N.esg.writingTemplateFourPillar;
  if (template === 'star_case') return I18N.esg.writingTemplateStarCase;
  return '';
};

const findNodeContextById = (
  nodes: OutlineSectionNode[],
  targetId: string,
  ancestors: OutlineSectionNode[] = [],
): {
  node: OutlineSectionNode;
  depth: number;
  path: string;
  inheritedAttachments: SectionAttachment[];
} | null => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return {
        node,
        depth: ancestors.length,
        path: [...ancestors.map(a => a.title), node.title].join(' / '),
        inheritedAttachments: ancestors.flatMap(a => a.attachments || []),
      };
    }
    if (node.children?.length) {
      const found = findNodeContextById(node.children, targetId, [
        ...ancestors,
        node,
      ]);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

const findNodeById = (
  nodes: OutlineSectionNode[],
  targetId: string,
): OutlineSectionNode | null => {
  for (const node of nodes) {
    if (node.id === targetId) {
      return node;
    }
    if (node.children?.length) {
      const found = findNodeById(node.children, targetId);
      if (found) {
        return found;
      }
    }
  }
  return null;
};

const updateTreeNodes = (
  nodes: OutlineSectionNode[],
  updater: (node: OutlineSectionNode) => OutlineSectionNode | null,
): OutlineSectionNode[] =>
  nodes.reduce<OutlineSectionNode[]>((acc, node) => {
    const updated = updater(node);
    if (!updated) {
      return acc;
    }
    acc.push({
      ...updated,
      children: updated.children?.length
        ? updateTreeNodes(updated.children, updater)
        : [],
    });
    return acc;
  }, []);

const reorderSiblings = (
  nodes: OutlineSectionNode[],
  activeId: string,
  overId: string,
): { nextNodes: OutlineSectionNode[]; moved: boolean } => {
  const oldIndex = nodes.findIndex(item => item.id === activeId);
  const newIndex = nodes.findIndex(item => item.id === overId);
  if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
    return {
      nextNodes: arrayMove(nodes, oldIndex, newIndex),
      moved: true,
    };
  }
  let moved = false;
  const nextNodes = nodes.map(node => {
    if (!node.children?.length || moved) {
      return node;
    }
    const childResult = reorderSiblings(node.children, activeId, overId);
    if (childResult.moved) {
      moved = true;
      return {
        ...node,
        children: childResult.nextNodes,
      };
    }
    return node;
  });
  return { nextNodes, moved };
};

const formatIndicatorTag = (item: SectionIndicatorRef) => {
  const hasVal =
    !isNil(item.indicatorValue) && String(item.indicatorValue).trim() !== '';
  return hasVal
    ? `${item.name}: ${item.indicatorValue}${item.unitName || ''}`
    : item.name;
};

const TreeNodeItem: FC<{
  node: OutlineSectionNode;
  depth: number;
  inheritedAttachmentCount: number;
  disabled: boolean;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onEditTitle: (id: string, newTitle: string) => void;
  onEditDescription: (id: string, newDescription: string) => void;
  onOpenIndicatorModal: (node: OutlineSectionNode) => void;
  onOpenAttachmentModal: (node: OutlineSectionNode) => void;
  onQuickAppendFile: (sectionId: string, attachment: SectionAttachment) => void;
  onRemoveIndicator: (sectionId: string, indicatorId: string | number) => void;
  onRemoveAttachment: (sectionId: string, index: number) => void;
  onReorderSiblings: (activeId: string, overId: string) => void;
}> = ({
  node,
  depth,
  inheritedAttachmentCount,
  disabled,
  onAddChild,
  onDelete,
  onEditTitle,
  onEditDescription,
  onOpenIndicatorModal,
  onOpenAttachmentModal,
  onQuickAppendFile,
  onRemoveIndicator,
  onRemoveAttachment,
  onReorderSiblings,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: node.id, disabled });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const [titleFocus, setTitleFocus] = useState(false);
  const [descriptionFocus, setDescriptionFocus] = useState(false);
  const [titleValue, setTitleValue] = useState(node.title);
  const [descriptionValue, setDescriptionValue] = useState(
    node.description || '',
  );
  const [quickUploading, setQuickUploading] = useState(false);

  useEffect(() => {
    setTitleValue(node.title);
  }, [node.title]);

  useEffect(() => {
    setDescriptionValue(node.description || '');
  }, [node.description]);

  const itemStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  const indicators = node.indicators || [];
  const attachments = node.attachments || [];
  const templateBadge = getWritingTemplateShortLabel(node.writingTemplate);

  const handleChildDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorderSiblings(String(active.id), String(over.id));
    }
  };

  return (
    <li
      ref={setNodeRef}
      style={itemStyle}
      className={classNames(styles.treeNode, {
        [styles.wrapperBox]: depth === 0,
        [styles.nestedNode]: depth !== 0,
      })}
    >
      <div
        style={{
          display: 'flex',
          gap: 4,
          alignItems: 'flex-start',
          width: '100%',
          padding: '4px 0',
          borderRadius: 4,
        }}
      >
        <div
          className='handle'
          {...attributes}
          {...listeners}
          style={{
            width: 20,
            height: 20,
            cursor: disabled ? 'default' : 'grab',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 6,
            flexShrink: 0,
          }}
          title={I18N.esg.dragTheHandle}
        >
          <img
            src={handleSvg}
            alt={I18N.esg.drag}
            style={{ width: 20, height: 20 }}
          />
        </div>
        <div
          className={classNames(styles.nodeContent, {
            [styles.focus]: titleFocus || descriptionFocus,
          })}
        >
          <div className={styles.inputsWrapper}>
            <div className={styles.titleRow}>
              <span
                className={classNames(styles.levelBadge, {
                  [styles.levelBadgeSub]: depth > 0,
                })}
              >
                {depth === 0
                  ? I18N.esg.chapterLevelTag
                  : I18N.esg.subsectionLevelTag}
              </span>
              <Input
                value={titleValue}
                className={styles.titleInput}
                variant='borderless'
                disabled={disabled}
                onChange={e => setTitleValue(e.target.value)}
                onFocus={() => setTitleFocus(true)}
                onBlur={e => {
                  setTimeout(() => setTitleFocus(false), 32);
                  const nextTitle = e.target.value;
                  onEditTitle(node.id, nextTitle);
                  if (
                    !nextTitle.trim() &&
                    !descriptionValue.trim() &&
                    !node.children?.length
                  ) {
                    onDelete(node.id);
                  }
                }}
              />
            </div>
            {(!!descriptionValue.length || titleFocus || descriptionFocus) && (
              <div
                className={classNames({
                  [styles.descriptionWrapper]:
                    descriptionValue.length === 0 &&
                    (descriptionFocus || titleFocus),
                })}
              >
                <Input.TextArea
                  autoSize={{ minRows: 1, maxRows: 10 }}
                  className={styles.descriptionInput}
                  style={{
                    resize: 'none',
                    fontSize: '12px',
                    lineHeight: '14px',
                    boxSizing: 'border-box',
                  }}
                  disabled={disabled}
                  placeholder={I18N.esg.describeWithinThisParagraph}
                  value={descriptionValue}
                  onChange={e => setDescriptionValue(e.target.value)}
                  onFocus={() => setDescriptionFocus(true)}
                  onBlur={e => {
                    setTimeout(() => setDescriptionFocus(false), 32);
                    const nextDesc = e.target.value;
                    onEditDescription(node.id, nextDesc);
                    if (
                      !nextDesc.trim() &&
                      !titleValue.trim() &&
                      !node.children?.length
                    ) {
                      onDelete(node.id);
                    }
                  }}
                  variant='borderless'
                />
              </div>
            )}
            <div className={styles.bindingBar}>
              {templateBadge && (
                <Tag className={styles.bindingTag} color='purple'>
                  <span>{templateBadge}</span>
                </Tag>
              )}
              {attachments.length === 0 && inheritedAttachmentCount > 0 && (
                <Tag className={styles.bindingTag} color='default'>
                  <span>
                    {I18N.template(I18N.esg.inheritedEvidenceCount, {
                      val1: inheritedAttachmentCount,
                    })}
                  </span>
                </Tag>
              )}
              {indicators.map(ind => (
                <Tag
                  key={String(ind.indicatorId)}
                  className={styles.bindingTag}
                  color='cyan'
                  closable={!disabled}
                  onClose={e => {
                    e.preventDefault();
                    onRemoveIndicator(node.id, ind.indicatorId);
                  }}
                >
                  <Tooltip title={formatIndicatorTag(ind)}>
                    <span>{formatIndicatorTag(ind)}</span>
                  </Tooltip>
                </Tag>
              ))}
              {attachments.map((att, idx) => (
                <Tag
                  key={`${att.type}-${att.id || att.url || att.name}`}
                  className={styles.bindingTag}
                  color='geekblue'
                  closable={!disabled}
                  onClose={e => {
                    e.preventDefault();
                    onRemoveAttachment(node.id, idx);
                  }}
                >
                  <Tooltip title={att.name}>
                    <span>{att.name}</span>
                  </Tooltip>
                </Tag>
              ))}
              {!disabled && (
                <>
                  <button
                    type='button'
                    className={styles.bindingBtn}
                    onClick={() => onOpenIndicatorModal(node)}
                  >
                    <BarChartOutlined />
                    <span>{I18N.esg.bindIndicators}</span>
                  </button>
                  <Upload
                    name='file'
                    multiple
                    showUploadList={false}
                    accept={QUICK_UPLOAD_ACCEPT}
                    action={`${
                      process.env.REACT_APP_API_URL || ''
                    }/file/file/uploadImg`}
                    beforeUpload={uploadFile => {
                      if (uploadFile.size > 50 * 1024 * 1024) {
                        Toast(
                          'error',
                          I18N.enterpriseCarbonAccount2.fileMaximumNot2,
                        );
                        return Upload.LIST_IGNORE;
                      }
                      return true;
                    }}
                    onChange={({ file }) => {
                      if (file.status === 'uploading') {
                        setQuickUploading(true);
                        return;
                      }
                      setQuickUploading(false);
                      if (file.status === 'done') {
                        const fileUrl = (file.response as { data?: string })
                          ?.data;
                        const fileName =
                          file.originFileObj?.name || file.name || '';
                        if (fileUrl && fileName) {
                          onQuickAppendFile(node.id, {
                            id: uuid(),
                            type: 'file',
                            name: fileName,
                            url: fileUrl,
                            fileSize: `${((file.size || 0) / 1024).toFixed(
                              2,
                            )} KB`,
                            category: inferMaterialCategoryFromName(fileName),
                          });
                        } else {
                          Toast('error', I18N.components.uploadFailedPlease);
                        }
                      } else if (file.status === 'error') {
                        Toast('error', I18N.components.uploadFailedPlease);
                      }
                    }}
                  >
                    <button
                      type='button'
                      className={styles.bindingBtn}
                      disabled={quickUploading}
                    >
                      <UploadOutlined />
                      <span>{I18N.esg.quickUploadFile}</span>
                    </button>
                  </Upload>
                  <button
                    type='button'
                    className={styles.bindingBtn}
                    onClick={() => onOpenAttachmentModal(node)}
                  >
                    <PaperClipOutlined />
                    <span>{I18N.esg.sectionAttachments}</span>
                  </button>
                </>
              )}
            </div>
            {node.sectionPrompt && (
              <div className={styles.sectionPromptHint}>
                {`${I18N.esg.sectionPrompt}: ${node.sectionPrompt}`}
              </div>
            )}
          </div>
          <div className={styles.actions}>
            <span className={styles.action} onClick={() => onDelete(node.id)}>
              <DeleteOutlined />
            </span>
            <span className={styles.action} onClick={() => onAddChild(node.id)}>
              <PlusOutlined />
            </span>
          </div>
        </div>
      </div>
      {!!node.children?.length && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleChildDragEnd}
        >
          <SortableContext
            items={node.children.map(child => child.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul
              style={{
                paddingLeft: 20,
                width: '100%',
                minHeight: 10,
                margin: 0,
              }}
            >
              {node.children.map(child => (
                <TreeNodeItem
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  inheritedAttachmentCount={
                    inheritedAttachmentCount + attachments.length
                  }
                  disabled={disabled}
                  onAddChild={onAddChild}
                  onEditTitle={onEditTitle}
                  onEditDescription={onEditDescription}
                  onDelete={onDelete}
                  onOpenIndicatorModal={onOpenIndicatorModal}
                  onOpenAttachmentModal={onOpenAttachmentModal}
                  onQuickAppendFile={onQuickAppendFile}
                  onRemoveIndicator={onRemoveIndicator}
                  onRemoveAttachment={onRemoveAttachment}
                  onReorderSiblings={onReorderSiblings}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </li>
  );
};

const NestedTree: FC<{
  outline: string;
  id: number;
  loading: boolean;
  disabled: boolean;
  reportInfo?: ReportDetailsType;
  initialSections?: OutlineSectionNode[];
  promptConfig: ReportPromptConfig;
  onSectionsChange?: (sections: OutlineSectionNode[]) => void;
  stopAutoScroll?: () => void;
}> = props => {
  const {
    outline,
    id,
    loading,
    disabled,
    reportInfo,
    initialSections,
    promptConfig,
    onSectionsChange,
    stopAutoScroll,
  } = props;

  const [treeData, setTreeData] = useState<OutlineSectionNode[]>([]);
  const [reportName, setReportName] = useState('');
  const [indicatorModalSectionId, setIndicatorModalSectionId] = useState<
    string | null
  >(null);
  const [attachmentModalSectionId, setAttachmentModalSectionId] = useState<
    string | null
  >(null);

  const treeRef = useRef<OutlineSectionNode[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const hydratedInitialRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  useEffect(() => {
    treeRef.current = treeData;
    onSectionsChange?.(treeData);
  }, [treeData, onSectionsChange]);

  useEffect(() => {
    if (initialSections?.length && !loading && !hydratedInitialRef.current) {
      hydratedInitialRef.current = true;
      setTreeData(initialSections);
      if (reportInfo?.reportName && !reportName) {
        setReportName(reportInfo.reportName);
      }
    }
  }, [initialSections, loading, reportInfo?.reportName, reportName]);

  useEffect(() => {
    if (!outline) {
      if (loading) {
        hydratedInitialRef.current = false;
        setTreeData([]);
      }
      return;
    }
    const baseExisting =
      !loading && treeRef.current.length
        ? treeRef.current
        : initialSections || [];
    const parsedTree = parseMarkdownToTree(outline, baseExisting);
    const nextChildren = parsedTree[0]?.children || [];
    setTreeData(nextChildren);
    if (parsedTree[0]?.title) {
      setReportName(parsedTree[0].title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outline, loading]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    },
    [],
  );

  const persistOutline = (
    nextTree: OutlineSectionNode[],
    nextReportName: string = reportName,
  ) => {
    if (!id || loading) {
      return;
    }
    saveStoredOutlineSections(id, nextTree);
    const nextOutlineMd = convertTreeToMarkdown([
      {
        id: 'root',
        title: nextReportName || reportInfo?.reportName || '',
        attachments: [],
        indicators: [],
        children: nextTree,
      },
    ]);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(async () => {
      if (isEsgMockModeEnabled() || isMockReportId(id)) {
        saveMockOutline({
          id,
          outline: nextOutlineMd,
          outlineSections: nextTree,
          promptConfig,
          fallbackInfo: reportInfo,
        });
        return;
      }
      try {
        await postEditOutline(
          {
            id,
            outline: nextOutlineMd,
            outlineSections: nextTree,
            promptConfig,
          },
          { silentResponseError: true },
        );
      } catch {
        saveMockOutline({
          id,
          outline: nextOutlineMd,
          outlineSections: nextTree,
          promptConfig,
          fallbackInfo: reportInfo,
        });
      }
    }, 400);
  };

  const commitTreeUpdate = (
    updater: (prev: OutlineSectionNode[]) => OutlineSectionNode[],
  ) => {
    setTreeData(prev => {
      const next = updater(prev);
      persistOutline(next);
      return next;
    });
  };

  const onAddRoot = () => {
    commitTreeUpdate(prev => [
      ...prev,
      {
        id: uuid(),
        title: I18N.esg.newNode,
        description: '',
        attachments: [],
        indicators: [],
        children: [],
      },
    ]);
  };

  const onAddChild = (parentId: string) => {
    commitTreeUpdate(prev =>
      updateTreeNodes(prev, node => {
        if (node.id !== parentId) {
          return node;
        }
        return {
          ...node,
          children: [
            ...(node.children || []),
            {
              id: uuid(),
              title: I18N.esg.newNode,
              description: '',
              attachments: [],
              indicators: [],
              children: [],
            },
          ],
        };
      }),
    );
  };

  const onDelete = (targetId: string) => {
    commitTreeUpdate(prev =>
      updateTreeNodes(prev, node => (node.id === targetId ? null : node)),
    );
  };

  const onEditTitle = (targetId: string, newTitle: string) => {
    commitTreeUpdate(prev =>
      updateTreeNodes(prev, node =>
        node.id === targetId ? { ...node, title: newTitle } : node,
      ),
    );
  };

  const onEditDescription = (targetId: string, newDescription: string) => {
    commitTreeUpdate(prev =>
      updateTreeNodes(prev, node =>
        node.id === targetId ? { ...node, description: newDescription } : node,
      ),
    );
  };

  const onReorderSiblings = (activeId: string, overId: string) => {
    commitTreeUpdate(prev => reorderSiblings(prev, activeId, overId).nextNodes);
  };

  const onUpdateSectionIndicators = (
    sectionId: string,
    indicators: SectionIndicatorRef[],
  ) => {
    commitTreeUpdate(prev =>
      updateTreeNodes(prev, node =>
        node.id === sectionId ? { ...node, indicators } : node,
      ),
    );
  };

  const onRemoveIndicator = (
    sectionId: string,
    indicatorId: string | number,
  ) => {
    commitTreeUpdate(prev =>
      updateTreeNodes(prev, node =>
        node.id === sectionId
          ? {
              ...node,
              indicators: (node.indicators || []).filter(
                item => String(item.indicatorId) !== String(indicatorId),
              ),
            }
          : node,
      ),
    );
  };

  const onUpdateSectionAttachments = (
    sectionId: string,
    payload: {
      attachments: SectionAttachment[];
      sectionPrompt: string;
      writingTemplate: SectionWritingTemplate;
    },
  ) => {
    commitTreeUpdate(prev =>
      updateTreeNodes(prev, node =>
        node.id === sectionId
          ? {
              ...node,
              attachments: payload.attachments,
              sectionPrompt: payload.sectionPrompt,
              writingTemplate: payload.writingTemplate,
            }
          : node,
      ),
    );
    const fileRefs = payload.attachments
      .filter(att => att.type === 'file' && att.url)
      .map(att => ({ name: att.name, url: att.url! }));
    if (fileRefs.length > 0) {
      if (!isEsgMockModeEnabled() && !isMockReportId(id)) {
        postEsgAnalyzeFilesExtractImages(
          {
            reportId: id,
            sectionId,
            referFiles: fileRefs,
          },
          { silentResponseError: true },
        ).catch(() => {
          // keep UI responsive even if background image extraction fails
        });
      }
    }
  };

  const onQuickAppendFile = (
    sectionId: string,
    attachment: SectionAttachment,
  ) => {
    commitTreeUpdate(prev =>
      updateTreeNodes(prev, node => {
        if (node.id !== sectionId) {
          return node;
        }
        const existing = node.attachments || [];
        if (
          existing.some(
            item => item.type === 'file' && item.url === attachment.url,
          )
        ) {
          return node;
        }
        return {
          ...node,
          attachments: [...existing, attachment],
        };
      }),
    );
    if (attachment.url && !isEsgMockModeEnabled() && !isMockReportId(id)) {
      postEsgAnalyzeFilesExtractImages(
        {
          reportId: id,
          sectionId,
          referFiles: [{ name: attachment.name, url: attachment.url }],
        },
        { silentResponseError: true },
      ).catch(() => {});
    }
  };

  const onRemoveAttachment = (sectionId: string, targetIndex: number) => {
    commitTreeUpdate(prev =>
      updateTreeNodes(prev, node =>
        node.id === sectionId
          ? {
              ...node,
              attachments: (node.attachments || []).filter(
                (_, idx) => idx !== targetIndex,
              ),
            }
          : node,
      ),
    );
  };

  const indicatorModalSection = useMemo(
    () =>
      indicatorModalSectionId
        ? findNodeById(treeData, indicatorModalSectionId)
        : null,
    [treeData, indicatorModalSectionId],
  );

  const attachmentModalContext = useMemo(
    () =>
      attachmentModalSectionId
        ? findNodeContextById(treeData, attachmentModalSectionId)
        : null,
    [treeData, attachmentModalSectionId],
  );
  const attachmentModalSection = attachmentModalContext?.node || null;

  return (
    <div
      className={classNames(styles.wrapper, {
        [styles.loading]: loading || disabled,
      })}
    >
      <div className={styles.tip}>{I18N.esg.wellDoItForYouFirst}</div>
      <Spin spinning={loading}>
        <div className={styles.titleWrapper}>
          <div className={styles.label}>{I18N.esg.title}</div>
          <Input
            variant='borderless'
            value={reportName}
            disabled={disabled}
            onChange={e => setReportName(e.target.value)}
            onBlur={() => persistOutline(treeData, reportName)}
            style={{
              fontSize: 16,
              color: '#04252B',
            }}
          />
        </div>
      </Spin>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={event => {
          const { active, over } = event;
          if (over && active.id !== over.id) {
            onReorderSiblings(String(active.id), String(over.id));
          }
        }}
      >
        <SortableContext
          items={treeData.map(node => node.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul
            className={styles.tree}
            onScroll={e => {
              const target = e.target as HTMLElement;
              if (preScrollTop && target.scrollTop < preScrollTop) {
                stopAutoScroll?.();
              }
              preScrollTop = target.scrollTop;
            }}
          >
            {treeData.map(node => (
              <TreeNodeItem
                key={node.id}
                node={node}
                depth={0}
                inheritedAttachmentCount={0}
                disabled={disabled}
                onAddChild={onAddChild}
                onEditTitle={onEditTitle}
                onEditDescription={onEditDescription}
                onDelete={onDelete}
                onOpenIndicatorModal={target =>
                  setIndicatorModalSectionId(target.id)
                }
                onOpenAttachmentModal={target =>
                  setAttachmentModalSectionId(target.id)
                }
                onQuickAppendFile={onQuickAppendFile}
                onRemoveIndicator={onRemoveIndicator}
                onRemoveAttachment={onRemoveAttachment}
                onReorderSiblings={onReorderSiblings}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {!loading && !disabled && (
        <div className={styles.addChapter} onClick={onAddRoot}>
          <PlusCircleOutlined />
          {I18N.esg.addChapter}
        </div>
      )}
      <SectionIndicatorModal
        open={!!indicatorModalSection}
        sectionTitle={indicatorModalSection?.title || ''}
        frameId={reportInfo?.frameId}
        indicatorType={reportInfo?.indicatorType}
        value={indicatorModalSection?.indicators || []}
        onCancel={() => setIndicatorModalSectionId(null)}
        onConfirm={indicators => {
          if (indicatorModalSection) {
            onUpdateSectionIndicators(indicatorModalSection.id, indicators);
          }
        }}
      />
      <SectionAttachmentModal
        open={!!attachmentModalSection}
        sectionTitle={attachmentModalSection?.title || ''}
        sectionPath={attachmentModalContext?.path}
        sectionDepth={attachmentModalContext?.depth || 0}
        value={attachmentModalSection?.attachments || []}
        inheritedAttachments={
          attachmentModalContext?.inheritedAttachments || []
        }
        sectionPrompt={attachmentModalSection?.sectionPrompt}
        writingTemplate={attachmentModalSection?.writingTemplate}
        globalReferFiles={reportInfo?.referFiles}
        globalReferLinks={reportInfo?.referLink}
        globalReferTexts={reportInfo?.referText}
        onCancel={() => setAttachmentModalSectionId(null)}
        onConfirm={payload => {
          if (attachmentModalSection) {
            onUpdateSectionAttachments(attachmentModalSection.id, payload);
          }
        }}
      />
    </div>
  );
};

export default NestedTree;
