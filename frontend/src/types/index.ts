export type ConditionStatus = 'Healthy' | 'Defective' | 'Uncertain'

export interface Inspection {
  _id?: string
  inspection_id: string
  image_filename: string
  original_image_path: string
  annotated_image_path?: string
  predicted_category: string
  raw_class?: string
  class_probabilities: Record<string, number>
  confidence_score: number
  inspection_status: ConditionStatus
  healthy_or_defective: ConditionStatus
  risk_level: string
  recommendation: string
  model_version: string
  inspection_timestamp: string
  inspection_notes?: string
}

export interface InspectionsResponse {
  total: number
  skip: number
  limit: number
  items: Inspection[]
}

export interface DailyTrend {
  _id: string
  count: number
  defective: number
  healthy: number
}

export interface DashboardMetrics {
  total_inspections: number
  healthy_panels: number
  defective_panels: number
  uncertain_panels: number
  fault_detection_rate: number
  average_confidence: number
  model_accuracy: number
  category_distribution: Record<string, number>
  daily_trends: DailyTrend[]
}

export interface ModelPerformance {
  model_name: string
  model_version: string
  architecture: string
  training_date: string
  dataset_information?: {
    dataset_name: string
    total_samples: number
    classes: string[]
    input_resolution: number[]
    split_ratio: string
  }
  model_path: string
  evaluation_metrics: {
    test_accuracy: number
    macro_precision: number
    macro_recall: number
    macro_f1: number
    weighted_f1: number
    classification_report: Record<string, {
      precision: number
      recall: number
      'f1-score': number
      support: number
    }>
    confusion_matrix: number[][]
  }
  training_history?: {
    epochs: number[]
    train_acc: number[]
    val_acc: number[]
    train_loss: number[]
    val_loss: number[]
  }
  deployment_status: string
}

export interface HealthStatus {
  status: string
  database_connected: boolean
  database_type: string
  model_loaded: boolean
  model_version: string
  device: string
}

