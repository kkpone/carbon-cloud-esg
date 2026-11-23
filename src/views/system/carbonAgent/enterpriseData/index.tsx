import I18N from '@src/lang/I18N';
import { useHistory, useLocation } from 'react-router-dom';

import { ComparePage } from './ComparePage';
import { DetailPage } from './DetailPage';
import { FollowPage } from './FollowPage';
import IndustryTopPage from './components/IndustryTopPage';
import { enterpriseSearch } from './data';
import { useEnterpriseData } from './state';
import style from './index.module.less';

const EnterpriseDataPage = () => {
  const history = useHistory();
  const location = useLocation();
  const state = useEnterpriseData();
  const search = new URLSearchParams(location.search);
  const section = search.get('section');
  const companyId = search.get('companyId') || '';
  const resultId = search.get('resultId') || '';
  const industry = search.get('industry') || '';
  const year = search.get('year') || '';
  const from = search.get('from') || '';
  const navigate = (nextSection: string, params = {}, replace = false) => {
    const target = {
      pathname: location.pathname,
      search: enterpriseSearch(location.search, nextSection, params),
    };
    if (replace) history.replace(target);
    else history.push(target);
  };
  if (!state.enabled) return null;
  const fromIndustryTop = from === 'industryTop';
  return (
    <div className={`${style.page} ${style.followShell}`} key={state.scope}>
      {section === 'enterpriseDetail' ? (
        <DetailPage
          key={companyId}
          companyId={companyId}
          backLabel={
            fromIndustryTop
              ? I18N.enterpriseData.industryTopBackToRanking
              : undefined
          }
          onBack={() =>
            fromIndustryTop
              ? navigate('enterpriseIndustryTop', {
                  industry: industry || undefined,
                  year: year || undefined,
                })
              : navigate('enterpriseFollows')
          }
        />
      ) : section === 'enterpriseCompare' ? (
        <ComparePage
          resultId={resultId}
          onBack={() => navigate('enterpriseFollows')}
          onSelect={() => navigate('enterpriseCompare')}
          onResult={id => navigate('enterpriseCompare', { resultId: id }, true)}
        />
      ) : section === 'enterpriseIndustryTop' ? (
        <IndustryTopPage
          industryParam={industry}
          yearParam={year}
          onSwitchTab={next => navigate(next)}
          onParamsChange={next => navigate('enterpriseIndustryTop', next, true)}
          onOpenCompany={(targetId, targetIndustry, targetYear) =>
            navigate('enterpriseDetail', {
              companyId: targetId,
              industry: targetIndustry,
              year: targetYear,
              from: 'industryTop',
            })
          }
        />
      ) : (
        <FollowPage
          onCompare={() => navigate('enterpriseCompare')}
          onSwitchTab={next => navigate(next)}
        />
      )}
    </div>
  );
};

export default EnterpriseDataPage;
