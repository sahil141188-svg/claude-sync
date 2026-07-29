export type UserRole = 'caregiver' | 'patient';
export type MedicineSlot = 'morning' | 'afternoon' | 'night' | 'custom';
export type FoodRelation = 'before_food' | 'after_food' | 'any';
export type SugarType = 'fasting' | 'pp' | 'random';
export type ExerciseType = 'walking' | 'yoga' | 'cycling' | 'meditation' | 'other';
export type ReportStatus = 'improving' | 'needs_attention' | 'critical';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
}

export interface Medicine {
  id: string;
  name: string;
  slots: MedicineSlot[];
  custom_time: string | null;
  food_relation: FoodRelation;
  quantity: string;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  color_tag: string;
  doctor_name: string | null;
  stock_count: number | null;
  low_stock_threshold: number;
  expiry_date: string | null;
  archived: boolean;
  created_at: string;
}

export interface MedicineLog {
  id: string;
  medicine_id: string;
  log_date: string;
  slot: MedicineSlot;
  scheduled_at: string;
  taken: boolean;
  taken_at: string | null;
  reminder_15_sent: boolean;
  reminder_45_sent: boolean;
  caregiver_alert_sent: boolean;
  medicines?: Medicine;
}

export interface SugarReading {
  id: string;
  value: number;
  reading_type: SugarType;
  measured_at: string;
  notes: string | null;
}

export interface BpReading {
  id: string;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measured_at: string;
  notes: string | null;
}

export interface WeightReading {
  id: string;
  weight_kg: number;
  height_cm: number | null;
  bmi: number | null;
  measured_at: string;
}

export interface WaterLog {
  id: string;
  log_date: string;
  glasses: number;
  goal_glasses: number;
}

export interface ExerciseLog {
  id: string;
  exercise_type: ExerciseType;
  duration_min: number;
  calories: number | null;
  log_date: string;
  notes: string | null;
}

export interface PrescriptionFile {
  id: string;
  file_path: string;
  file_type: string;
  doctor_name: string | null;
  prescribed_on: string | null;
  ocr_done: boolean;
  created_at: string;
}

export interface ExtractedMedicine {
  id: string;
  prescription_id: string;
  name: string;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  dose: string | null;
  duration_days: number | null;
  applied: boolean;
}

export interface AiReport {
  id: string;
  report_date: string;
  status: ReportStatus;
  health_score: number;
  summary: string;
  recommendations: string[];
}

export interface EmergencyContact {
  id: string;
  label: string;
  name: string;
  phone: string;
  kind: string;
  sort_order: number;
}

export interface AppSettings {
  id: number;
  dark_mode: boolean;
  notifications_enabled: boolean;
  whatsapp_enabled: boolean;
  language: 'hi' | 'en';
  font_scale: 'normal' | 'large' | 'xl';
  water_goal_glasses: number;
}

export interface DoctorVisit {
  id: string;
  doctor_name: string;
  visit_date: string;
  notes: string | null;
  next_visit_date: string | null;
}
