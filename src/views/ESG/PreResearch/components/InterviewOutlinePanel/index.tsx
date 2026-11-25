import {
  CopyOutlined,
  DeleteOutlined,
  FileWordOutlined,
  PlusOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { Button, Input, Select, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { FC, useMemo, useState } from 'react';

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

  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [stageFilter, setStageFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const filteredQuestions = useMemo(
    () =>
      project.interviewQuestions.filter(q => {
        if (deptFilter !== 'ALL' && q.target_dept !== deptFilter) return false;
        if (stageFilter !== 'ALL' && q.stage_group !== stageFilter)
          return false;
        if (priorityFilter !== 'ALL' && q.priority_level !== priorityFilter)
          return false;
        return true;
      }),
    [project.interviewQuestions, deptFilter, stageFilter, priorityFilter],
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
    const targetDept = deptFilter !== 'ALL' ? deptFilter : deptNames[0];
    if (!targetDept) return;
    const deptCode =
      project.departments
        .find(d => d.deptName === targetDept)
        ?.deptCode?.toUpperCase() || 'DEPT';
    const nextNum = String(filteredQuestions.length + 1).padStart(2, '0');
    const nextItem: InterviewQuestionItem = {
      question_id: `Q-${deptCode}-${nextNum}-${Date.now()
        .toString()
        .slice(-3)}`,
      target_dept: targetDept,
      stage_group: 'actions_gap_closure',
      esg_topic: I18N.esg.preResearchDefaultQuestionTopic,
      priority_level: 'P1',
      question_origin: I18N.esg.preResearchDefaultQuestionOrigin,
      main_question: I18N.esg.preResearchDefaultQuestionMain,
      follow_up_prompts: [I18N.esg.preResearchDefaultQuestionFollowUp],
      expected_materials: [I18N.esg.preResearchDefaultQuestionMaterial],
    };
    onChange([...project.interviewQuestions, nextItem]);
  };

  const columns: ColumnsType<InterviewQuestionItem> = [
    {
      title: I18N.esg.preResearchDeptCol,
      dataIndex: 'target_dept',
      width: 150,
      fixed: 'left',
      render: (_, record) => (
        <div className={styles.deptCell}>
          <span className={styles.deptName}>{record.target_dept}</span>
          <span className={styles.qCode}>{record.question_id}</span>
        </div>
      ),
    },
    {
      title: I18N.esg.preResearchStageCol,
      dataIndex: 'stage_group',
      width: 160,
      render: (_, record) => (
        <Select<InterviewStageGroup>
          size='small'
          style={{ width: '100%' }}
          value={record.stage_group}
          options={STAGE_ORDER.map(s => ({
            label: getStageTitle(s),
            value: s,
          }))}
          onChange={stage_group =>
            handleUpdateQuestion({ ...record, stage_group })
          }
        />
      ),
    },
    {
      title: I18N.esg.preResearchTopicPriorityCol,
      dataIndex: 'esg_topic',
      width: 170,
      render: (_, record) => (
        <div className={styles.topicCell}>
          <Tag color={PRIORITY_COLOR[record.priority_level]}>
            {record.esg_topic}
          </Tag>
          <Select<GapPriority>
            size='small'
            value={record.priority_level}
            style={{ width: 76 }}
            options={[
              { label: 'P0', value: 'P0' },
              { label: 'P1', value: 'P1' },
              { label: 'P2', value: 'P2' },
            ]}
            onChange={priority_level =>
              handleUpdateQuestion({ ...record, priority_level })
            }
          />
        </div>
      ),
    },
    {
      title: I18N.esg.preResearchQuestionCol,
      dataIndex: 'main_question',
      width: 340,
      render: (_, record) => (
        <Input.TextArea
          size='small'
          autoSize={{ minRows: 2, maxRows: 4 }}
          value={record.main_question}
          onChange={e =>
            handleUpdateQuestion({ ...record, main_question: e.target.value })
          }
        />
      ),
    },
    {
      title: I18N.esg.preResearchFollowUpCol,
      dataIndex: 'follow_up_prompts',
      width: 300,
      render: (_, record) => (
        <div className={styles.followCell}>
          <Input.TextArea
            size='small'
            autoSize={{ minRows: 2, maxRows: 4 }}
            value={record.follow_up_prompts.join('\n')}
            onChange={e =>
              handleUpdateQuestion({
                ...record,
                follow_up_prompts: e.target.value.split('\n').filter(Boolean),
              })
            }
          />
          <div className={styles.materialTags}>
            {record.expected_materials.map(mat => (
              <Tag key={mat} color='cyan'>
                {mat}
              </Tag>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: I18N.esg.preResearchActionCol,
      width: 88,
      fixed: 'right',
      render: (_, record) => (
        <div className={styles.cardActions}>
          <Button
            type='text'
            size='small'
            icon={<CopyOutlined />}
            onClick={() => {
              const textBlock = `${record.question_id} ${
                record.main_question
              }\n${record.follow_up_prompts.join('\n')}`;
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
            onClick={() => handleDeleteQuestion(record.question_id)}
          />
        </div>
      ),
    },
  ];

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <Select
            value={deptFilter}
            onChange={setDeptFilter}
            style={{ width: 170 }}
            options={[
              { label: I18N.esg.preResearchAllDepts, value: 'ALL' },
              ...deptNames.map(d => ({ label: d, value: d })),
            ]}
          />
          <Select
            value={stageFilter}
            onChange={setStageFilter}
            style={{ width: 180 }}
            options={[
              { label: I18N.esg.preResearchAllStages, value: 'ALL' },
              ...STAGE_ORDER.map(s => ({ label: getStageTitle(s), value: s })),
            ]}
          />
          <Select
            value={priorityFilter}
            onChange={setPriorityFilter}
            style={{ width: 120 }}
            options={[
              {
                label: `${I18N.esg.preResearchFilterPriority}: ${I18N.esg.preResearchFilterAll}`,
                value: 'ALL',
              },
              { label: 'P0', value: 'P0' },
              { label: 'P1', value: 'P1' },
              { label: 'P2', value: 'P2' },
            ]}
          />
        </div>
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
          {deptFilter !== 'ALL' && (
            <Button
              icon={<FileWordOutlined />}
              onClick={() => exportInterviewOutlineWord(project, deptFilter)}
            >
              {I18N.esg.preResearchExportDeptWord}
            </Button>
          )}
          <Button
            type='primary'
            icon={<FileWordOutlined />}
            onClick={() => exportInterviewOutlineWord(project)}
          >
            {I18N.esg.preResearchExportAllWord}
          </Button>
        </div>
      </div>

      <Table
        rowKey='question_id'
        columns={columns}
        dataSource={filteredQuestions}
        pagination={{ pageSize: 12, showSizeChanger: false }}
        scroll={{ x: 1150 }}
      />
    </div>
  );
};
