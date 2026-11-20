import batchSelect from '@/assets/images/carbonFootprint3/uncertainty-analysis/batch-select.svg';
import calculate from '@/assets/images/carbonFootprint3/uncertainty-analysis/calculate.svg';
import close from '@/assets/images/carbonFootprint3/uncertainty-analysis/close.svg';
import configure from '@/assets/images/carbonFootprint3/uncertainty-analysis/configure.svg';
import description from '@/assets/images/carbonFootprint3/uncertainty-analysis/description.svg';
import edit from '@/assets/images/carbonFootprint3/uncertainty-analysis/edit.svg';
import filter from '@/assets/images/carbonFootprint3/uncertainty-analysis/filter.svg';
import info from '@/assets/images/carbonFootprint3/uncertainty-analysis/info.svg';
import plus from '@/assets/images/carbonFootprint3/uncertainty-analysis/plus.svg';
import quality from '@/assets/images/carbonFootprint3/uncertainty-analysis/quality.svg';
import scope from '@/assets/images/carbonFootprint3/uncertainty-analysis/scope.svg';
import search from '@/assets/images/carbonFootprint3/uncertainty-analysis/search.svg';
import styles from './index.module.less';

const icons = {
  batchSelect,
  calculate,
  close,
  configure,
  description,
  edit,
  filter,
  info,
  plus,
  quality,
  scope,
  search,
};

/** 本次分析页面的 Figma 原始图标，保留资源自身尺寸。 */
export function AnalysisIcon({ name }: { name: keyof typeof icons }) {
  return <img className={styles.icon} src={icons[name]} alt='' aria-hidden />;
}
