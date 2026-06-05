export type TrainingType =
  | 'Yoga' | 'HIIT' | 'Strength' | 'Pilates' | 'CrossFit'
  | 'Stretching' | 'Bodybuilding' | 'Functional'
  | 'Spinning' | 'Boxing' | 'Dance' | 'TRX' | 'Meditation' | 'Aqua'
  | 'Other';

export type BookingStatus = 'Confirmed' | 'Cancelled' | 'Rescheduled';
export type NotificationType =
  | 'Reminder' | 'ScheduleChange' | 'FreeSpot' | 'Promotion'
  | 'LowEnrollment' | 'TrainerReminder' | 'ScheduleConfirmation';
export type ReviewTarget = 'Gym' | 'Training' | 'Trainer';
export type StaffRole = 'Admin' | 'Trainer';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  phone: string;
  membershipId?: number;
}

export interface Staff {
  id: number;
  gymId: number;
  name: string;
  email: string;
  role: StaffRole;
  available: boolean;
}

export interface Gym {
  id: number;
  name: string;
  address: string;
  description: string;
  connected: boolean;
}

export interface Training {
  id: number;
  gymId: number;
  title: string;
  trainer: string;
  description: string;
  dateTime: string;
  type: TrainingType;
  durationMinutes: number;
  maxParticipants: number;
  currentParticipants: number;
  minParticipants: number;
  bookingDeadlineHours: number;
  price: number;
}

export interface Booking {
  id: number;
  userId: number;
  trainingId: number;
  status: BookingStatus;
  createdAt: string;
}

export interface Membership {
  id: number;
  clientId: number;
  typeName: string;
  totalSessions: number;
  bookedSessions: number;
  returnedSessions: number;
  validUntil: string;
  active: boolean;
}

export interface Notification {
  id: number;
  recipientEmail: string;
  type: NotificationType;
  message: string;
  sentAt: string;
  read: boolean;
}

export interface Review {
  id: number;
  target: ReviewTarget;
  targetId: number;
  targetName: string;
  authorName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface TrainerProfile {
  name: string;
  qualifications: string;
  certificates: string[];
  averageRating: number;
  reviewCount: number;
  gymId?: number;
  available: boolean;
}

export interface FaqEntry {
  question: string;
  answer: string;
}

export interface ReminderSettings {
  before24h: boolean;
  before2h: boolean;
  before30m: boolean;
}

export interface NotificationPreferences {
  reminders: boolean;
  scheduleChanges: boolean;
  freeSpots: boolean;
  promotions: boolean;
  slotAlerts: boolean;
  newWorkouts: boolean;
  reminderTimes: ReminderSettings;
}

export interface TrainingFilter {
  trainer?: string;
  type?: TrainingType;
  gymId?: number;
  keyword?: string;
  date?: string;
  timeOfDay?: TimeOfDay;
  onlyAvailable?: boolean;
}

export interface SupportTicket {
  id: number;
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  escalated: boolean;
  status: string;
  createdAt: string;
}

export const TRAINING_TYPE_LABELS: Record<TrainingType, string> = {
  Yoga: 'Йога',
  HIIT: 'HIIT',
  Strength: 'Силове',
  Pilates: 'Пілатес',
  CrossFit: 'CrossFit',
  Stretching: 'Стретчинг',
  Bodybuilding: 'Бодібілдинг',
  Functional: 'Функціональне',
  Spinning: 'Спінінг',
  Boxing: 'Бокс',
  Dance: 'Танці',
  TRX: 'TRX',
  Meditation: 'Медитація',
  Aqua: 'Аквааеробіка',
  Other: 'Інше',
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  reminders: true,
  scheduleChanges: true,
  freeSpots: true,
  promotions: false,
  slotAlerts: true,
  newWorkouts: false,
  reminderTimes: { before24h: true, before2h: true, before30m: false },
};
