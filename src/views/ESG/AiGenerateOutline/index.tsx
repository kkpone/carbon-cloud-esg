import { SlidersOutlined } from '@ant-design/icons';
import aiSvg from '@src/assets/icon/esg/aiW.svg';
import I18N, { getCurrentLocale } from '@src/lang/I18N';
import { useMount, useRequest, useThrottle, useUnmount } from 'ahooks';
import { Spin } from 'antd';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { streamFetch } from '@/api/streamFetch';
import { checkPermissions } from '@/components/Permission/utils';
import { IconAlibaba } from '@/components/iconfont';
import { RouteMaps } from '@/router/route-paths';
import { Toast } from '@/utils';

import { resolveEsgRoute } from '../routeUtils';
import {
  getMockReportInfo,
  isEsgMockModeEnabled,
  isMockReportId,
  isPermissionOrUnavailableError,
  saveMockOutline,
  streamMockOutline,
} from '../mockReportService';

import { PromptConfigModal } from './components/PromptConfigModal';
import NestedSortableList from './components/Sortable';
import { convertTreeToMarkdown } from './components/Sortable/convertTreeToMarkdown';
import styles from './index.module.less';
import {
  DEFAULT_REPORT_PROMPT_CONFIG,
  buildReportSystemPrompt,
  getStoredOutlineSections,
  getStoredPromptConfig,
  mergePromptConfig,
  saveStoredPromptConfig,
} from './promptUtils';
import {
  OutlineSectionNode,
  ReportDetailsType,
  ReportPromptConfig,
  getFileStatus,
  getReportInfo,
  postEditOutline,
  postEsgAnalyzeFilesExtractImages,
} from './service';

export interface IAiGenerateOutlineProps {}

let preScrollTop = 0;

export const AiGenerateOutline: FC<IAiGenerateOutlineProps> = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get('id');
  const [reportName, setReportName] = useState('');
  const [outline, setOutline] = useState('');
  const [reportInfo, setReportInfo] = useState<ReportDetailsType>();
  const [sections, setSections] = useState<OutlineSectionNode[]>([]);
  const [promptConfigOpen, setPromptConfigOpen] = useState(false);
  const [promptConfig, setPromptConfig] = useState<ReportPromptConfig>(() =>
    mergePromptConfig(undefined, getCurrentLocale()),
  );
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const enable = checkPermissions(true, 'esg:frameReport:edit');

  const throttledOutline = useThrottle(outline, { wait: 50 });

  const abortCtrl = useRef<AbortController>();
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const canScroll = useRef(false);

  const {
    data: fileStatus,
    run: fileStatusRun,
    cancel: fileStatusCancel,
  } = useRequest(() => getFileStatus({ reportId: Number(id) }), {
    pollingInterval: 1000,
    pollingWhenHidden: false,
    manual: true,
  });

  const createOutline = async () => {
    setOutline('');
    setLoading(true);
    canScroll.current = true;
    abortCtrl.current = new AbortController();
    const numericId = Number(id);
    const onStreamMessage = (e: string) => {
      setOutline(pre => pre + e);
      if (canScroll.current) {
        if (scrollTimerRef.current) {
          clearTimeout(scrollTimerRef.current);
        }
        scrollTimerRef.current = setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 32 * 4);
      }
    };
    try {
      if (isEsgMockModeEnabled() || isMockReportId(numericId)) {
        await streamMockOutline({
          reportId: numericId,
          onMessage: onStreamMessage,
          abortCtrl: abortCtrl.current,
        });
        return;
      }
      await streamFetch({
        url: `${process.env.REACT_APP_API_URL}/esg/frameReport/aiEsgOutlineCreate`,
        data: {
          reportId: numericId,
        },
        onMessage: onStreamMessage,
        abortCtrl: abortCtrl.current,
      });
    } catch (err: any) {
      if (isPermissionOrUnavailableError(err)) {
        Toast('info', I18N.esg.mockFallbackNotice);
        await streamMockOutline({
          reportId: numericId,
          onMessage: onStreamMessage,
          abortCtrl: abortCtrl.current,
        });
      } else {
        const errMsg =
          err?.message?.msg ||
          (typeof err?.message === 'string' ? err.message : '') ||
          I18N.utils.notHavePermission;
        Toast('warn', errMsg);
      }
    } finally {
      setLoading(false);
      if (!isEsgMockModeEnabled() && !isMockReportId(numericId)) {
        fileStatusRun();
      }
    }
  };

  useEffect(() => {
    if (fileStatus?.data.data.status === 1) {
      fileStatusCancel();
    }
  }, [fileStatus?.data.data.status, fileStatusCancel]);

  useUnmount(() => {
    abortCtrl.current?.abort();
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }
  });

  useMount(async () => {
    if (id) {
      const numericId = Number(id);
      const mockInfo = getMockReportInfo(numericId);
      let info: ReportDetailsType | undefined = mockInfo || undefined;
      if (!info) {
        const result = await getReportInfo({
          id: numericId,
        });
        info = result.data.data;
      }
      if (!info) {
        return;
      }
      setReportInfo(info);
      setReportName(info.reportName);
      const storedPrompt = getStoredPromptConfig(numericId);
      setPromptConfig(
        mergePromptConfig(
          info.promptConfig || storedPrompt || DEFAULT_REPORT_PROMPT_CONFIG,
          getCurrentLocale(),
        ),
      );
      if (info.outlineSections?.length) {
        setSections(info.outlineSections);
      } else {
        const storedSections = getStoredOutlineSections(numericId);
        if (storedSections?.length) {
          setSections(storedSections);
        }
      }
      if (!info.outline || info.outline.length === 0) {
        createOutline();
        if (!isEsgMockModeEnabled() && !isMockReportId(numericId)) {
          postEsgAnalyzeFilesExtractImages(
            { reportId: numericId },
            { silentResponseError: true },
          ).catch(() => {});
        }
      } else {
        setOutline(info.outline);
      }
    }
  });

  const history = useHistory();

  const handleSectionsChange = useCallback(
    (nextSections: OutlineSectionNode[]) => {
      setSections(nextSections);
    },
    [],
  );

  const handlePromptConfirm = async (nextConfig: ReportPromptConfig) => {
    const enrichedConfig: ReportPromptConfig = {
      ...nextConfig,
      systemPrompt: buildReportSystemPrompt({
        reportInfo,
        sections,
        config: nextConfig,
      }),
    };
    setPromptConfig(enrichedConfig);
    if (!id) {
      return;
    }
    const numericId = Number(id);
    saveStoredPromptConfig(numericId, enrichedConfig);
    const nextOutlineMd =
      convertTreeToMarkdown([
        {
          id: 'root',
          title: reportName || reportInfo?.reportName || '',
          attachments: [],
          indicators: [],
          children: sections,
        },
      ]) || outline;
    if (isEsgMockModeEnabled() || isMockReportId(numericId)) {
      saveMockOutline({
        id: numericId,
        outline: nextOutlineMd,
        outlineSections: sections,
        promptConfig: enrichedConfig,
        fallbackInfo: reportInfo,
      });
      return;
    }
    try {
      await postEditOutline(
        {
          id: numericId,
          outline: nextOutlineMd,
          outlineSections: sections,
          promptConfig: enrichedConfig,
        },
        { silentResponseError: true },
      );
    } catch {
      saveMockOutline({
        id: numericId,
        outline: nextOutlineMd,
        outlineSections: sections,
        promptConfig: enrichedConfig,
        fallbackInfo: reportInfo,
      });
    }
  };

  const generate = async () => {
    if (id) {
      const numericId = Number(id);
      const finalPromptConfig: ReportPromptConfig = {
        ...promptConfig,
        systemPrompt: buildReportSystemPrompt({
          reportInfo,
          sections,
          config: promptConfig,
        }),
      };
      setPromptConfig(finalPromptConfig);
      saveStoredPromptConfig(numericId, finalPromptConfig);
      const nextOutlineMd =
        convertTreeToMarkdown([
          {
            id: 'root',
            title: reportName || reportInfo?.reportName || '',
            attachments: [],
            indicators: [],
            children: sections,
          },
        ]) || outline;
      if (isEsgMockModeEnabled() || isMockReportId(numericId)) {
        saveMockOutline({
          id: numericId,
          outline: nextOutlineMd,
          outlineSections: sections,
          promptConfig: finalPromptConfig,
          fallbackInfo: reportInfo,
        });
      } else {
        await postEditOutline(
          {
            id: numericId,
            outline: nextOutlineMd,
            outlineSections: sections,
            promptConfig: finalPromptConfig,
          },
          { silentResponseError: true },
        ).catch(() => {
          saveMockOutline({
            id: numericId,
            outline: nextOutlineMd,
            outlineSections: sections,
            promptConfig: finalPromptConfig,
            fallbackInfo: reportInfo,
          });
        });
      }
    }
    history.replace(
      `${resolveEsgRoute(
        RouteMaps.ESGAiGenerateDetail,
        location.pathname,
      )}?id=${id}`,
    );
  };

  return (
    <div className={styles.wrapper}>
      {/* AiGenerateOutline */}
      <div className={styles.header}>
        <div
          className={styles.icon}
          onClick={() => {
            history.push(
              resolveEsgRoute(RouteMaps.ESGAiGenerateHome, location.pathname),
            );
          }}
        >
          <IconAlibaba type='icon-a-icon_return' />
        </div>
        <span>{reportName}</span>
      </div>
      {/* <Dnd />
    <SortableTree removable /> */}
      <div
        className={styles.content}
        onScroll={e => {
          const target = e.target as HTMLElement;
          if (preScrollTop && target.scrollTop < preScrollTop) {
            canScroll.current = false;
          }
          preScrollTop = target.scrollTop;
        }}
      >
        <NestedSortableList
          outline={throttledOutline}
          id={Number(id)}
          disabled={!enable}
          loading={loading}
          reportInfo={reportInfo}
          initialSections={sections}
          promptConfig={promptConfig}
          onSectionsChange={handleSectionsChange}
          stopAutoScroll={() => {
            canScroll.current = false;
          }}
        />
        <div ref={bottomRef} />
      </div>
      {!loading && enable && (
        <div className={styles.footer}>
          <div className={styles.footerContent}>
            <div
              className={styles.reGenerateOutline}
              onClick={() => createOutline()}
            >
              {I18N.esg.regenerateLarge}
            </div>
            <div
              className={styles.promptConfigBtn}
              onClick={() => setPromptConfigOpen(true)}
            >
              <SlidersOutlined />
              {I18N.esg.reportPromptConfig}
            </div>
            <Spin spinning={fileStatus?.data.data.status === 0}>
              <div className={styles.generateReport} onClick={() => generate()}>
                <img src={aiSvg} alt='' /> {I18N.esg.basedOnTheOutlineStudents}
              </div>
            </Spin>
          </div>
        </div>
      )}
      <PromptConfigModal
        open={promptConfigOpen}
        value={promptConfig}
        reportInfo={reportInfo}
        sections={sections}
        onCancel={() => setPromptConfigOpen(false)}
        onConfirm={handlePromptConfirm}
      />
    </div>
  );
};

export default AiGenerateOutline;
