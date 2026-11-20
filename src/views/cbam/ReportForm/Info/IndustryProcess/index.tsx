/**
 * @description 工业过程
 */
import I18N from '@src/lang/I18N';
import { compact } from 'lodash-es';
import { Switch } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { FormActions } from '@/components/FormActions';
import { InfoTitle } from '@/components/InfoTitle';
import { useCbamPageInfo } from '@/views/cbam/ReportForm/Info/context';

import OutsourcedPrecursor from './OutsourcedPrecursor';
import ProcessDirectEmission from './ProcessDirectEmission';
import SelfWorkProcedure from './SelfWorkProcedure';
import style from './index.module.less';
import {
  getProductProcessListApi,
  getGeneralInfoDetail,
  putGeneralInfoEdit,
} from '../../service';
import HeatPower from '../HeatPower';
import { ProductProcessResp } from '../../type';
import IndustrialProcessFlowDiagram from '../components/IndustrialProcessFlowDiagram';
import SupportFiles from '../components/SupportFiles';
import { OBJECT_TYPE } from '../components/SupportFiles/constant';

interface IndustryProcessProps {
  /** 下一步方法 */
  onClickNextStep: ({ reportId }: { reportId?: number }) => void;
  /** 返回方法 */
  onClickBack: () => void;
  /** 是否是CBAM跳转 */
  isCbamInfo?: boolean;
}

const IndustryProcess = ({
  onClickNextStep,
  onClickBack,
  isCbamInfo,
}: IndustryProcessProps) => {
  const { isDetail, id: cbamId } = useCbamPageInfo();

  /** 热电联产只控制当前页下方表单，保存失败时保持原开关。 */
  const [include, setInclude] = useState(1);
  const [savingInclude, setSavingInclude] = useState(false);
  useEffect(() => {
    if (cbamId)
      getGeneralInfoDetail({ id: cbamId }).then(({ data }) =>
        setInclude(data?.data?.include ?? 1),
      );
  }, [cbamId]);

  /** 工序过程流程图ref */
  const FlowDiagramRef = useRef<{
    onRefreshFlowDiagram: () => void;
  }>();

  /** 刷新流程图方法 */
  const onRefreshFlowDiagram = () => {
    FlowDiagramRef.current?.onRefreshFlowDiagram();
  };

  /** 工序信息数据 自厂工序信息表/过程直接排放 */
  const [dataSourceProcess, setDataSourceProcess] = useState<
    ProductProcessResp[]
  >([]);

  /** 工序信息loading */
  const [loadingProcess, setLoadingProcess] = useState(false);

  /** dataSourceProcess刷新标识 */
  const [refreshProcess, setRefreshProcess] = useState(false);

  /** 刷新dataSourceProcess方法 */
  const onRefreshProcess = () => {
    setRefreshProcess(!refreshProcess);
    /** 刷新流程图 */
    onRefreshFlowDiagram();
  };

  /** 更改工序信息数据 */
  const onChangeDataSourceProcess = (data: ProductProcessResp[]) => {
    setDataSourceProcess(data);
  };

  /** 获取工序信息 */
  const getDataSourceProcess = async () => {
    setLoadingProcess(true);
    try {
      const { data } = await getProductProcessListApi({
        cbamId,
      });
      setDataSourceProcess(data?.data || []);
      setLoadingProcess(false);
    } catch (error) {
      setDataSourceProcess([]);
      setLoadingProcess(false);
    }
  };

  useEffect(() => {
    /** 获取工序信息 */
    if (cbamId) {
      getDataSourceProcess();
    }
  }, [cbamId, refreshProcess]);

  return (
    <div className={style.wrapper}>
      {/* 自厂工序信息表 */}
      <SelfWorkProcedure
        cbamId={cbamId}
        isDetail={isDetail}
        dataSource={dataSourceProcess}
        onChangeDataSource={onChangeDataSourceProcess}
        loading={loadingProcess}
        onRefresh={onRefreshProcess}
      />

      {/* 外购前体信息表 */}
      <OutsourcedPrecursor
        cbamId={cbamId}
        isDetail={isDetail}
        onRefreshFlowDiagram={onRefreshFlowDiagram}
      />

      {/* 工业过程流程图 */}
      <IndustrialProcessFlowDiagram cbamId={cbamId} ref={FlowDiagramRef} />

      {/* 过程直接排放 */}
      <ProcessDirectEmission
        cbamId={cbamId}
        isDetail={isDetail}
        dataSource={dataSourceProcess}
        onRefresh={onRefreshProcess}
        loading={loadingProcess}
      />

      <section className={style.heatPowerSection}>
        <InfoTitle
          title={I18N.cbam.doesItIncludeHeat}
          rightRender={
            <Switch
              checked={include === 0}
              disabled={isDetail}
              loading={savingInclude}
              onChange={async checked => {
                setSavingInclude(true);
                try {
                  await putGeneralInfoEdit({
                    id: cbamId,
                    include: checked ? 0 : 1,
                  });
                  setInclude(checked ? 0 : 1);
                } finally {
                  setSavingInclude(false);
                }
              }}
            />
          }
        />
        {include === 0 && (
          <HeatPower
            embedded
            onClickNextStep={onClickNextStep}
            onClickBack={onClickBack}
          />
        )}
      </section>

      {/* 工业过程证据材料 */}
      <SupportFiles
        showActionBtn={!isDetail}
        objectType={OBJECT_TYPE.PROCESS_SUPPORT}
        cbamId={cbamId}
        key={`process${OBJECT_TYPE.PROCESS_SUPPORT}${cbamId}`}
      />

      <FormActions
        place='center'
        buttons={compact([
          !isDetail && {
            title: I18N.carbonFootPrintLCA.nextStep,
            type: 'primary',
            onClick: async () => {
              onClickNextStep({ reportId: cbamId });
            },
          },
          (!isDetail || isCbamInfo) && {
            title: I18N.Factors.return,
            onClick: async () => {
              onClickBack();
            },
          },
        ])}
      />
    </div>
  );
};

export default IndustryProcess;
