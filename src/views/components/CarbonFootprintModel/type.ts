import type {
  ProcessIn as SubmoduleProcessIn,
  ProcessInExpandData as SubmoduleProcessInExpandData,
} from '@/views/subModules/CarbonFootprintModel/BuildModel/ProcessList/type';
import type {
  EmissionFormDataSource as SubmoduleEmissionFormDataSource,
  ModelEmissionData as SubmoduleModelEmissionData,
} from '@/views/subModules/CarbonFootprintModel/type';

export type { InfoData, OptionsTypesData } from '@/views/subModules/CarbonFootprintModel/type';

// 主仓库承接排放源描述类型，复用模型子模块原契约，不修改子模块声明。
export interface ModelEmissionData extends SubmoduleModelEmissionData {
  /** 排放源描述，上限200字，独立于备注。 */
  emissionSourceDescription?: string;
}

export interface EmissionFormDataSource extends SubmoduleEmissionFormDataSource {
  /** 排放源描述，上限200字，独立于备注。 */
  emissionSourceDescription?: string;
}

export interface ProcessInExpandData extends SubmoduleProcessInExpandData {
  /** 排放源描述，独立于备注，上限200字。 */
  emissionSourceDescription?: string;
}

export type ProcessIn = Omit<SubmoduleProcessIn, 'childeren'> & {
  /** 排放源描述，独立于备注，上限200字。 */
  emissionSourceDescription?: string;
  childeren?: ProcessInExpandData[];
};
