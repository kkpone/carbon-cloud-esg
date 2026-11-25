/* eslint-disable consistent-return */
import qrCodeImg from '@assets/svg/service_qr_code.png';
import {
  HocuspocusProvider,
  HocuspocusProviderWebsocket,
} from '@hocuspocus/provider';
import aiSvg from '@src/assets/icon/esg/ai.svg';
import I18N, { getCurrentLocale } from '@src/lang/I18N';
import { useMount, useThrottleFn, useUnmount } from 'ahooks';
import { Button, Spin, theme, Tooltip } from 'antd';
import classNames from 'classnames';
import { saveAs } from 'file-saver';
import { FC, useEffect, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';

import { streamFetch } from '@/api/streamFetch';
import { FullscreenModal } from '@/components/FullscreenModal';
import { IconAlibaba } from '@/components/iconfont';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import { RouteMaps } from '@/router/route-paths';
import { Toast } from '@/utils';

import styles from './index.module.less';
import { postDownloadReport, postEditReport } from './service';
import {
  buildReportSystemPrompt,
  getStoredOutlineSections,
  getStoredPromptConfig,
  mergePromptConfig,
} from '../AiGenerateOutline/promptUtils';
import { ReportDetailsType, getReportInfo } from '../AiGenerateOutline/service';
import { RatingModal } from '../MsciRatingList/components/RatingModal';
import {
  exportMarkdownAsDocFile,
  getMockReportInfo,
  isEsgMockModeEnabled,
  isMockReportId,
  isPermissionOrUnavailableError,
  saveMockReportContent,
  streamMockReport,
} from '../mockReportService';
import { resolveEsgRoute } from '../routeUtils';

const { useToken } = theme;

const hocuspocusId = (id: string) => `esgReport${id}`;

export interface IAiGenerateDetailProps {}

export const AiGenerateDetail: FC<IAiGenerateDetailProps> = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const id = searchParams.get('id');
  const { token } = useToken();

  const [reportName, setReportName] = useState('');
  const [reportContent, setReportContent] = useState('');
  const [reportInfo, setReportInfo] = useState<ReportDetailsType>();
  const [syncToHocuspocus, setSyncToHocuspocus] = useState(false);

  const [socket, setSocket] = useState<HocuspocusProviderWebsocket | null>(
    null,
  );

  const [ratingModalOpen, setRatingModalOpen] = useState(false);

  const [downloading, setDownloading] = useState(false);

  const editorRef = useRef<{ submitReport: () => Promise<void> }>();

  const downloadReport = async () => {
    setDownloading(true);
    try {
      await editorRef.current?.submitReport?.().catch(() => {});
      const numericId = Number(id);
      if (isEsgMockModeEnabled() || isMockReportId(numericId)) {
        const blob = exportMarkdownAsDocFile(
          reportName || 'ESGReport',
          reportContent || reportInfo?.reportContent || '',
        );
        saveAs(blob, `${reportName || 'ESGReport'}.docx`);
        Toast('success', I18N.esg.mockExportSuccess);
        return;
      }
      const result = await postDownloadReport(
        { id: numericId },
        { silentResponseError: true },
      );
      const { reportUrl } = result.data.data;
      const response = await fetch(reportUrl);
      const blob = await response.blob();
      saveAs(blob, `${reportName || 'ESGReport'}.docx`);
    } catch (error) {
      if (isPermissionOrUnavailableError(error)) {
        const blob = exportMarkdownAsDocFile(
          reportName || 'ESGReport',
          reportContent || reportInfo?.reportContent || '',
        );
        saveAs(blob, `${reportName || 'ESGReport'}.docx`);
        Toast('success', I18N.esg.mockExportSuccess);
      } else {
        const errMsg =
          (error as { data?: { msg?: string } })?.data?.msg ||
          I18N.utils.notHavePermission;
        Toast('warn', errMsg);
      }
    } finally {
      setDownloading(false);
    }
  };

  const history = useHistory();

  // 判断来源页面并返回
  const handleBack = () => {
    // 使用 history 的 length 判断是否有历史记录
    if (history.length > 1) {
      // 如果有历史记录，直接返回上一页
      history.goBack();
    } else {
      // 如果没有历史记录（直接打开链接），跳转到首页
      history.push(
        resolveEsgRoute(RouteMaps.ESGAiGenerateHome, location.pathname),
      );
    }
  };

  const cancelRequest = useRef<AbortController>();

  const canScroll = useRef(false);

  const { run } = useThrottleFn(
    () => {
      document.getElementById('editorContent')?.scrollIntoView({
        behavior: 'smooth',
      });
    },
    {
      wait: 50,
    },
  );

  const generateReport = async (info?: ReportDetailsType) => {
    const numericId = Number(id);
    const mergedPromptConfig = mergePromptConfig(
      info?.promptConfig || getStoredPromptConfig(numericId),
      getCurrentLocale(),
    );
    const effectiveSections =
      info?.outlineSections || getStoredOutlineSections(numericId) || [];
    const systemPrompt = buildReportSystemPrompt({
      reportInfo: info,
      sections: effectiveSections,
      config: mergedPromptConfig,
    });
    const effectivePromptConfig = {
      ...mergedPromptConfig,
      systemPrompt,
    };
    setSyncToHocuspocus(true);
    cancelRequest.current = new AbortController();
    canScroll.current = true;
    const onStreamMessage = (e: string) => {
      setReportContent(pre => pre + e);
      if (canScroll.current) {
        run();
      }
    };
    try {
      if (isEsgMockModeEnabled() || isMockReportId(numericId)) {
        await streamMockReport({
          reportId: numericId,
          reportInfo: info,
          sections: effectiveSections,
          promptConfig: effectivePromptConfig,
          onMessage: onStreamMessage,
          abortCtrl: cancelRequest.current,
        });
        return;
      }
      await streamFetch({
        url: `${process.env.REACT_APP_API_URL}/esg/frameReport/aiEsgGenerate`,
        data: {
          reportId: numericId,
          promptConfig: effectivePromptConfig,
          systemPrompt,
          outlineSections: effectiveSections,
        },
        onMessage: onStreamMessage,
        abortCtrl: cancelRequest.current,
      });
    } catch (err: any) {
      if (isPermissionOrUnavailableError(err)) {
        Toast('info', I18N.esg.mockFallbackNotice);
        await streamMockReport({
          reportId: numericId,
          reportInfo: info,
          sections: effectiveSections,
          promptConfig: effectivePromptConfig,
          onMessage: onStreamMessage,
          abortCtrl: cancelRequest.current,
        });
      } else {
        const errMsg =
          err?.message?.msg ||
          (typeof err?.message === 'string' ? err.message : '') ||
          I18N.utils.notHavePermission;
        Toast('warn', errMsg);
      }
    } finally {
      setSyncToHocuspocus(false);
    }
  };

  useUnmount(() => {
    cancelRequest.current?.abort();
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
      if (!info.reportContent) {
        generateReport(info);
      } else {
        setReportContent(info.reportContent);
      }
    }
  });

  const [connect, setConnect] = useState(false);

  useEffect(() => {
    const newlyCreatedSocket = new HocuspocusProviderWebsocket({
      url: `${process.env.REACT_APP_API_HOCUSPOCUS_WSS}`,
      onDisconnect: () => setConnect(false),
      onConnect: () => setConnect(true),
    });

    setSocket(newlyCreatedSocket);

    return () => {
      newlyCreatedSocket?.destroy();
    };
  }, []);

  const [provider, setProvider] = useState<HocuspocusProvider>();

  useEffect(() => {
    if (!socket || !id) return;

    const p = new HocuspocusProvider({
      websocketProvider: socket,
      name: hocuspocusId(id),
    });

    setProvider(p);

    return () => {
      p.detach();
    };
  }, [socket, id]);

  if (!provider) {
    return false;
  }

  const editReport = async (reportStr: string) => {
    if (!id) return;
    const numericId = Number(id);
    setReportContent(reportStr);
    if (isEsgMockModeEnabled() || isMockReportId(numericId)) {
      saveMockReportContent({
        id: numericId,
        reportContent: reportStr,
        fallbackInfo: reportInfo,
      });
      return;
    }
    try {
      await postEditReport(
        {
          id: numericId,
          reportContent: reportStr,
        },
        { silentResponseError: true },
      );
    } catch {
      saveMockReportContent({
        id: numericId,
        reportContent: reportStr,
        fallbackInfo: reportInfo,
      });
    }
  };

  return (
    <FullscreenModal style={{ zIndex: 99 }}>
      <RatingModal
        open={ratingModalOpen}
        esgReportId={Number(id)}
        onCancel={() => setRatingModalOpen(false)}
      />
      <div className={styles.AiGenerateDetail}>
        <div className={styles.header}>
          <div className={styles.title}>
            <div
              className={classNames(styles.back, {
                [styles.notAllow]: syncToHocuspocus,
              })}
              onClick={() => {
                if (syncToHocuspocus) {
                  return;
                }
                handleBack();
              }}
            >
              <IconAlibaba type='icon-a-icon_return' />
            </div>
            {reportName}
          </div>
          <div className={styles.rightBtns}>
            <Button
              className={styles.ratingBtn}
              type='primary'
              onClick={() => {
                setRatingModalOpen(!syncToHocuspocus);
              }}
            >
              {I18N.esg.esgRating}
            </Button>
            <Tooltip
              trigger={['hover']}
              title={
                <div className={styles.contact}>
                  <div>{I18N.carbonFootprint3.contactExclusiveCustomers}</div>
                  <img src={qrCodeImg} style={{ width: '140px' }} alt='' />
                </div>
              }
              color={token.Menu?.itemBg}
              arrow={false}
              placement='bottom'
            >
              <div className={styles.tips}>{I18N.esg.contactUs}</div>
            </Tooltip>
            {!syncToHocuspocus && (
              <Spin spinning={downloading}>
                <div
                  className={styles.download}
                  onClick={() => {
                    downloadReport();
                  }}
                >
                  <IconAlibaba type='icon-icon_daoru' />
                </div>
              </Spin>
            )}
          </div>
        </div>
        {syncToHocuspocus && (
          <div className={styles.aiGenerating}>
            <img src={aiSvg} alt='' />
            {I18N.esg.inAiGeneration}
          </div>
        )}
        {socket && provider && !!reportContent && (
          <SimpleEditor
            connectStatus={connect}
            reportId={Number(id)}
            syncToHocuspocus={syncToHocuspocus}
            provider={provider}
            slug='slug'
            ref={editorRef}
            stopAutoScroll={() => {
              canScroll.current = false;
            }}
            editReport={editReport}
            reportContent={reportContent}
          />
        )}
      </div>
    </FullscreenModal>
  );
};

export default AiGenerateDetail;
