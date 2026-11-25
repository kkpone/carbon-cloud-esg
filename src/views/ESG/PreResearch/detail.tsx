import {
  ArrowLeftOutlined,
  RocketOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { Button, Spin, Tabs, Tag } from 'antd';
import { FC, useCallback, useEffect, useState } from 'react';
import { useHistory, useLocation, useParams } from 'react-router-dom';

import { RouteMaps } from '@/router/route-paths';
import { Toast } from '@/utils';

import { GapDiagnosisPanel } from './components/GapDiagnosisPanel';
import { InputMaterialsPanel } from './components/InputMaterialsPanel';
import { InterviewOutlinePanel } from './components/InterviewOutlinePanel';
import { PeerBenchmarkPanel } from './components/PeerBenchmarkPanel';
import styles from './detail.module.less';
import {
  buildGeneratedBenchmarks,
  buildGeneratedGaps,
  buildGeneratedInterviews,
  createDefaultSampleProject,
  getLocalPreResearchById,
  saveLocalPreResearchProject,
} from './mockService';
import {
  generatePreResearchBenchmarkApi,
  generatePreResearchGapApi,
  generatePreResearchInterviewApi,
  getPreResearchDetail,
  savePreResearchProject,
} from './service';
import { PreResearchProject } from './types';
import { isEsgMockModeEnabled } from '../mockReportService';
import { resolveEsgRoute } from '../routeUtils';

export const PRE_RESEARCH_HANDOFF_KEY = 'esg_pre_research_handoff_v1';

export const PreResearchDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const history = useHistory();
  const location = useLocation();

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState('materials');
  const [project, setProject] = useState<PreResearchProject>(() =>
    createDefaultSampleProject(),
  );

  const loadProject = useCallback(async () => {
    setLoading(true);
    const local = getLocalPreResearchById(id);
    if (local) {
      setProject(local);
    }
    if (!isEsgMockModeEnabled() && id) {
      try {
        const res = await getPreResearchDetail(id, {
          silentResponseError: true,
        });
        if (res?.data?.data) {
          setProject(res.data.data);
        }
      } catch {
        // fallback to local storage project
      }
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  const persistProject = useCallback(async (next: PreResearchProject) => {
    const saved = saveLocalPreResearchProject(next);
    setProject(saved);
    if (!isEsgMockModeEnabled()) {
      await savePreResearchProject(saved, { silentResponseError: true }).catch(
        () => {},
      );
    }
    return saved;
  }, []);

  const handleSaveManual = async () => {
    await persistProject(project);
    Toast('success', I18N.esg.preResearchSavedTip);
  };

  const handleGenerateGap = async () => {
    setGenerating(true);
    try {
      let nextGaps = buildGeneratedGaps(project);
      if (!isEsgMockModeEnabled()) {
        const res = await generatePreResearchGapApi(project.id, {
          silentResponseError: true,
        }).catch(() => null);
        if (res?.data?.data?.length) {
          nextGaps = res.data.data;
        }
      }
      await persistProject({
        ...project,
        status: 'in_progress',
        gapItems: nextGaps,
      });
      Toast('success', I18N.esg.preResearchGeneratedTip);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateBenchmark = async () => {
    setGenerating(true);
    try {
      let bm = buildGeneratedBenchmarks(project);
      if (!isEsgMockModeEnabled()) {
        const res = await generatePreResearchBenchmarkApi(project.id, {
          silentResponseError: true,
        }).catch(() => null);
        if (res?.data?.data?.benchmarkRows?.length) {
          bm = res.data.data;
        }
      }
      await persistProject({
        ...project,
        status: 'in_progress',
        benchmarkRows: bm.benchmarkRows,
        highlightCases: bm.highlightCases,
      });
      Toast('success', I18N.esg.preResearchGeneratedTip);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateInterview = async () => {
    setGenerating(true);
    try {
      let nextQuestions = buildGeneratedInterviews(project);
      if (!isEsgMockModeEnabled()) {
        const res = await generatePreResearchInterviewApi(project.id, {
          silentResponseError: true,
        }).catch(() => null);
        if (res?.data?.data?.length) {
          nextQuestions = res.data.data;
        }
      }
      await persistProject({
        ...project,
        status: 'completed',
        interviewQuestions: nextQuestions,
      });
      Toast('success', I18N.esg.preResearchGeneratedTip);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    setGenerating(true);
    try {
      const gapItems = buildGeneratedGaps(project);
      const bm = buildGeneratedBenchmarks(project);
      const interviewQuestions = buildGeneratedInterviews({
        ...project,
        gapItems,
      });
      await persistProject({
        ...project,
        status: 'completed',
        gapItems,
        benchmarkRows: bm.benchmarkRows,
        highlightCases: bm.highlightCases,
        interviewQuestions,
      });
      Toast('success', I18N.esg.preResearchGeneratedTip);
      setActiveTab('gap');
    } finally {
      setGenerating(false);
    }
  };

  const handleSendToReport = () => {
    const p0Gaps = project.gapItems
      .filter(g => g.priority === 'P0' || g.selectedForInterview)
      .map(g => `${g.gap_id} ${g.topic_name}：${g.action_suggestion}`);
    const adoptedCases = project.highlightCases
      .filter(c => c.adoptedForReport)
      .map(c => `专题借鉴《${c.title}》（参考${c.peerName}）`);
    const expectedMaterials = Array.from(
      new Set(project.interviewQuestions.flatMap(q => q.expected_materials)),
    ).slice(0, 12);
    const summaryNote = [
      `【阶段一调研结论带入】${project.companyName} ${project.period}年度`,
      `1. 核心差距补齐重点（${p0Gaps.length}项）：`,
      ...p0Gaps.slice(0, 8),
      `2. 拟借鉴同业专题：${adoptedCases.join('；') || '无'}`,
      `3. 待收集关键底稿清单：${expectedMaterials.join('、')}`,
    ].join('\n');
    try {
      window.sessionStorage.setItem(
        PRE_RESEARCH_HANDOFF_KEY,
        JSON.stringify({
          companyName: project.companyName,
          period: project.period,
          userContent: summaryNote,
        }),
      );
    } catch {
      // ignore storage error
    }
    history.push(
      resolveEsgRoute(RouteMaps.ESGAiGenerateHome, location.pathname),
    );
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button
            type='text'
            icon={<ArrowLeftOutlined />}
            onClick={() =>
              history.push(
                resolveEsgRoute(RouteMaps.ESGPreResearch, location.pathname),
              )
            }
          />
          <div>
            <div className={styles.projectTitle}>
              <span>{project.projectName}</span>
              <Tag color='cyan'>{project.period}</Tag>
              <Tag color='geekblue'>{project.listingType}</Tag>
            </div>
            <div className={styles.projectMeta}>
              {`${project.companyName} · ${
                project.industry
              } · ${project.standards.join(' / ')}`}
            </div>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button icon={<SaveOutlined />} onClick={handleSaveManual}>
            {I18N.carbonFootprint.save}
          </Button>
          <Button
            icon={<RocketOutlined />}
            loading={generating}
            onClick={handleGenerateAll}
          >
            {I18N.esg.preResearchGenerateAll}
          </Button>
          <Button
            type='primary'
            icon={<SendOutlined />}
            onClick={handleSendToReport}
          >
            {I18N.esg.preResearchSyncToReport}
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        <div className={styles.body}>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={[
              {
                key: 'materials',
                label: I18N.esg.preResearchTabMaterials,
                children: (
                  <InputMaterialsPanel
                    project={project}
                    onChange={setProject}
                    onGenerateAll={handleGenerateAll}
                    generating={generating}
                  />
                ),
              },
              {
                key: 'gap',
                label: `${I18N.esg.preResearchTabGap} (${project.gapItems.length})`,
                children: (
                  <GapDiagnosisPanel
                    project={project}
                    onChange={gapItems =>
                      persistProject({ ...project, gapItems })
                    }
                    onRegenerate={handleGenerateGap}
                    generating={generating}
                  />
                ),
              },
              {
                key: 'benchmark',
                label: `${I18N.esg.preResearchTabBenchmark} (${project.benchmarkRows.length})`,
                children: (
                  <PeerBenchmarkPanel
                    project={project}
                    onChangeRows={benchmarkRows =>
                      persistProject({ ...project, benchmarkRows })
                    }
                    onChangeCases={highlightCases =>
                      persistProject({ ...project, highlightCases })
                    }
                    onRegenerate={handleGenerateBenchmark}
                    generating={generating}
                  />
                ),
              },
              {
                key: 'interview',
                label: `${I18N.esg.preResearchTabInterview} (${project.interviewQuestions.length})`,
                children: (
                  <InterviewOutlinePanel
                    project={project}
                    onChange={interviewQuestions =>
                      persistProject({ ...project, interviewQuestions })
                    }
                    onRegenerate={handleGenerateInterview}
                    generating={generating}
                  />
                ),
              },
            ]}
          />
        </div>
      </Spin>
    </div>
  );
};

export default PreResearchDetail;
