import {
  CustomFactorReuseContext,
  PROCESS_CUSTOM_FACTOR_REUSE_ENABLED,
} from '@src/components/FormilyUtil/FormilyFactor/context';
import { FootprintAccountStatusType } from '@src/views/carbonFootprint3/FootprintAccount/constant';
import classNames from 'classnames';
import { FC, memo, useEffect, useState } from 'react';
import { GwpScopeContext } from '@/components/EmissionGwp/context';

import { ProcessBuildVisual } from './Process';
import { QuickBuildVisual } from './Quick';
import style from './index.module.less';
import type { BuildModelVisualProps } from './type';

const { QUICK, PROCESS } = FootprintAccountStatusType;
export const BuildModelVisual: FC<BuildModelVisualProps> = memo(
  ({
    agentPreviewLayout,
    accountInfo,
    cRef,
    isDetail,
    apiExtraParams,
    aiAnimationStatus,
    changeEmission,
    editAccount,
    noSaveStoreBtn,
    noSelectEmissionBtn,
    quickDrawerMatchWayBtns,
    quickDrawerMatchWayBtnValue,
    updateAccountInfo,
    enableFactorSourceRange,
    onEmissionTaskCreate,
  }) => {
    const { type } = accountInfo;
    const [shouldRender, setShouldRender] = useState(true);

    const forceReload = () => {
      setShouldRender(false);
      setTimeout(() => setShouldRender(true), 16);
    };

    useEffect(() => {
      forceReload();
    }, [isDetail]);

    return (
      <GwpScopeContext.Provider value={type === QUICK}>
        <div
          className={classNames(style.visualGraphContainer, {
            [style.agentPreviewVisualGraphContainer]: agentPreviewLayout,
          })}
        >
          {type === QUICK && shouldRender && (
            <CustomFactorReuseContext.Provider value>
              <QuickBuildVisual
                agentPreviewLayout={agentPreviewLayout}
                aiAnimationStatus={aiAnimationStatus}
                apiExtraParams={apiExtraParams}
                accountInfo={accountInfo}
                cRef={cRef}
                isDetail={isDetail}
                noSaveStoreBtn={noSaveStoreBtn}
                onEmissionTaskCreate={onEmissionTaskCreate}
                noSelectEmissionBtn={noSelectEmissionBtn}
                quickDrawerMatchWayBtnValue={quickDrawerMatchWayBtnValue}
                quickDrawerMatchWayBtns={quickDrawerMatchWayBtns}
                changeEmission={changeEmission}
                editAccount={editAccount}
                updateAccountInfo={updateAccountInfo}
                enableFactorSourceRange={enableFactorSourceRange}
              />
            </CustomFactorReuseContext.Provider>
          )}
          {type === PROCESS && (
            <CustomFactorReuseContext.Provider
              value={PROCESS_CUSTOM_FACTOR_REUSE_ENABLED && !isDetail}
            >
              <ProcessBuildVisual
                apiExtraParams={apiExtraParams}
                accountInfo={accountInfo}
                isDetail={isDetail}
                onEmissionTaskCreate={onEmissionTaskCreate}
                editAccount={editAccount}
                enableFactorSourceRange={enableFactorSourceRange}
              />
            </CustomFactorReuseContext.Provider>
          )}
        </div>
      </GwpScopeContext.Provider>
    );
  },
);
