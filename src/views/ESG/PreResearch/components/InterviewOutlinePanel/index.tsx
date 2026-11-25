import {
  CopyOutlined,
  DeleteOutlined,
  FileWordOutlined,
  HolderOutlined,
  PlusOutlined,
  SyncOutlined,
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
import { Button, Input, Select, Tag } from 'antd';
import classNames from 'classnames';
import { CSSProperties, FC, useEffect, useMemo, useState } from 'react';

import { Toast } from '@/utils';
import { copyToClipboard } from '@/utils/clipboard';

import styles from './index.module.less';
import { exportInterviewOutlineWord } from '../../exportUtils';
import {
  GapPriority,
  InterviewQuestionItem,
  InterviewStageGroup,
  PreResearchProject,
} from '../../types';

export interface IInterviewOutlinePanelProps {
  project: PreResearchProject;
  onChange: (questions: InterviewQuestionItem[]) => void;
  onRegenerate: () => void;
  generating: boolean;
}

const PRIORITY_COLOR: Record<GapPriority, string> = {
  P0: 'red',
  P1: 'orange',
  P2: 'default',
};

const STAGE_ORDER: InterviewStageGroup[] = [
  'governance_policy',
  'actions_gap_closure',
  'quantitative_scope',
  'cases_next_plan',
];

const getStageTitle = (stage: InterviewStageGroup): string => {
  if (stage === 'governance_policy') return I18N.esg.preResearchStageGov;
  if (stage === 'actions_gap_closure') return I18N.esg.preResearchStageAction;
  if (stage === 'quantitative_scope') return I18N.esg.preResearchStageQuant;
  return I18N.esg.preResearchStageCase;
};

const SortableQuestionCard: FC<{
  item: InterviewQuestionItem;
  onUpdate: (next: InterviewQuestionItem) => void;
  onDelete: (id: string) => void;
}> = ({ item, onUpdate, onDelete }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.question_id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.questionCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleLeft}>
          <span className={styles.dragHandle} {...attributes} {...listeners}>
            <HolderOutlined />
          </span>
          <span className={styles.qCode}>{item.question_id}</span>
          <Select<GapPriority>
            size='small'
            value={item.priority_level}
            style={{ width: 82 }}
            options={[
              { label: 'P0', value: 'P0' },
              { label: 'P1', value: 'P1' },
              { label: 'P2', value: 'P2' },
            ]}
            onChange={priority_level => onUpdate({ ...item, priority_level })}
          />
          <Tag color={PRIORITY_COLOR[item.priority_level]}>
            {item.esg_topic}
          </Tag>
        </div>
        <div className={styles.cardActions}>
          <Button
            type='text'
            size='small'
            icon={<CopyOutlined />}
            onClick={() => {
              const textBlock = `${item.question_id} ${
                item.main_question
              }\n${item.follow_up_prompts.join('\n')}`;
              copyToClipboard(textBlock)
                .then(() => Toast('success', I18N.esg.preResearchCopiedTip))
                .catch(() => {});
            }}
          />
          <Button
            type='text'
            danger
            size='small'
            icon={<DeleteOutlined />}
            onClick={() => onDelete(item.question_id)}
          />
        </div>
      </div>

      <div className={styles.originBox}>
        <span className={styles.metaLabel}>
          {`${I18N.esg.preResearchQuestionOrigin}：`}
        </span>
        <span>{item.question_origin}</span>
      </div>

      <Input.TextArea
        className={styles.mainInput}
        autoSize={{ minRows: 2, maxRows: 4 }}
        value={item.main_question}
        onChange={e => onUpdate({ ...item, main_question: e.target.value })}
      />

      <div className={styles.subGrid}>
        <div className={styles.subBlock}>
          <div className={styles.metaLabel}>{I18N.esg.preResearchFollowUp}</div>
          <Input.TextArea
            size='small'
            autoSize={{ minRows: 2, maxRows: 5 }}
            value={item.follow_up_prompts.join('\n')}
            onChange={e =>
              onUpdate({
                ...item,
                follow_up_prompts: e.target.value.split('\n').filter(Boolean),
              })
            }
          />
        </div>
        <div className={styles.subBlock}>
          <div className={styles.metaLabel}>
            {I18N.esg.preResearchExpectedMaterials}
          </div>
          <div className={styles.materialTags}>
            {item.expected_materials.map(mat => (
              <Tag key={mat} color='cyan'>
                {mat}
              </Tag>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const InterviewOutlinePanel: FC<IInterviewOutlinePanelProps> = ({
  project,
  onChange,
  onRegenerate,
  generating,
}) => {
  const deptNames = useMemo(() => {
    const fromDuty = project.departments.map(d => d.deptName);
    const fromQuestions = project.interviewQuestions.map(q => q.target_dept);
    return Array.from(new Set([...fromDuty, ...fromQuestions]));
  }, [project.departments, project.interviewQuestions]);

  const [activeDept, setActiveDept] = useState<string>(deptNames[0] || '');

  useEffect(() => {
    if (deptNames.length > 0 && !deptNames.includes(activeDept)) {
      setActiveDept(deptNames[0]);
    }
  }, [deptNames, activeDept]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const deptQuestions = useMemo(
    () => project.interviewQuestions.filter(q => q.target_dept === activeDept),
    [project.interviewQuestions, activeDept],
  );

  const handleUpdateQuestion = (next: InterviewQuestionItem) => {
    onChange(
      project.interviewQuestions.map(q =>
        q.question_id === next.question_id ? next : q,
      ),
    );
  };

  const handleDeleteQuestion = (questionId: string) => {
    onChange(
      project.interviewQuestions.filter(q => q.question_id !== questionId),
    );
  };

  const handleAddQuestion = () => {
    if (!activeDept) return;
    const deptCode =
      project.departments
        .find(d => d.deptName === activeDept)
        ?.deptCode?.toUpperCase() || 'DEPT';
    const nextNum = String(deptQuestions.length + 1).padStart(2, '0');
    const nextItem: InterviewQuestionItem = {
      question_id: `Q-${deptCode}-${nextNum}-${Date.now()
        .toString()
        .slice(-3)}`,
      target_dept: activeDept,
      stage_group: 'actions_gap_closure',
      esg_topic: '补充访谈议题',
      priority_level: 'P1',
      question_origin: '顾问手动补充访谈要点',
      main_question: '请补充本年度重点推进的管理举措与量化成果。',
      follow_up_prompts: ['具体覆盖范围及同比变化如何？'],
      expected_materials: ['对应台账或制度支撑文件'],
    };
    onChange([...project.interviewQuestions, nextItem]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = project.interviewQuestions.findIndex(
      q => q.question_id === String(active.id),
    );
    const newIdx = project.interviewQuestions.findIndex(
      q => q.question_id === String(over.id),
    );
    if (oldIdx !== -1 && newIdx !== -1) {
      onChange(arrayMove(project.interviewQuestions, oldIdx, newIdx));
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.deptSidebar}>
        <div className={styles.sidebarTitle}>
          {I18N.esg.preResearchDeptListTitle}
        </div>
        <div className={styles.deptList}>
          {deptNames.map(dept => {
            const list = project.interviewQuestions.filter(
              q => q.target_dept === dept,
            );
            const p0 = list.filter(q => q.priority_level === 'P0').length;
            const mins = Math.min(60, Math.max(35, list.length * 5));
            return (
              <button
                type='button'
                key={dept}
                className={classNames(styles.deptItem, {
                  [styles.deptItemActive]: dept === activeDept,
                })}
                onClick={() => setActiveDept(dept)}
              >
                <div className={styles.deptItemName}>{dept}</div>
                <div className={styles.deptItemMeta}>
                  <span>
                    {I18N.template(I18N.esg.preResearchQuestionCount, {
                      val1: list.length,
                      val2: p0,
                    })}
                  </span>
                  <span>
                    {I18N.template(I18N.esg.preResearchEstDuration, {
                      val1: mins,
                    })}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.mainContent}>
        <div className={styles.toolbar}>
          <div className={styles.activeDeptTitle}>{activeDept}</div>
          <div className={styles.actions}>
            <Button icon={<PlusOutlined />} onClick={handleAddQuestion}>
              {I18N.esg.preResearchAddQuestion}
            </Button>
            <Button
              icon={<SyncOutlined />}
              loading={generating}
              onClick={onRegenerate}
            >
              {I18N.esg.preResearchGenerateInterview}
            </Button>
            <Button
              icon={<FileWordOutlined />}
              onClick={() => exportInterviewOutlineWord(project, activeDept)}
            >
              {I18N.esg.preResearchExportDeptWord}
            </Button>
            <Button
              type='primary'
              icon={<FileWordOutlined />}
              onClick={() => exportInterviewOutlineWord(project)}
            >
              {I18N.esg.preResearchExportAllWord}
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={deptQuestions.map(q => q.question_id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={styles.stageSections}>
              {STAGE_ORDER.map(stage => {
                const stageList = deptQuestions.filter(
                  q => q.stage_group === stage,
                );
                if (stageList.length === 0) return null;
                return (
                  <div key={stage} className={styles.stageGroup}>
                    <div className={styles.stageHeader}>
                      {getStageTitle(stage)}
                    </div>
                    <div className={styles.cardStack}>
                      {stageList.map(item => (
                        <SortableQuestionCard
                          key={item.question_id}
                          item={item}
                          onUpdate={handleUpdateQuestion}
                          onDelete={handleDeleteQuestion}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
