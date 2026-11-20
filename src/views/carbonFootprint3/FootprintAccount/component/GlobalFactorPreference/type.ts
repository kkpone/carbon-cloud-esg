export type FactorSourceId = string | number;

export type FactorDatabaseSourceOption = {
  id: FactorSourceId;
  name: string;
};

export type StageSourceIds = Partial<
  Record<0 | 1 | 2 | 3 | 4, FactorSourceId[] | null>
>;
export type SourceItem = {
  sourceMainId: FactorSourceId;
  sourceName: string;
  priority: number;
};
export type SourceConfiguration = {
  stageEnabled: 0 | 1;
  sourceIds: FactorSourceId[];
  stageSourceIds: StageSourceIds;
};

export type GlobalFactorPreferencePlan = SourceConfiguration & {
  id: number;
  name: string;
  sourceIds: FactorSourceId[];
  sourceNames: string;
  remark?: string;
  published: boolean;
  isDefault: boolean;
  sourceItems?: SourceItem[];
  stageSourceItems?: Partial<Record<0 | 1 | 2 | 3 | 4, SourceItem[]>>;
};

export type GlobalFactorPreferenceFormValues = {
  name: string;
  stageEnabled: 0 | 1;
  sourceIds?: FactorSourceId[];
  stageSourceIds?: StageSourceIds;
  remark?: string;
};
