export interface MetricData {
  label: string;
  value: number;
  previousValue: number;
  change: number;
  responseCount: number;
  previousResponseCount: number;
}

const mockData = {
  metrics: {
    "Law Overall Value": {
      label: "Law Overall Value",
      value: 78,
      previousValue: 65,
      change: 13,
      responseCount: 1326,
      previousResponseCount: 1188
    },
    "Law Core Deliverables": {
      label: "Law Core Deliverables",
      value: 74,
      previousValue: 65,
      change: 9,
      responseCount: 1188,
      previousResponseCount: 1245
    },
    "Law Service Dimensions": {
      label: "Law Service Dimensions",
      value: 69,
      previousValue: 61,
      change: 8,
      responseCount: 1245,
      previousResponseCount: 1099
    },
    "Law Impact": {
      label: "Law Impact",
      value: 56,
      previousValue: 51,
      change: 4,
      responseCount: 1099,
      previousResponseCount: 1099
    }
  },
  impactChart: {
    categories: ["Financial cost", "Business value", "Business goals", "Improved work", "Breakthrough in"],
    currentYear: [48, 72, 53, 49, 52],
    previousYear: [43, 64, 45, 42, 45],
  },
  favorableItems: [
    {
      id: "L11",
      label: "Integrity and compliance",
      score: 85,
      gap: 2
    },
    {
      id: "L12",
      label: "Intellectual property",
      score: 83,
      gap: 1
    },
    {
      id: "L21",
      label: "Possesses required knowledge and skills (LAW)",
      score: 82,
      gap: 2
    }
  ],
  unfavorableItems: [
    {
      id: "L27",
      label: "Financial cost savings",
      score: 21,
      gap: -3
    },
    {
      id: "L31",
      label: "Breakthrough initiatives",
      score: 19,
      gap: -5
    },
    {
      id: "L30",
      label: "Improved working capital",
      score: 16,
      gap: -4
    }
  ]
};

export const getWidgetDataLabels = () => {
  const labels = ['Law Overall Value', 'Law Core Deliverables', 'Law Service Dimensions', 'Law Impact', 'Most Favorable Items', 'Most Unfavorable Items'];
  return labels;
};

export const getDataBasedOnALabel = (label: string) => {
  switch (label) {
    case 'Law Overall Value':
      return mockData.metrics['Law Overall Value'];
    case 'Law Core Deliverables':
      return mockData.metrics['Law Core Deliverables'];
    case 'Law Service Dimensions':
      return mockData.metrics['Law Service Dimensions'];
    case 'Law Impact':
      return mockData.metrics['Law Impact'];
    case 'Most Favorable Items':
      return mockData.favorableItems;
    case 'Most Unfavorable Items':
      return mockData.unfavorableItems;
  }
  
  
};

export default mockData;

