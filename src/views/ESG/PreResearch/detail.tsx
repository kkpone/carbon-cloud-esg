import {
  ArrowLeftOutlined,
  RocketOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { Button, Card, Collapse, Empty, Spin, Tabs, Tag } from 'antd';
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
  const [activeTab, setActiveTab] = useState('gap');
  const [project, setProject] = useState<PreResearchProject | null>(() => {
    const local = id ? getLocalPreResearchById(id) : undefined;
    if (local) return local;
    return id === 'pr-sample-9001' ? createDefaultSampleProject() : null;
  });

  const loadProject = useCallback(async () => {
    setLoading(true);
    const local = id ? getLocalPreResearchById(id) : undefined;
    if (local) {
      setProject(local);
    } else if (id === 'pr-sample-9001') {
      setProject(createDefaultSampleProject());
    } else {
      setProject(null);
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
    if (!project) return;
    await persistProject(project);
    Toast('success', I18N.esg.preResearchSavedTip);
  };

  const handleGenerateGap = async () => {
    if (!project) return;
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
    if (!project) return;
    const selectedPeers = project.peers.filter(p => p.selected !== false);
    if (selectedPeers.length === 0) {
      Toast('warn', I18N.esg.preResearchSelectAtLeastOnePeer);
      return;
    }
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
    if (!project) return;
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
    if (!project) return;
    setGenerating(true);
    try {
      let gapItems = buildGeneratedGaps(project);
      let bm = buildGeneratedBenchmarks(project);
      let interviewQuestions = buildGeneratedInterviews({
        ...project,
        gapItems,
      });
      if (!isEsgMockModeEnabled()) {
        const [gapRes, bmRes, ivRes] = await Promise.all([
          generatePreResearchGapApi(project.id, {
            silentResponseError: true,
          }).catch(() => null),
          generatePreResearchBenchmarkApi(project.id, {
            silentResponseError: true,
          }).catch(() => null),
          generatePreResearchInterviewApi(project.id, {
            silentResponseError: true,
          }).catch(() => null),
        ]);
        if (gapRes?.data?.data?.length) {
          gapItems = gapRes.data.data;
        }
        if (bmRes?.data?.data?.benchmarkRows?.length) {
          bm = bmRes.data.data;
        }
        if (ivRes?.data?.data?.length) {
          interviewQuestions = ivRes.data.data;
        }
      }
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
    if (!project) return;
    const p0Gaps = project.gapItems
      .filter(g => g.priority === 'P0' || g.selectedForInterview)
      .map(g => `${g.gap_id} ${g.topic_name}: ${g.action_suggestion}`);
    const adoptedCases = project.highlightCases
      .filter(c => c.adoptedForReport)
      .map(c =>
        I18N.template(I18N.esg.preResearchHandoffCaseItem, {
          val1: c.title,
          val2: c.peerName,
        }),
      );
    const expectedMaterials = Array.from(
      new Set(project.interviewQuestions.flatMap(q => q.expected_materials)),
    ).slice(0, 12);
    const summaryNote = [
      I18N.template(I18N.esg.preResearchHandoffTitle, {
        val1: project.companyName,
        val2: project.period,
      }),
      I18N.template(I18N.esg.preResearchHandoffGaps, {
        val1: p0Gaps.length,
      }),
      ...p0Gaps.slice(0, 8),
      I18N.template(I18N.esg.preResearchHandoffCases, {
        val1: adoptedCases.join('; ') || '-',
      }),
      I18N.template(I18N.esg.preResearchHandoffMaterials, {
        val1: expectedMaterials.join(', '),
      }),
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

  if (!loading && !project) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.body}>
          <Empty description={I18N.esg.preResearchNotFound}>
            <Button
              type='primary'
              onClick={() =>
                history.push(
                  resolveEsgRoute(RouteMaps.ESGPreResearch, location.pathname),
                )
              }
            >
              {I18N.esg.preResearchBackToList}
            </Button>
          </Empty>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.wrapper}>
        <Spin spinning />
      </div>
    );
  }

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
                key: 'gap',
                label: `${I18N.esg.preResearchModuleGapShort} (${project.gapItems.length})`,
                children: (
                  <div className={styles.moduleStack}>
                    <Collapse
                      size='small'
                      defaultActiveKey={
                        project.gapItems.length === 0 ? ['inputs'] : []
                      }
                      items={[
                        {
                          key: 'inputs',
                          label: I18N.template(
                            I18N.esg.preResearchInputCollapseLabel,
                            {
                              val1: `${I18N.template(
                                I18N.esg.preResearchSelfFileCount,
                                { val1: project.selfMaterials.length },
                              )} · ${project.standards.length} ${
                                I18N.esg.referenceStandards
                              }`,
                            },
                          ),
                          children: (
                            <InputMaterialsPanel
                              project={project}
                              onChange={next => persistProject(next)}
                              generating={generating}
                              sections={['self', 'reg']}
                            />
                          ),
                        },
                      ]}
                    />
                    <GapDiagnosisPanel
                      project={project}
                      onChange={gapItems =>
                        persistProject({ ...project, gapItems })
                      }
                      onRegenerate={handleGenerateGap}
                      generating={generating}
                    />
                  </div>
                ),
              },
              {
                key: 'benchmark',
                label: `${I18N.esg.preResearchModuleBenchmarkShort} (${project.benchmarkRows.length})`,
                children: (
                  <div className={styles.moduleStack}>
                    <Card
                      size='small'
                      title={I18N.esg.preResearchSelectPeersTitle}
                      extra={
                        <Button
                          type='primary'
                          size='small'
                          icon={<RocketOutlined />}
                          loading={generating}
                          onClick={handleGenerateBenchmark}
                        >
                          {I18N.esg.preResearchAiAnalyzeBtn}
                        </Button>
                      }
                    >
                      <InputMaterialsPanel
                        project={project}
                        onChange={next => persistProject(next)}
                        generating={generating}
                        sections={['peer']}
                      />
                    </Card>
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
                  </div>
                ),
              },
              {
                key: 'interview',
                label: `${I18N.esg.preResearchModuleInterviewShort} (${project.interviewQuestions.length})`,
                children: (
                  <div className={styles.moduleStack}>
                    <Collapse
                      size='small'
                      defaultActiveKey={
                        project.interviewQuestions.length === 0
                          ? ['inputs']
                          : []
                      }
                      items={[
                        {
                          key: 'inputs',
                          label: I18N.template(
                            I18N.esg.preResearchInputCollapseLabel,
                            {
                              val1: `${I18N.template(
                                I18N.esg.preResearchDeptCountLabel,
                                { val1: project.departments.length },
                              )}`,
                            },
                          ),
                          children: (
                            <InputMaterialsPanel
                              project={project}
                              onChange={next => persistProject(next)}
                              generating={generating}
                              sections={['dept', 'clues']}
                            />
                          ),
                        },
                      ]}
                    />
                    <InterviewOutlinePanel
                      project={project}
                      onChange={interviewQuestions =>
                        persistProject({ ...project, interviewQuestions })
                      }
                      onRegenerate={handleGenerateInterview}
                      generating={generating}
                    />
                  </div>
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
