
export interface SubjectGrade {
  id: string;
  name: string;
  grade: string;
}

export interface CareerRecommendation {
  title: string;
  description: string;
  whyFit: string;
  nextSteps: string[];
  growthPotential: 'High' | 'Medium' | 'Low';
}

export interface RecommendationResponse {
  recommendations: CareerRecommendation[];
  overallSummary: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
