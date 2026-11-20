import { useState } from 'react';
import { Button, Modal, Tabs } from 'antd';
import { useHistory } from 'react-router-dom';
import I18N from '@/lang/I18N';
import ModelingEntry from '@/components/CarbonAgent/components/ModelingEntry';
import { RouteMapsCorbonFootprint3 } from '@/router/route-paths/corbonFootprint3';
import { Toast } from '@/utils';
import { STEP_OPTION_VALUE } from '@/views/carbonFootprint3/util/constant';
import {
  postAccountingBasicSaveAndView,
  postAccountingCopyModelViewBasic,
} from '../../AccountDetail/AccountInfo/service';
import type { AccountingAddBasicApiData } from '../../AccountDetail/AccountInfo/type';
import SelectModel from '../../SelectModel';
import type { SelectModelListData } from '../../SelectModel/type';
import AccountInfoModal from '../../component/AccountInfoModal';
import { BuildModelDescribeSet } from '../../component/AccountInfoBuildModel/constant';
import {
  FootprintAccountInfoUrlStatus,
  FootprintAccountStatusType,
} from '../../constant';
import styles from './index.module.less';

export default function AddAccount({
  productId,
  onClose,
}: {
  productId: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState('agent');
  const [model, setModel] = useState<SelectModelListData>();
  const history = useHistory();
  const onAccountAdd = async (values: Record<string, unknown>) => {
    const save =
      values.modelId == null
        ? postAccountingBasicSaveAndView
        : postAccountingCopyModelViewBasic;
    const { data } = await save(values as unknown as AccountingAddBasicApiData);
    Toast('success', I18N.carbonFootprint3.accountingCreation);
    history.push(
      `${
        RouteMapsCorbonFootprint3.carbonFootprint3FootprintAccountDetail
      }?${new URLSearchParams({
        productId,
        accountId: String(data.data),
        status: String(FootprintAccountInfoUrlStatus.EDIT),
        stepValue: String(STEP_OPTION_VALUE.MODEL),
        listOrGraph: String(BuildModelDescribeSet.VISUAL),
      })}`,
    );
  };
  return (
    <Modal
      open
      title={I18N.carbonFootprint3.addAccounting}
      width={960}
      centered
      footer={null}
      onCancel={onClose}
      maskClosable={false}
      className={styles.modal}
    >
      <Tabs
        className={styles.tabs}
        activeKey={tab}
        onChange={setTab}
        items={[
          { key: 'agent', label: 'Agent' },
          { key: 'quick', label: I18N.carbonFootprint3.quickAccounting },
          { key: 'process', label: I18N.carbonFootprint3.processAccounting },
          { key: 'template', label: I18N.carbonFootprint3.selectTemplate },
        ]}
      />
      <div className={styles.body}>
        <div hidden={tab !== 'agent'}>
          <ModelingEntry productId={productId} onStarted={onClose} compact />
        </div>
        {(tab === 'quick' || tab === 'process') && (
          <AccountInfoModal
            key={tab}
            open
            embedded
            productId={productId}
            accountType={
              tab === 'quick'
                ? FootprintAccountStatusType.QUICK
                : FootprintAccountStatusType.PROCESS
            }
            onClose={onClose}
            onConfirm={onAccountAdd}
          />
        )}
        {tab === 'template' &&
          (model ? (
            <>
              <div className={styles.selected}>
                <span>{model.modelName}</span>
                <Button type='link' onClick={() => setModel(undefined)}>
                  {I18N.carbonAgent.reselect}
                </Button>
              </div>
              <AccountInfoModal
                key={model.id}
                open
                embedded
                productId={productId}
                modelId={model.id}
                onClose={onClose}
                onConfirm={onAccountAdd}
              />
            </>
          ) : (
            <SelectModel
              visible
              embedded
              onCancel={onClose}
              onModelUse={setModel}
            />
          ))}
      </div>
    </Modal>
  );
}
