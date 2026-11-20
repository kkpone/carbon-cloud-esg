import { Col, Drawer, Form, Input, Row, Spin, Typography } from 'antd';

import I18N from '@/lang/I18N';
import FormDrawerFooter from '@/views/energyCarbon/components/FormDrawerFooter';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { FORM_CONFIG } from '@/views/energyCarbon/platform/config';
import { TABLE_EMPTY_TEXT } from '@/views/energyCarbon/platform/tableColumn';

import { isMarketTrade } from '../../constant';
import { useCarbonTradeDetail } from '../../hooks';

import styles from './index.module.css';

const DETAIL_FORM_ID = 'carbon-trade-detail';

interface Props {
  id?: number;
  onClose: () => void;
}

/** 碳交易详情抽屉，展示业务字段但不暴露账户影响快照。 */
export default function CarbonTradeDetailDrawer({ id, onClose }: Props) {
  useLocale();
  const { data, isLoading } = useCarbonTradeDetail(id);
  const marketTrade = isMarketTrade(data?.tradeType);

  return (
    <Drawer
      title={I18N.energyCarbon.assetTradeDetails}
      open={id !== undefined}
      onClose={onClose}
      destroyOnClose
      placement='right'
      size='large'
      data-testid='carbon-trade-detail-drawer'
      footer={
        <FormDrawerFooter
          isView
          onClose={onClose}
          testIdPrefix='carbon-trade-detail'
          formId={DETAIL_FORM_ID}
        />
      }
    >
      <Spin spinning={isLoading}>
        <Form
          id={DETAIL_FORM_ID}
          layout='vertical'
          disabled
          requiredMark={false}
          data-testid='carbon-trade-detail-content'
        >
          <section className={styles.sectionBlock}>
            <div className={styles.sectionTitle}>
              {I18N.energyCarbon.assetTradeInformation}
            </div>
            <Row gutter={FORM_CONFIG.gutter}>
              <Col xs={24} sm={12}>
                <Form.Item label={I18N.common.fields.organization}>
                  <Input value={data?.orgName ?? TABLE_EMPTY_TEXT} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={I18N.energyCarbon.assetCarbonAsset}>
                  <Input value={data?.carbonAssetName ?? TABLE_EMPTY_TEXT} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={I18N.energyCarbon.assetTradeType}>
                  <Input value={data?.tradeTypeName ?? TABLE_EMPTY_TEXT} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={I18N.energyCarbon.tradeVoucher}>
                  <Input value={data?.documentNo ?? TABLE_EMPTY_TEXT} />
                </Form.Item>
              </Col>
              {data?.carbonAsset === 1 && data.tradeType === 106 && (
                <Col xs={24} sm={12}>
                  <Form.Item label={I18N.energyCarbon.tradeComplianceYear}>
                    <Input value={data.complianceYear ?? TABLE_EMPTY_TEXT} />
                  </Form.Item>
                </Col>
              )}
              <Col xs={24} sm={12}>
                <Form.Item label={I18N.energyCarbon.assetTradeDate}>
                  <Input value={data?.tradeDate ?? TABLE_EMPTY_TEXT} />
                </Form.Item>
              </Col>
              {marketTrade && (
                <Col xs={24} sm={12}>
                  <Form.Item label={I18N.energyCarbon.assetCounterparty}>
                    <Input value={data?.counterparty ?? TABLE_EMPTY_TEXT} />
                  </Form.Item>
                </Col>
              )}
              <Col xs={24} sm={12}>
                <Form.Item label={I18N.energyCarbon.assetTradeQuantity}>
                  <Input value={data?.quantity ?? TABLE_EMPTY_TEXT} />
                </Form.Item>
              </Col>
              {marketTrade && (
                <>
                  <Col xs={24} sm={12}>
                    <Form.Item label={I18N.energyCarbon.assetTradePrice}>
                      <Input value={data?.tradePrice ?? TABLE_EMPTY_TEXT} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label={I18N.energyCarbon.assetTradeAmount}>
                      <Input value={data?.tradeAmount ?? TABLE_EMPTY_TEXT} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label={I18N.energyCarbon.assetFeeRate}>
                      <Input value={data?.feeRate ?? TABLE_EMPTY_TEXT} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item label={I18N.energyCarbon.assetSettlementFee}>
                      <Input value={data?.settlementFee ?? TABLE_EMPTY_TEXT} />
                    </Form.Item>
                  </Col>
                </>
              )}
            </Row>
          </section>

          <section className={styles.sectionBlock}>
            <div className={styles.sectionTitle}>
              {I18N.energyCarbon.assetContractInformation}
            </div>
            <Row gutter={FORM_CONFIG.gutter}>
              <Col xs={24} sm={12}>
                <Form.Item label={I18N.energyCarbon.assetContractNumber}>
                  <Input value={data?.contractNo ?? TABLE_EMPTY_TEXT} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={I18N.energyCarbon.assetContractName}>
                  <Input value={data?.contractName ?? TABLE_EMPTY_TEXT} />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item label={I18N.energyCarbon.assetContractFile}>
                  {data?.contractFile?.url ? (
                    <Typography.Link
                      href={data.contractFile.url}
                      target='_blank'
                      rel='noreferrer'
                      data-testid='carbon-trade-detail-contract-file'
                    >
                      {data.contractFile.fileName}
                    </Typography.Link>
                  ) : (
                    <Input value={TABLE_EMPTY_TEXT} />
                  )}
                </Form.Item>
              </Col>
            </Row>
          </section>

          <section className={styles.sectionBlock}>
            <div className={styles.sectionTitle}>
              {I18N.energyCarbon.assetUpdateInformation}
            </div>
            <Row gutter={FORM_CONFIG.gutter}>
              <Col xs={24} sm={12}>
                <Form.Item label={I18N.common.table.updateBy}>
                  <Input value={data?.updateByName ?? TABLE_EMPTY_TEXT} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label={I18N.common.table.updateTime}>
                  <Input value={data?.updateTime ?? TABLE_EMPTY_TEXT} />
                </Form.Item>
              </Col>
            </Row>
          </section>
        </Form>
      </Spin>
    </Drawer>
  );
}
