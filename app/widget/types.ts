// A base type for common fields across many data items
export type BaseDataItem = {
  dimensionId: number;
  dimensionName: string;
  dimensionOrder: number;
  isDimension: boolean;
  directionId: number;
  questionOrder: number;
  numberAsText: string;
  questionText: string;
  questionId: number;
  datalineId: number;
  datalineName: string;
  datalineName2: string;
  datalineResponseCount: number;
  datalineResponseRate: number;
  datalineType: number;
  totalCount: number;
  favorable: number;
  neutral: number;
  unfavorable: number;
  veryFavorable: number;
  overallFavorable: number;
  veryUnfavorable: number;
  overallUnfavorable: number;
  trend: number | null;
  datalineOrder: number;
  column1: number | null;
  column2: number | null;
  column3: number | null;
  column4: number | null;
  column5: number | null;
  column1Name: string;
  column2Name: string;
  column3Name: string;
  column4Name: string;
  column5Name: string;
  column1Significant: number;
  column2Significant: number;
  column3Significant: number;
  column4Significant: number;
  column5Significant: number;
  column1isDifference: boolean;
  column2isDifference: boolean;
  column3isDifference: boolean;
  column4isDifference: boolean;
  column5isDifference: boolean;
  column1isDashboard: boolean;
  column2isDashboard: boolean;
  column3isDashboard: boolean;
  column4isDashboard: boolean;
  column5isDashboard: boolean;
  datalineCount: number;
  minN: number;
  isKeyDriver: boolean;
  reportTypeId: number;
  orderId: number;
  overallSignificant: number;
  overallFavOrderBy: number;
  neutralOrderBy: number;
  overallUnfavOrderBy: number;
  backgroundColor: string;
  foreColor: string;
  isClickable: boolean;
  numResponse: number;
  responseText: string | null;
  responseCount: number;
  responseOrder: number;
  percentage: number;
  percentOrderBy: number;
  veryFavCount: number;
  favCount: number;
  neutCount: number;
  unfavCount: number;
  veryUnfavCount: number;
  overallFavCount: number;
  overallUnfavCount: number;
  trendSignificant: number;
};

// Overview.json types
export type OverviewItem = BaseDataItem; // Slider items
export type ActionItem = BaseDataItem;
export type MostFavorableItem = BaseDataItem;
export type MostUnfavorableItem = BaseDataItem;
export type MostImprovedItem = BaseDataItem;
export type KeyDriver = BaseDataItem;
export type DimensionDetail = BaseDataItem;

export type ResponseRate = Omit<BaseDataItem, "trend"> & {
  headCount: number;
  filters: null;
  responseCountOverall: number;
  headCountOverall: number;
  responseRateOverall: number;
  showOverallResponseRate: boolean;
  trend: number | null | string; // It's null in the example
};

export type OverviewData = {
  Overview: {
    items: {
      Slider: OverviewItem[];
      ActionItems: ActionItem[];
      ResponseRate: ResponseRate;
      MostFavorableItems: MostFavorableItem[];
      MostUnfavorableItems: MostUnfavorableItem[];
      MostImprovedItems: MostImprovedItem[];
      MostDeclinedItems: any[]; // It's empty in the example
      KeyDrivers: KeyDriver[];
      DimensionDetail: DimensionDetail[];
    };
    modules: string[];
  };
};

// Dimensions.json types
export type Dimension = BaseDataItem & {
  nComments: number;
  nRespondents: number;
  responseRate: number;
  averageUQ: null;
  positiveScore: null;
  highlyActionableFav: number;
  moderatelyActionableFav: number;
  someWhatActionableFav: number;
  neutralScore: number;
  negativeScore: number;
  comment: null;
  translation: null;
  theme: null;
  uqScore: number;
  countTheme: number;
  percentageTheme: number;
  totalCountComments: number;
  lexRankId: number;
  order: number;
  score: number;
  id: number;
  text: null;
  guid: null;
  questionTypeId: number;
};

export type DimensionsData = {
  Dimensions: Dimension[];
};

// Heatmap.json types
export type HeatmapColumn = {
  dimensionName: string;
  name: string;
  responseCount: number;
  responseRate: number;
  subGroups: any[];
};

export type DatalineName = {
  dataLineName: string;
  dataLineName2: string;
  responseCount: number;
  responseRate: number;
};

export type HeatmapRow = {
  dimensionId: number;
  dimension: string;
  dimensionOrder: number;
  isDimension: boolean;
  questionId: number;
  questionText: string;
  questionOrder: number;
  numberAsText: string;
  minN: number;
  datalineNames: DatalineName[];
  totalCounts: number[];
  scores: number[];
  significantValues: number[];
  datalineIds: number[];
  datalineCount: number;
  totalCount: number;
  trends: (number | null)[];
  trendSignificantValues: number[];
};

export type HeatmapData = {
  Heatmap: {
    columns: HeatmapColumn[];
    rows: HeatmapRow[];
  };
};

// Questions.json types
export type Question = Dimension; // The structure is identical to Dimension

export type QuestionsData = {
  Questions: Question[];
};
