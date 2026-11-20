import { WPS_API_URL, WPS_APP_ID } from '@src/config/deploy';
import I18N from '@src/lang/I18N';
import { Empty, Spin } from 'antd';
import { FC, useEffect, useRef, useState } from 'react';

import store from '@/store';
import WebOfficeSDK from '@/views/subModules/CarbonFootprintModel/WPSFile/web-office-sdk-solution-v2.0.7.es';

import styles from './index.module.less';
import { PreviewFile } from '../../types';
import { getOfficeType } from '../../utils';

interface OfficePreviewProps {
  file: PreviewFile;
}

interface WpsRegisterResponse {
  fileId: string;
  message?: string;
  token: string;
}

interface WpsInstance {
  destroy: () => void;
  ready: () => Promise<void>;
}

interface RegisterWpsFileParams {
  apiPath: string;
  file: PreviewFile;
  signal: AbortSignal;
  userId: string;
  userName: string;
}

async function registerWpsFile({
  apiPath,
  file,
  signal,
  userId,
  userName,
}: RegisterWpsFileParams): Promise<WpsRegisterResponse> {
  const response = await fetch(`${apiPath}/wps/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ossUrl: file.url,
      fileName: file.name,
      userId,
      userName,
      filePermission: {
        update: 0,
      },
    }),
    signal,
  });
  const data = (await response.json()) as WpsRegisterResponse;

  if (!response.ok || !data.fileId || !data.token) {
    throw new Error(
      data.message || I18N.enterpriseCarbonAccount2.filePreviewFailed,
    );
  }

  return data;
}

const OfficePreview: FC<OfficePreviewProps> = ({ file }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<WpsInstance>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const wpsApiPath = WPS_API_URL || import.meta.env.REACT_APP_WPS_API_URL;
  const wpsAppId = WPS_APP_ID || import.meta.env.REACT_APP_WPS_APP_ID;

  const { userInfo } = store.getState().companyUserInfo;
  const userId = `${userInfo?.userId || `preview-${file.id}`}`;
  const userName =
    userInfo?.username || I18N.supplyChainCarbonManagement.preview;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    setLoading(true);
    setFailed(false);

    registerWpsFile({
      apiPath: wpsApiPath,
      file,
      signal: controller.signal,
      userId,
      userName,
    })
      .then(async data => {
        if (cancelled || !mountRef.current) return;

        const instance = WebOfficeSDK.init({
          appId: wpsAppId,
          fileId: data.fileId,
          mode: 'embed',
          mount: mountRef.current,
          officeType: getOfficeType(file.name),
          readOnly: true,
          token: data.token,
        }) as WpsInstance;

        instanceRef.current = instance;
        await instance.ready();
      })
      .catch(error => {
        if (cancelled || error instanceof DOMException) return;
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      instanceRef.current?.destroy();
      instanceRef.current = undefined;
    };
  }, [file, userId, userName, wpsApiPath, wpsAppId]);

  return (
    <Spin
      spinning={loading}
      tip={I18N.components.loading}
      wrapperClassName={styles.spin}
    >
      <div className={styles.officePreview}>
        {failed ? (
          <Empty
            className={styles.empty}
            description={I18N.enterpriseCarbonAccount2.filePreviewFailed}
          />
        ) : (
          <div className={styles.mountTarget} ref={mountRef} />
        )}
      </div>
    </Spin>
  );
};

export default OfficePreview;
