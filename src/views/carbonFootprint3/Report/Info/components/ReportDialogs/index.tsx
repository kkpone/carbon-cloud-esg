import { Modal, Radio as AntdRadio } from 'antd';
import { Form } from '@formily/core';
import I18N from '@src/lang/I18N';
import { Report } from '@src/sdks_v2/footprint3V2ApiDocs';
import { ModalBase } from '@src/components/UI/Modal';
import { Table } from '@src/components/Table';
import { SelectProductAccount } from '../../../../component/SelectProductAccount';
import { ProductAccountingList } from '../../../../FootprintAccount/component/ProductSelectAccount/type';
import { activityDataColumns, factorColumns } from '../../columns';
import { activityData, factorDatas, radios } from '../../datas';
import styles from './index.module.less';

interface Props {
  modalShow?: 'activity' | 'factor';
  setModalShow: (kind?: 'activity' | 'factor') => void;
  checkedRadio: string;
  setcheckedRadio: (value: string) => void;
  productModalVisible: boolean;
  setProductModalVisible: (visible: boolean) => void;
  form: { current: Form<Report> };
  accountType: number;
  selectProductModal: (items: ProductAccountingList[]) => Promise<void>;
}
export function ReportDialogs({
  modalShow,
  setModalShow,
  checkedRadio,
  setcheckedRadio,
  productModalVisible,
  setProductModalVisible,
  form,
  accountType,
  selectProductModal,
}: Props) {
  return (
    <>
      <ModalBase
        title={I18N.carbonFootprint3.activityDataQuality}
        visible={modalShow === 'activity'}
        className={styles.modal1}
        closable={false}
        okButtonProps={{ style: { display: 'none' } }}
        onCancel={() => {
          setModalShow(undefined);
        }}
        width={704}
        content={
          <div>
            <Table
              columns={activityDataColumns()}
              // @ts-ignore
              fetchApi={() => Promise.resolve()}
              // @ts-ignore
              returnFetchApi={() => ({
                data: activityData,
              })}
              pagination={false}
            />
          </div>
        }
      />
      <ModalBase
        title={I18N.carbonFootprint3.numberOfEmissionFactors2}
        visible={modalShow === 'factor'}
        className={styles.modal1}
        closable={false}
        okButtonProps={{ style: { display: 'none' } }}
        onCancel={() => {
          setModalShow(undefined);
        }}
        width={822}
        content={
          <div>
            <AntdRadio.Group
              className={styles.radios}
              options={Object.entries(radios).map(([value, label]) => ({
                label,
                value,
              }))}
              onChange={v => setcheckedRadio(v.target.value)}
              value={checkedRadio}
              optionType='button'
              buttonStyle='solid'
            />

            <Table
              columns={factorColumns(checkedRadio as keyof typeof radios)}
              dataSource={factorDatas(checkedRadio as keyof typeof radios)}
              pagination={false}
              // @ts-ignore    // 不需要这个字段
              fetchApi={() => Promise.resolve()}
            />
          </div>
        }
      />
      {productModalVisible && (
        <Modal
          title={I18N.carbonFootprint.selectProduct}
          width={1200}
          maskClosable={false}
          getContainer={false}
          open={productModalVisible}
          footer={null}
          style={{
            top: 50,
          }}
          bodyStyle={{
            padding: '0 16px',
          }}
          onCancel={() => setProductModalVisible(false)}
        >
          <SelectProductAccount
            accountIds={form.current
              .getValuesIn('reportAccountList')
              ?.map(list => list.accountName)}
            accountType={accountType}
            subSelect={selectProductModal}
            cancel={() => setProductModalVisible(false)}
          />
        </Modal>
      )}
    </>
  );
}
