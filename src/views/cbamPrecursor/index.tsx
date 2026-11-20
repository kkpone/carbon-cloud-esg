import { PlusOutlined } from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { Button, Empty, Input, message, Space, Spin, Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useState } from 'react';

import { useAllEnumsBatch } from '@/hooks';

import categoryIcon from './assets/category.svg';
import searchIcon from './assets/search.svg';
import { HiddenPrecursorModal } from './components/HiddenPrecursorModal';
import { PrecursorDetailDrawer } from './components/PrecursorDetailDrawer';
import { PrecursorFormDrawer } from './components/PrecursorFormDrawer';
import styles from './index.module.less';
import {
  getDefaultCnPage,
  getPrecursorDetail,
  getPrecursorCnPage,
  getPrecursorPage,
  hidePrecursor,
  restorePrecursor,
} from './service';
import { Precursor, PrecursorCnCard } from './types';

const cnKey = (item: Pick<PrecursorCnCard, 'cnCode'>) => item.cnCode;

const CbamPrecursor = () => {
  const [searchText, setSearchText] = useState('');
  const [keyword, setKeyword] = useState('');
  const [cards, setCards] = useState<PrecursorCnCard[]>([]);
  const [cnOptions, setCnOptions] = useState<PrecursorCnCard[]>([]);
  const [selected, setSelected] = useState<PrecursorCnCard>();
  const [records, setRecords] = useState<Precursor[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<Precursor>();
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [hiddenLoading, setHiddenLoading] = useState(false);
  const [hiddenRecords, setHiddenRecords] = useState<Precursor[]>([]);
  const [hiddenTotal, setHiddenTotal] = useState(0);
  const [hiddenPage, setHiddenPage] = useState(1);
  const [hiddenPageSize, setHiddenPageSize] = useState(10);
  const countries = useAllEnumsBatch('CBAMcountryinfo')?.CBAMcountryinfo || [];
  const loadCards = useCallback(
    async (preferred?: PrecursorCnCard) => {
      const response = await getPrecursorCnPage({
        pageNum: 1,
        pageSize: 500,
        keyword,
        onlyUsed: true,
      });
      const nextCards = response.data?.data?.records || [];
      setCards(nextCards);
      setSelected(current => {
        const preferredKey = preferred
          ? cnKey(preferred)
          : current
          ? cnKey(current)
          : '';
        return (
          nextCards.find(item => cnKey(item) === preferredKey) || nextCards[0]
        );
      });
    },
    [keyword],
  );
  const loadCnOptions = useCallback(async () => {
    const response = await getDefaultCnPage();
    const nextOptions = (
      response.data?.data?.records || []
    ).flatMap<PrecursorCnCard>(item => {
      const cnCode = item.defaultCode?.trim();
      if (!item.id || !item.productCategoryId || !cnCode) return [];
      return [
        {
          defaultCnId: item.id,
          productCategoryId: item.productCategoryId,
          productCategoryName: item.name,
          cnCode,
          cnName: item.defaultName,
          visibleCount: 0,
        },
      ];
    });
    setCnOptions(nextOptions);
  }, []);
  const loadList = useCallback(async () => {
    if (!selected) {
      setRecords([]);
      setTotal(0);
      return;
    }
    setLoading(true);
    try {
      const response = await getPrecursorPage({
        pageNum,
        pageSize,
        cnCode: selected.cnCode,
        hidden: false,
      });
      setRecords(response.data?.data?.records || []);
      setTotal(response.data?.data?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [pageNum, pageSize, selected]);
  const loadHidden = useCallback(async () => {
    if (!selected || !hiddenOpen) return;
    setHiddenLoading(true);
    try {
      const response = await getPrecursorPage({
        pageNum: hiddenPage,
        pageSize: hiddenPageSize,
        cnCode: selected.cnCode,
        hidden: true,
      });
      setHiddenRecords(response.data?.data?.records || []);
      setHiddenTotal(response.data?.data?.total || 0);
    } finally {
      setHiddenLoading(false);
    }
  }, [hiddenOpen, hiddenPage, hiddenPageSize, selected]);
  useEffect(() => {
    loadCards();
  }, [loadCards]);
  useEffect(() => {
    loadCnOptions();
  }, [loadCnOptions]);
  useEffect(() => {
    loadList();
  }, [loadList]);
  useEffect(() => {
    loadHidden();
  }, [loadHidden]);
  const showDetail = async (id: number) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(undefined);
    try {
      const response = await getPrecursorDetail(id);
      setDetail(response.data?.data);
    } finally {
      setDetailLoading(false);
    }
  };
  const hideRow = async (row: Precursor) => {
    await hidePrecursor(row.id);
    message.success(I18N.cbamPrecursor.hidden);
    await Promise.all([loadCards(selected), loadList()]);
  };
  const restore = async (id: number) => {
    await restorePrecursor(id);
    message.success(I18N.cbamPrecursor.restored);
    await Promise.all([loadCards(selected), loadList(), loadHidden()]);
  };
  const columns: ColumnsType<Precursor> = [
    {
      title: I18N.cbamPrecursor.collectionType,
      dataIndex: 'sourceTypeName',
      width: 120,
    },
    {
      title: I18N.cbamPrecursor.fillName,
      dataIndex: 'fillTaskName',
      render: value => value || '-',
    },
    { title: I18N.cbamPrecursor.precursorName, dataIndex: 'precursorName' },
    { title: I18N.cbamPrecursor.supplier, dataIndex: 'supplierName' },
    {
      title: I18N.cbamPrecursor.verificationPeriod,
      width: 210,
      render: (_, row) => (
        <span className={styles.verificationPeriod}>
          {row.verificationStartDate} ~ {row.verificationEndDate}
        </span>
      ),
    },
    {
      title: I18N.cbamPrecursor.embeddedEmission,
      dataIndex: 'embeddedEmission',
      render: value => `${value} tCO₂e/t`,
    },
    {
      title: I18N.cbamPrecursor.operation,
      width: 140,
      fixed: 'right',
      render: (_, row) => (
        <Space size={16}>
          <Button type='link' onClick={() => hideRow(row)}>
            {I18N.cbamPrecursor.hide}
          </Button>
          <Button type='link' onClick={() => showDetail(row.id)}>
            {I18N.cbamPrecursor.view}
          </Button>
        </Space>
      ),
    },
  ];
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2>{I18N.cbamPrecursor.title}</h2>
      </div>
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>
            <img src={categoryIcon} alt='' />
            <strong>{I18N.cbamPrecursor.categoryTitle}</strong>
          </div>
          <Input
            className={styles.search}
            value={searchText}
            maxLength={100}
            placeholder={I18N.cbamPrecursor.searchPlaceholder}
            suffix={
              <button
                type='button'
                aria-label='search'
                onClick={() => setKeyword(searchText.trim())}
              >
                <img src={searchIcon} alt='' />
              </button>
            }
            onChange={event => setSearchText(event.target.value)}
            onPressEnter={() => setKeyword(searchText.trim())}
          />
          <div className={styles.cards}>
            {cards.map(card => (
              <button
                type='button'
                key={cnKey(card)}
                className={`${styles.card} ${
                  selected && cnKey(selected) === cnKey(card)
                    ? styles.active
                    : ''
                }`}
                onClick={() => {
                  setPageNum(1);
                  setSelected(card);
                }}
              >
                <span className={styles.cardTitle}>
                  <i>CN</i>
                  <strong>{card.cnCode}</strong>
                </span>
                <span className={styles.cardMeta}>
                  <small>{card.productCategoryName || '-'}</small>
                  <em>
                    {card.visibleCount}
                    {I18N.cbamPrecursor.records}
                  </em>
                </span>
              </button>
            ))}
          </div>
        </aside>
        <main className={styles.content}>
          <div className={styles.toolbar}>
            <div className={styles.productInfo}>
              <strong>{selected?.cnCode || '-'}</strong>
              {selected?.productCategoryName && (
                <span>{selected.productCategoryName}</span>
              )}
            </div>
            <div className={styles.toolbarActions}>
              <Button disabled={!selected} onClick={() => setHiddenOpen(true)}>
                {I18N.cbamPrecursor.hiddenData}
              </Button>
              <Button
                type='primary'
                icon={<PlusOutlined />}
                onClick={() => setFormOpen(true)}
              >
                {I18N.cbamPrecursor.add}
              </Button>
            </div>
          </div>
          <Spin spinning={loading}>
            {!selected ? (
              <Empty description={I18N.cbamPrecursor.noCn} />
            ) : (
              <Table
                className={styles.table}
                rowKey='id'
                columns={columns}
                dataSource={records}
                scroll={{ x: 1180 }}
                pagination={{
                  current: pageNum,
                  pageSize,
                  total,
                  onChange: (page, size) => {
                    setPageNum(page);
                    setPageSize(size);
                  },
                }}
              />
            )}
          </Spin>
        </main>
      </div>
      <PrecursorFormDrawer
        open={formOpen}
        cnOptions={cnOptions}
        countryOptions={countries}
        initialCn={selected}
        onClose={() => setFormOpen(false)}
        onSaved={cn => {
          setFormOpen(false);
          message.success(I18N.cbamPrecursor.saved);
          loadCards(cn);
        }}
      />
      <PrecursorDetailDrawer
        open={detailOpen}
        loading={detailLoading}
        detail={detail}
        onClose={() => setDetailOpen(false)}
      />
      <HiddenPrecursorModal
        cn={selected}
        open={hiddenOpen}
        loading={hiddenLoading}
        records={hiddenRecords}
        total={hiddenTotal}
        pageNum={hiddenPage}
        pageSize={hiddenPageSize}
        onClose={() => setHiddenOpen(false)}
        onPageChange={(page, size) => {
          setHiddenPage(page);
          setHiddenPageSize(size);
        }}
        onDetail={showDetail}
        onRestore={restore}
      />
    </div>
  );
};

export default CbamPrecursor;
