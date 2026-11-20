import { API_EXTRA_PARAMS_SNAPFLAG } from '@src/components/CarbonFootprintAccount/BuildModelMainData/constant';
import config from '@src/config';
import { RouteMapsCorbonFootprint3 } from '@src/router/route-paths/corbonFootprint3';

export const openProductFootprintSnapshotDetail = (
  accountId: string | number,
) => {
  const searchParams = new URLSearchParams({
    accountId: String(accountId),
    listOrGraph: '0',
    snapFlag: String(API_EXTRA_PARAMS_SNAPFLAG.SHARE),
    status: '1',
    stepValue: '1',
  });
  const route = `${
    RouteMapsCorbonFootprint3.carbonFootprint3FootprintAccountShare
  }?${searchParams.toString()}`;

  window.open(
    `${window.location.origin}${config.BASENAME || ''}${route}`,
    '_blank',
    'noopener,noreferrer',
  );
};
