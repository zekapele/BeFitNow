import type {
  BlacklistEntry, Booking, BookingStatusBreakdown, BookingTrends, ClientRecord, FaqEntry, Gym,
  Membership, Notification, NotificationPreferences, NotificationType, PaymentMethod, PaymentRecord,
  PaymentStats, PortalKPIs, Review, ReviewTarget, SlotComment, Staff, SupportTicket, TrainerProfile,
  Training, TrainingFilter, TrainingType, User, WaitlistEntry,
} from '../types';
import { DEFAULT_NOTIFICATION_PREFS } from '../types';
import { haversineKm } from '../utils/geo';

/** Демо-поточний час для перевірок «за 4 год» та скасування */
export const DEMO_NOW = '2026-06-05 14:00';

function now() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
}

function parseDateTime(dateTime: string) {
  return new Date(dateTime.replace(' ', 'T')).getTime();
}

function contains(hay: string, needle: string) {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function getHour(dateTime: string) {
  return parseInt(dateTime.split(' ')[1]?.split(':')[0] ?? '12');
}

function matchesTimeOfDay(dateTime: string, timeOfDay?: TrainingFilter['timeOfDay']) {
  if (!timeOfDay) return true;
  const h = getHour(dateTime);
  if (timeOfDay === 'morning') return h >= 6 && h < 12;
  if (timeOfDay === 'afternoon') return h >= 12 && h < 17;
  if (timeOfDay === 'evening') return h >= 17 || h < 6;
  return true;
}

interface SessionTemplate {
  gymId: number;
  title: string;
  trainer: string;
  description: string;
  type: TrainingType;
  durationMinutes: number;
  maxParticipants: number;
  minParticipants: number;
  price: number;
  time: string;
  days: number[]; // 0=Нд, 1=Пн, … 6=Сб; порожній = щодня
}

const SESSION_TEMPLATES: SessionTemplate[] = [
  { gymId: 1, title: 'Ранкова йога', trainer: 'Олена Коваль', description: "М'яка практика для всіх рівнів", type: 'Yoga', durationMinutes: 60, maxParticipants: 15, minParticipants: 3, price: 250, time: '08:00', days: [1, 3, 5, 6] },
  { gymId: 1, title: 'Вечірня йога', trainer: 'Олена Коваль', description: 'Розслаблення після робочого дня', type: 'Yoga', durationMinutes: 55, maxParticipants: 15, minParticipants: 3, price: 240, time: '20:00', days: [1, 2, 3, 4, 5] },
  { gymId: 1, title: 'HIIT інтенсив', trainer: 'Андрій Мельник', description: 'Інтенсивне спалювання калорій', type: 'HIIT', durationMinutes: 45, maxParticipants: 12, minParticipants: 4, price: 300, time: '18:00', days: [2, 4] },
  { gymId: 1, title: 'Обідній HIIT', trainer: 'Андрій Мельник', description: 'Швидке тренування на обідній перерві', type: 'HIIT', durationMinutes: 35, maxParticipants: 14, minParticipants: 4, price: 220, time: '13:30', days: [1, 2, 3, 4, 5] },
  { gymId: 1, title: 'Силове тренування', trainer: 'Віктор Шевченко', description: 'Робота з вагою та технікою', type: 'Strength', durationMinutes: 90, maxParticipants: 10, minParticipants: 3, price: 350, time: '10:00', days: [1, 4] },
  { gymId: 1, title: 'Спінінг', trainer: 'Андрій Мельник', description: 'Велотренування під музику', type: 'Spinning', durationMinutes: 45, maxParticipants: 18, minParticipants: 4, price: 280, time: '12:00', days: [0, 6] },
  { gymId: 1, title: 'Спінінг вечірній', trainer: 'Андрій Мельник', description: 'Інтенсивна велосипедна сесія', type: 'Spinning', durationMinutes: 45, maxParticipants: 18, minParticipants: 4, price: 280, time: '19:30', days: [2, 4, 6] },
  { gymId: 2, title: 'Бодібілдинг', trainer: 'Ігор Бондар', description: 'Гіпертрофія та ізоляційні вправи', type: 'Bodybuilding', durationMinutes: 120, maxParticipants: 8, minParticipants: 4, price: 400, time: '09:00', days: [2, 5] },
  { gymId: 2, title: 'Кеттлбел', trainer: 'Ігор Бондар', description: 'Силові комплекси з гирями', type: 'Strength', durationMinutes: 60, maxParticipants: 12, minParticipants: 3, price: 300, time: '11:30', days: [1, 3, 5] },
  { gymId: 2, title: 'Функціональний тренінг', trainer: 'Марія Лисенко', description: 'Рухи на витривалість і мобільність', type: 'Functional', durationMinutes: 60, maxParticipants: 14, minParticipants: 3, price: 280, time: '17:00', days: [3, 6] },
  { gymId: 2, title: 'Степ-аеробіка', trainer: 'Марія Лисенко', description: 'Кардіо на платформах', type: 'Functional', durationMinutes: 50, maxParticipants: 16, minParticipants: 4, price: 250, time: '16:00', days: [1, 2, 4, 5] },
  { gymId: 2, title: 'Бокс для початківців', trainer: 'Костянтин Орлов', description: 'Техніка ударів і робота в парах', type: 'Boxing', durationMinutes: 60, maxParticipants: 12, minParticipants: 4, price: 320, time: '19:00', days: [1, 3, 5] },
  { gymId: 2, title: 'Ранковий функціонал', trainer: 'Марія Лисенко', description: 'Розминка та мобільність', type: 'Functional', durationMinutes: 45, maxParticipants: 14, minParticipants: 3, price: 230, time: '07:00', days: [1, 2, 3, 4, 5] },
  { gymId: 3, title: 'Пілатес', trainer: 'Наталія Гринько', description: 'Зміцнення кору та постави', type: 'Pilates', durationMinutes: 55, maxParticipants: 12, minParticipants: 2, price: 270, time: '11:00', days: [] },
  { gymId: 3, title: 'Пілатес вечірній', trainer: 'Наталія Гринько', description: "М'яке зміцнення після роботи", type: 'Pilates', durationMinutes: 50, maxParticipants: 12, minParticipants: 2, price: 260, time: '18:30', days: [1, 3, 5] },
  { gymId: 3, title: 'Power Yoga', trainer: 'Олена Коваль', description: 'Динамічна йога для досвідчених', type: 'Yoga', durationMinutes: 65, maxParticipants: 14, minParticipants: 3, price: 290, time: '09:30', days: [2, 4, 6] },
  { gymId: 3, title: 'Стретчинг', trainer: 'Юлія Савченко', description: 'Розтяжка та відновлення', type: 'Stretching', durationMinutes: 45, maxParticipants: 20, minParticipants: 2, price: 200, time: '19:00', days: [2, 4, 0] },
  { gymId: 3, title: 'Медитація та дихання', trainer: 'Олена Коваль', description: 'Спокійний старт дня', type: 'Meditation', durationMinutes: 40, maxParticipants: 25, minParticipants: 2, price: 180, time: '07:30', days: [] },
  { gymId: 3, title: 'Йога-флоу неділя', trainer: 'Олена Коваль', description: 'Повільний флоу на вихідні', type: 'Yoga', durationMinutes: 75, maxParticipants: 18, minParticipants: 3, price: 280, time: '10:00', days: [0] },
  { gymId: 4, title: 'CrossFit WOD', trainer: 'Дмитро Кравець', description: 'Workout of the Day', type: 'CrossFit', durationMinutes: 60, maxParticipants: 16, minParticipants: 5, price: 320, time: '07:00', days: [1, 2, 3, 4, 5, 6] },
  { gymId: 4, title: 'CrossFit вечірній', trainer: 'Дмитро Кравець', description: 'Інтенсивний WOD після роботи', type: 'CrossFit', durationMinutes: 55, maxParticipants: 16, minParticipants: 5, price: 310, time: '20:00', days: [1, 3, 5] },
  { gymId: 4, title: 'TRX функціонал', trainer: 'Дмитро Кравець', description: 'Тренування з петлями TRX', type: 'TRX', durationMinutes: 50, maxParticipants: 10, minParticipants: 3, price: 300, time: '13:00', days: [3, 5] },
  { gymId: 4, title: 'TRX ранковий', trainer: 'Дмитро Кравець', description: 'TRX на початок дня', type: 'TRX', durationMinutes: 45, maxParticipants: 10, minParticipants: 3, price: 280, time: '09:00', days: [2, 4, 6] },
  { gymId: 4, title: 'Важка атлетика', trainer: 'Сергій Ткаченко', description: 'Ривок, поштовх, техніка', type: 'Strength', durationMinutes: 90, maxParticipants: 10, minParticipants: 4, price: 380, time: '16:00', days: [2, 4] },
  { gymId: 4, title: 'Ранковий біг', trainer: 'Сергій Ткаченко', description: 'Інтервальний біг та мобільність', type: 'Functional', durationMinutes: 50, maxParticipants: 20, minParticipants: 4, price: 200, time: '06:30', days: [1, 3, 5] },
  { gymId: 5, title: 'Бокс-паддл', trainer: 'Костянтин Орлов', description: 'Інтенсив на груші та лапах', type: 'Boxing', durationMinutes: 55, maxParticipants: 14, minParticipants: 4, price: 310, time: '18:00', days: [] },
  { gymId: 5, title: 'Кікбокс', trainer: 'Костянтин Орлов', description: 'Удари ногами та руками', type: 'Boxing', durationMinutes: 60, maxParticipants: 12, minParticipants: 4, price: 330, time: '17:30', days: [2, 4, 6] },
  { gymId: 5, title: 'Zumba / танці', trainer: 'Аліна Руденко', description: 'Енергійні танцювальні рухи', type: 'Dance', durationMinutes: 50, maxParticipants: 22, minParticipants: 5, price: 240, time: '20:00', days: [2, 4, 6] },
  { gymId: 5, title: 'Танці ранок', trainer: 'Аліна Руденко', description: 'Легкий кардіо-танець', type: 'Dance', durationMinutes: 45, maxParticipants: 20, minParticipants: 4, price: 220, time: '10:30', days: [0, 6] },
  { gymId: 5, title: 'Ранковий HIIT', trainer: 'Андрій Мельник', description: 'Швидкий старт дня', type: 'HIIT', durationMinutes: 40, maxParticipants: 15, minParticipants: 4, price: 260, time: '07:00', days: [1, 3] },
  { gymId: 5, title: 'Tabata', trainer: 'Андрій Мельник', description: '4 хвилини максимального навантаження', type: 'HIIT', durationMinutes: 30, maxParticipants: 16, minParticipants: 4, price: 200, time: '14:00', days: [1, 2, 3, 4, 5] },
  { gymId: 6, title: 'Аквааеробіка', trainer: 'Світлана Мороз', description: 'Тренування у басейні', type: 'Aqua', durationMinutes: 45, maxParticipants: 16, minParticipants: 4, price: 290, time: '15:00', days: [1, 3, 5] },
  { gymId: 6, title: 'Аква-йога', trainer: 'Світлана Мороз', description: 'Йога у воді для мобільності', type: 'Aqua', durationMinutes: 50, maxParticipants: 12, minParticipants: 3, price: 310, time: '12:00', days: [0, 6] },
  { gymId: 6, title: 'Аква вечір', trainer: 'Світлана Мороз', description: 'Розслаблююча аквааеробіка', type: 'Aqua', durationMinutes: 45, maxParticipants: 14, minParticipants: 3, price: 280, time: '18:00', days: [2, 4] },
  { gymId: 6, title: 'Аква для початківців', trainer: 'Світлана Мороз', description: "М'яке тренування у воді", type: 'Aqua', durationMinutes: 40, maxParticipants: 18, minParticipants: 3, price: 250, time: '10:00', days: [1, 3, 5, 6] },
  { gymId: 6, title: 'Вільне плавання', trainer: '—', description: 'Басейн без тренера — вільний слот', type: 'Aqua', durationMinutes: 60, maxParticipants: 20, minParticipants: 1, price: 180, time: '16:00', days: [0, 1, 2, 3, 4, 5, 6] },
  // Дніпро
  { gymId: 7, title: 'Ранкова йога', trainer: 'Тетяна Бондар', description: 'Йога для всіх рівнів', type: 'Yoga', durationMinutes: 60, maxParticipants: 14, minParticipants: 3, price: 230, time: '08:00', days: [1, 3, 5] },
  { gymId: 7, title: 'HIIT Дніпро', trainer: 'Роман Коваль', description: 'Інтенсивне кардіо', type: 'HIIT', durationMinutes: 45, maxParticipants: 12, minParticipants: 4, price: 270, time: '18:00', days: [2, 4, 6] },
  { gymId: 8, title: 'Силове', trainer: 'Роман Коваль', description: 'Робота з вагою', type: 'Strength', durationMinutes: 75, maxParticipants: 10, minParticipants: 3, price: 300, time: '10:00', days: [1, 4] },
  { gymId: 8, title: 'CrossFit WOD', trainer: 'Роман Коваль', description: 'Функціональний WOD', type: 'CrossFit', durationMinutes: 60, maxParticipants: 14, minParticipants: 4, price: 290, time: '07:30', days: [1, 2, 3, 4, 5] },
  { gymId: 9, title: 'Пілатес', trainer: 'Тетяна Бондар', description: 'Зміцнення кору', type: 'Pilates', durationMinutes: 55, maxParticipants: 12, minParticipants: 2, price: 250, time: '11:00', days: [] },
  { gymId: 9, title: 'Стретчинг', trainer: 'Тетяна Бондар', description: 'Розтяжка та мобільність', type: 'Stretching', durationMinutes: 45, maxParticipants: 18, minParticipants: 2, price: 190, time: '19:00', days: [2, 4, 0] },
  // Львів
  { gymId: 10, title: 'Йога ранок', trainer: 'Софія Мельник', description: 'М\'яка ранкова практика', type: 'Yoga', durationMinutes: 60, maxParticipants: 15, minParticipants: 3, price: 240, time: '08:30', days: [1, 3, 5, 6] },
  { gymId: 10, title: 'Спінінг', trainer: 'Софія Мельник', description: 'Велотренування', type: 'Spinning', durationMinutes: 45, maxParticipants: 16, minParticipants: 4, price: 260, time: '12:00', days: [2, 4] },
  { gymId: 11, title: 'Бодібілдинг', trainer: 'Тарас Гринько', description: 'Силовий тренінг', type: 'Bodybuilding', durationMinutes: 90, maxParticipants: 8, minParticipants: 3, price: 350, time: '09:00', days: [2, 5] },
  { gymId: 11, title: 'Функціонал', trainer: 'Тарас Гринько', description: 'Функціональні рухи', type: 'Functional', durationMinutes: 55, maxParticipants: 14, minParticipants: 3, price: 260, time: '17:30', days: [1, 3, 5] },
  // Одеса
  { gymId: 12, title: 'Йога біля моря', trainer: 'Вікторія Лебедєва', description: 'Йога з видом на море', type: 'Yoga', durationMinutes: 65, maxParticipants: 16, minParticipants: 3, price: 280, time: '09:00', days: [1, 2, 3, 4, 5, 6] },
  { gymId: 12, title: 'Zumba', trainer: 'Вікторія Лебедєва', description: 'Танцювальне кардіо', type: 'Dance', durationMinutes: 50, maxParticipants: 20, minParticipants: 4, price: 230, time: '19:00', days: [2, 4, 6] },
  { gymId: 13, title: 'Аквааеробіка', trainer: 'Олег Морозов', description: 'Тренування у басейні', type: 'Aqua', durationMinutes: 45, maxParticipants: 16, minParticipants: 4, price: 300, time: '14:00', days: [1, 3, 5, 6] },
  { gymId: 13, title: 'Аква-йога', trainer: 'Олег Морозов', description: 'Йога у воді', type: 'Aqua', durationMinutes: 50, maxParticipants: 12, minParticipants: 3, price: 320, time: '11:00', days: [0, 6] },
];

const SCHEDULE_MONTHS = [
  { year: 2026, month: 6 },
  { year: 2026, month: 7 },
  { year: 2026, month: 8 },
];

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function buildScheduleTrainings(): Training[] {
  const out: Training[] = [];
  let id = 1;
  for (const { year, month } of SCHEDULE_MONTHS) {
    const totalDays = daysInMonth(year, month);
    for (let day = 1; day <= totalDays; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dow = new Date(year, month - 1, day).getDay();
      for (const s of SESSION_TEMPLATES) {
        if (s.days.length && !s.days.includes(dow)) continue;
        out.push({
          id: id++,
          gymId: s.gymId,
          title: s.title,
          trainer: s.trainer,
          description: s.description,
          dateTime: `${date} ${s.time}`,
          type: s.type,
          durationMinutes: s.durationMinutes,
          maxParticipants: s.maxParticipants,
          currentParticipants: 0,
          minParticipants: s.minParticipants,
          bookingDeadlineHours: 2,
          price: s.price,
        });
      }
    }
  }
  const yogaJune10 = out.find(t => t.dateTime === '2026-06-10 08:00' && t.title === 'Ранкова йога');
  if (yogaJune10) yogaJune10.currentParticipants = 1;
  return out;
}

const SCHEDULE_TRAININGS = buildScheduleTrainings();

class BeFitNowService {
  private users: User[] = [
    { id: 1, name: 'Марія Іваненко', email: 'maria@mail.ua', password: '1234', phone: '+380501112233', membershipId: 1 },
    { id: 2, name: 'Петро Сидоренко', email: 'petro@mail.ua', password: '1234', phone: '+380672223344' },
  ];
  private staff: Staff[] = [
    { id: 1, gymId: 1, name: 'Олена Коваль', email: 'olena@fitzone.ua', role: 'Trainer', available: true },
    { id: 2, gymId: 1, name: 'Андрій Мельник', email: 'andriy@fitzone.ua', role: 'Trainer', available: true },
    { id: 3, gymId: 1, name: 'Анна Адмін', email: 'admin@befitnow.com', role: 'Admin', available: true },
    { id: 4, gymId: 2, name: 'Ігор Бондар', email: 'igor@powergym.kyiv.ua', role: 'Trainer', available: true },
    { id: 5, gymId: 3, name: 'Наталія Гринько', email: 'natalia@yogaspace.kyiv.ua', role: 'Trainer', available: true },
    { id: 6, gymId: 4, name: 'Дмитро Кравець', email: 'dmitro@crossfit.kyiv.ua', role: 'Trainer', available: true },
  ];
  private gyms: Gym[] = [
    {
      id: 1, name: 'FitZone', city: 'Київ', address: 'вул. Хрещатик, 15',
      description: 'Сучасний зал у центрі з зоною кросфіту', connected: true,
      latitude: 50.4478, longitude: 30.5232,
      lateCancelHours: 3, paymentOnline: true, paymentOnSite: true, googleRating: 4.7,
      rulesText: 'Скасування без штрафу за 3+ год до заняття. Оплата онлайн або на ресепшені.',
      crmConnected: true, crmProvider: 'Mindbody',
    },
    { id: 2, name: 'PowerGym', city: 'Київ', address: 'вул. Басейна, 3', description: 'Силові та функціональні тренування', connected: true, latitude: 50.4394, longitude: 30.5200 },
    { id: 3, name: 'YogaSpace', city: 'Київ', address: 'вул. Шевченка, 45', description: 'Йога, пілатес і медитація', connected: true, latitude: 50.4460, longitude: 30.5170 },
    { id: 4, name: 'CrossFit Arena', city: 'Київ', address: 'вул. Саксаганського, 30', description: 'Функціональні та CrossFit тренування', connected: true, latitude: 50.4320, longitude: 30.5080 },
    { id: 5, name: 'IronBox', city: 'Київ', address: 'пр. Перемоги, 67', description: 'Бокс, HIIT і танцювальні класи', connected: true, latitude: 50.4540, longitude: 30.4900 },
    { id: 6, name: 'AquaFit', city: 'Київ', address: 'вул. Еспланадна, 12', description: 'Аквааеробіка та аква-йога у басейні', connected: true, latitude: 50.4480, longitude: 30.5350 },
    { id: 7, name: 'FitZone', city: 'Дніпро', address: 'пр. Дмитра Яворницького, 50', description: 'Групові та функціональні тренування', connected: true, latitude: 48.4647, longitude: 35.0462 },
    { id: 8, name: 'SportLife', city: 'Дніпро', address: 'вул. Робоча, 150', description: 'Силові та CrossFit', connected: true, latitude: 48.4500, longitude: 35.0600 },
    { id: 9, name: 'YogaSpace', city: 'Дніпро', address: 'вул. Гусенка, 17', description: 'Йога, пілатес, стретчинг', connected: true, latitude: 48.4700, longitude: 35.0400 },
    { id: 10, name: 'FitZone', city: 'Львів', address: 'пр. Свободи, 28', description: 'Йога та кардіо', connected: true, latitude: 49.8420, longitude: 24.0280 },
    { id: 11, name: 'PowerGym', city: 'Львів', address: 'вул. Стрийська, 30', description: 'Силові та функціональні', connected: true, latitude: 49.8300, longitude: 24.0200 },
    { id: 12, name: 'FitZone', city: 'Одеса', address: 'вул. Дерибасівська, 12', description: 'Йога та танці', connected: true, latitude: 46.4840, longitude: 30.7320 },
    { id: 13, name: 'AquaFit', city: 'Одеса', address: 'вул. Ланжеронівська, 2', description: 'Аквааеробіка біля моря', connected: true, latitude: 46.4780, longitude: 30.7450, googleRating: 4.5 },
    { id: 14, name: 'FitZone', city: 'Харків', address: 'вул. Сумська, 72', description: 'Йога, функціонал і басейн', connected: true, latitude: 49.9935, longitude: 36.2304, googleRating: 4.4, lateCancelHours: 3, paymentOnline: true, paymentOnSite: true, rulesText: 'Скасування без штрафу за 3+ год.' },
  ];
  private trainings: Training[] = SCHEDULE_TRAININGS;
  private bookings: Booking[] = (() => {
    const yoga = SCHEDULE_TRAININGS.find(t => t.dateTime === '2026-06-10 08:00' && t.title === 'Ранкова йога');
    const crossfitJune10 = SCHEDULE_TRAININGS.find(t => t.dateTime === '2026-06-10 07:00' && t.title === 'CrossFit WOD');
    return [
      { id: 1, userId: 1, trainingId: yoga?.id ?? 1, status: 'Confirmed', createdAt: '2026-06-05 09:00' },
      { id: 99, userId: 1, trainingId: crossfitJune10?.id ?? 2, status: 'Cancelled', createdAt: '2026-05-20 14:00' },
    ];
  })();
  private memberships: Membership[] = [
    { id: 1, clientId: 1, typeName: 'Стандарт 12 занять', totalSessions: 12, bookedSessions: 1, returnedSessions: 0, validUntil: '2026-12-31', active: true },
  ];
  private notifications: Notification[] = [];
  private reviews: Review[] = [
    { id: 1, target: 'Gym', targetId: 1, targetName: 'FitZone Київ', authorName: 'Оксана', rating: 5, comment: 'Чистий зал, зручний запис.', createdAt: '2026-05-20' },
    { id: 2, target: 'Gym', targetId: 1, targetName: 'FitZone Київ', authorName: 'Іван', rating: 4, comment: 'Гарне обладнання.', createdAt: '2026-05-15' },
    { id: 3, target: 'Trainer', targetId: 0, targetName: 'Олена Коваль', authorName: 'Марта', rating: 5, comment: 'Професійна, рекомендую!', createdAt: '2026-05-18' },
  ];
  private trainerProfiles: TrainerProfile[] = [
    { name: 'Олена Коваль', qualifications: 'Сертифікований інструктор з йоги та медитації, 8 років', certificates: ['Yoga Alliance RYT-200'], averageRating: 4.8, reviewCount: 24, gymId: 1, available: true },
    { name: 'Андрій Мельник', qualifications: 'Тренер HIIT, спінінгу та функціонального тренінгу', certificates: ['NASM CPT'], averageRating: 4.6, reviewCount: 18, gymId: 1, available: true },
    { name: 'Віктор Шевченко', qualifications: 'Силовий тренер, 6 років досвіду', certificates: ['NSCA CSCS'], averageRating: 4.7, reviewCount: 19, gymId: 1, available: true },
    { name: 'Ігор Бондар', qualifications: 'Майстер спорту з бодібілдингу', certificates: ['ISSA Certified'], averageRating: 4.9, reviewCount: 31, gymId: 2, available: true },
    { name: 'Марія Лисенко', qualifications: 'Функціональний тренер', certificates: ['FMS Level 1'], averageRating: 4.5, reviewCount: 12, gymId: 2, available: true },
    { name: 'Костянтин Орлов', qualifications: 'Тренер з боксу, колишній чемпіон області', certificates: ['AIBA Coach'], averageRating: 4.8, reviewCount: 27, gymId: 5, available: true },
    { name: 'Наталія Гринько', qualifications: 'Інструктор пілатесу', certificates: ['Pilates Mat'], averageRating: 4.7, reviewCount: 15, gymId: 3, available: true },
    { name: 'Юлія Савченко', qualifications: 'Інструктор стретчингу та мобільності', certificates: ['Stretch Therapy'], averageRating: 4.6, reviewCount: 14, gymId: 3, available: true },
    { name: 'Дмитро Кравець', qualifications: 'Тренер CrossFit та TRX', certificates: ['CrossFit L2'], averageRating: 4.5, reviewCount: 22, gymId: 4, available: true },
    { name: 'Сергій Ткаченко', qualifications: 'Тренер важкої атлетики', certificates: ['UAF Weightlifting'], averageRating: 4.9, reviewCount: 16, gymId: 4, available: true },
    { name: 'Аліна Руденко', qualifications: 'Хореограф, інструктор Zumba', certificates: ['ZIN'], averageRating: 4.7, reviewCount: 33, gymId: 5, available: true },
    { name: 'Світлана Мороз', qualifications: 'Інструктор аквааеробіки', certificates: ['Aqua Fitness Pro'], averageRating: 4.6, reviewCount: 11, gymId: 6, available: true },
  ];
  private faq: FaqEntry[] = [
    { question: 'Як записатися?', answer: '«Знайти тренування» або «Поруч зі мною» → слот → підтвердіть деталі → оплата.' },
    { question: 'Як скасувати?', answer: 'У «Мої записи» — скасування. Менш ніж за 3 год — повна вартість.' },
    { question: 'Немає місць?', answer: 'Додайтеся до листа очікування — повідомимо, коли з\'явиться місце.' },
    { question: 'Як оплатити?', answer: 'Після підтвердження запису — кнопка «Оплатити». Оплату обробляє клуб.' },
    { question: 'Нагадування?', answer: 'У «Сповіщення» налаштуйте: за 24 год, 2 год або 30 хв. За 4 год — підтвердження візиту.' },
    { question: 'Як перенести запис?', answer: '«Мої записи» → оберіть запис → «Перенести» → новий слот.' },
    { question: 'Два тренування одночасно?', answer: 'Система попередить, якщо ви вже записані на той самий час.' },
  ];
  private supportTickets: SupportTicket[] = [];
  private waitlist: WaitlistEntry[] = [];
  private payments: PaymentRecord[] = [
    { id: 1, bookingId: 1, userId: 1, amount: 250, status: 'completed', method: 'membership', clubName: 'FitZone', createdAt: '2026-06-05 09:05' },
    { id: 2, bookingId: 0, userId: 2, amount: 300, status: 'completed', method: 'online', clubName: 'FitZone', createdAt: '2026-06-04 14:00' },
    { id: 3, bookingId: 0, userId: 2, amount: 280, status: 'completed', method: 'cash', clubName: 'PowerGym', createdAt: '2026-06-03 11:00' },
    { id: 4, bookingId: 0, userId: 1, amount: 240, status: 'completed', method: 'one_time', clubName: 'FitZone', createdAt: '2026-06-02 16:30' },
  ];
  private blacklist: BlacklistEntry[] = [];
  private slotComments: SlotComment[] = [];
  private staffScheduleConfirmations = new Map<string, boolean>();
  private lowEnrollmentProcessed = new Set<number>();
  private trainerRemindersSent = new Set<string>();
  private prefs = new Map<number, NotificationPreferences>([
    [1, { ...DEFAULT_NOTIFICATION_PREFS }],
    [2, { ...DEFAULT_NOTIFICATION_PREFS, freeSpots: false }],
  ]);
  private nextUserId = 3;
  private nextBookingId = 100;
  private nextNotificationId = 1;
  private nextTrainingId = SCHEDULE_TRAININGS.length + 1;
  private nextTicketId = 1;
  private nextWaitlistId = 1;
  private nextPaymentId = 5;
  private nextCommentId = 1;
  private nextBlacklistId = 1;

  freeSpots(t: Training) { return t.maxParticipants - t.currentParticipants; }

  getTrainingDate(t: Training) { return t.dateTime.split(' ')[0]; }

  getTrainingTime(t: Training) { return t.dateTime.split(' ')[1]?.slice(0, 5) ?? ''; }

  hasTimeConflict(userId: number, trainingId: number): Training | null {
    const target = this.getTraining(trainingId);
    if (!target) return null;
    const date = this.getTrainingDate(target);
    const time = this.getTrainingTime(target);
    for (const b of this.getUserBookings(userId)) {
      const existing = this.getTraining(b.trainingId);
      if (existing && this.getTrainingDate(existing) === date && this.getTrainingTime(existing) === time) {
        return existing;
      }
    }
    return null;
  }

  getTrainingsForTrainerOnDate(trainerName: string, date: string) {
    return this.trainings
      .filter(t => contains(t.trainer, trainerName) && t.dateTime.startsWith(date))
      .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  }

  getScheduleDaySummary(city: string, date: string) {
    const slots = this.searchTrainings({ city, date });
    const available = slots.filter(t => this.freeSpots(t) > 0).length;
    return { total: slots.length, available };
  }

  getTrainersInCity(city: string) {
    const gymIds = new Set(this.getGymsByCity(city).map(g => g.id));
    return this.getTrainers().filter(t => t.gymId && gymIds.has(t.gymId));
  }

  // --- Discovery ---
  getCities() {
    return [...new Set(this.gyms.filter(g => g.connected).map(g => g.city))].sort();
  }

  getGyms() { return this.gyms.filter(g => g.connected); }

  getGymsByCity(city: string) {
    return this.getGyms().filter(g => g.city === city);
  }

  getGym(id: number) { return this.gyms.find(g => g.id === id); }

  getGymCity(gymId: number) { return this.getGym(gymId)?.city; }

  countAvailableSlotsToday(gymId: number, date = '2026-06-05') {
    return this.searchTrainings({ gymId, date, onlyAvailable: true }).length;
  }

  getGymsSortedByDistance(lat: number, lng: number, limit = 8, maxRadiusKm?: number) {
    return this.getGyms()
      .map(g => ({
        ...g,
        distanceKm: haversineKm({ lat, lng }, { lat: g.latitude, lng: g.longitude }),
      }))
      .filter(g => maxRadiusKm == null || g.distanceKm <= maxRadiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  }

  getGymGoogleRating(gymId: number): number {
    const gym = this.getGym(gymId);
    if (gym?.googleRating) return gym.googleRating;
    const avg = this.getAverageRating('Gym', gymId);
    return avg > 0 ? Math.round(avg * 10) / 10 : 4.3;
  }

  getCancellationPolicy(gymId: number): string {
    const gym = this.getGym(gymId);
    const hours = gym?.lateCancelHours ?? 3;
    return gym?.rulesText ?? `Безкоштовне скасування за ${hours}+ год до початку заняття.`;
  }

  getTrainingDetails(t: Training) {
    const difficultyByType: Partial<Record<TrainingType, string>> = {
      Yoga: 'Початковий', Pilates: 'Початковий', Stretching: 'Початковий', Meditation: 'Початковий',
      HIIT: 'Просунутий', CrossFit: 'Просунутий', Boxing: 'Просунутий',
      Aqua: 'Початковий', Strength: 'Середній', Functional: 'Середній',
    };
    const bringByType: Partial<Record<TrainingType, string>> = {
      Yoga: 'Зручний одяг, килимок (за потреби)',
      Aqua: 'Купальник, рушник, шапочка для басейну',
      Boxing: 'Рукавички, бинти, вода',
      HIIT: 'Зручний одяг, вода, рушник',
    };
    return {
      difficulty: t.difficulty ?? difficultyByType[t.type] ?? 'Середній',
      whatToBring: t.whatToBring ?? bringByType[t.type] ?? 'Зручний спортивний одяг, вода',
    };
  }

  formatTrainerName(name: string): string {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0]} ${parts[1]}`;
    return name;
  }

  searchGyms(keyword: string, city?: string) {
    let list = this.getGyms();
    if (city) list = list.filter(g => g.city === city);
    if (!keyword) return list;
    return list.filter(g =>
      contains(g.name, keyword) || contains(g.address, keyword)
      || contains(g.description, keyword) || contains(g.city, keyword),
    );
  }

  private matchesCity(gymId: number, city?: string) {
    if (!city) return true;
    return this.getGym(gymId)?.city === city;
  }

  getAvailableSlots() { return this.getPortalTrainings().filter(t => this.freeSpots(t) > 0); }
  getTraining(id: number) { return this.trainings.find(t => t.id === id); }
  getAllTrainings() { return [...this.trainings]; }

  getPortalTrainings(gymId?: number) {
    return this.trainings.filter(t => t.active !== false && (!gymId || t.gymId === gymId));
  }

  getTrainers() {
    return this.trainerProfiles.filter(p => p.available);
  }

  searchTrainings(filter: TrainingFilter) {
    return this.trainings.filter(t => {
      if (filter.gymId && t.gymId !== filter.gymId) return false;
      if (filter.city && !this.matchesCity(t.gymId, filter.city)) return false;
      if (filter.type && t.type !== filter.type) return false;
      if (filter.trainer && !contains(t.trainer, filter.trainer)) return false;
      if (filter.date && !t.dateTime.startsWith(filter.date)) return false;
      if (!matchesTimeOfDay(t.dateTime, filter.timeOfDay)) return false;
      if (filter.onlyAvailable && this.freeSpots(t) <= 0) return false;
      if (filter.keyword) {
        const gym = this.getGym(t.gymId);
        if (!contains(t.title, filter.keyword) && !contains(t.description, filter.keyword)
            && !contains(t.trainer, filter.keyword) && !(gym && contains(gym.name, filter.keyword))) return false;
      }
      return true;
    });
  }

  findAlternatives(trainingId: number) {
    const src = this.getTraining(trainingId);
    if (!src) return [];
    const srcCity = this.getGymCity(src.gymId);
    let alts = this.trainings.filter(t =>
      t.id !== trainingId && this.freeSpots(t) > 0
      && this.getGymCity(t.gymId) === srcCity
      && (t.type === src.type || t.trainer === src.trainer),
    );
    if (alts.length < 3) {
      for (const t of this.trainings) {
        if (t.id === trainingId || this.freeSpots(t) <= 0 || alts.some(a => a.id === t.id)) continue;
        alts.push(t);
        if (alts.length >= 5) break;
      }
    }
    return alts;
  }

  getAverageRating(target: ReviewTarget, targetId: number, targetName = '') {
    const matched = this.reviews.filter(r => {
      if (r.target !== target) return false;
      if (target === 'Trainer') return contains(r.targetName, targetName);
      return r.targetId === targetId || (targetName && contains(r.targetName, targetName));
    });
    if (!matched.length) return 0;
    return matched.reduce((s, r) => s + r.rating, 0) / matched.length;
  }

  getGymReviews(gymId: number) { return this.reviews.filter(r => r.target === 'Gym' && r.targetId === gymId); }
  getTrainerProfile(name: string) { return this.trainerProfiles.find(p => contains(p.name, name)); }

  // --- Auth ---
  private readonly demoOtp = '1234';

  normalizePhone(phone: string): string | null {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 && digits.startsWith('0')) return `+38${digits}`;
    if (digits.length === 12 && digits.startsWith('380')) return `+${digits}`;
    if (digits.length === 9) return `+380${digits}`;
    if (phone.startsWith('+380') && digits.length === 12) return `+${digits}`;
    return null;
  }

  findUserByPhone(phone: string): User | null {
    const n = this.normalizePhone(phone);
    if (!n) return null;
    return this.users.find(u => this.normalizePhone(u.phone) === n) ?? null;
  }

  /** Відновлює користувача з localStorage після перезавантаження (in-memory store скидається). */
  restoreSessionUser(user: User): User {
    const byId = this.users.find(u => u.id === user.id);
    if (byId) return byId;
    const byPhone = user.phone ? this.findUserByPhone(user.phone) : null;
    if (byPhone) return byPhone;
    this.users.push(user);
    this.nextUserId = Math.max(this.nextUserId, user.id + 1);
    if (!this.prefs.has(user.id)) {
      this.prefs.set(user.id, { ...DEFAULT_NOTIFICATION_PREFS });
    }
    return user;
  }

  getUserById(userId: number): User | null {
    return this.users.find(u => u.id === userId) ?? null;
  }

  requestOtp(phone: string): { success: boolean; message: string } {
    const n = this.normalizePhone(phone);
    if (!n) return { success: false, message: 'Невірний формат. Введіть +380XXXXXXXXX' };
    return { success: true, message: `Код надіслано на ${n}. Демо-код: ${this.demoOtp}` };
  }

  verifyOtp(code: string) { return code.trim() === this.demoOtp; }

  loginByPhone(phone: string, code: string): User | null {
    if (!this.verifyOtp(code)) return null;
    return this.findUserByPhone(phone);
  }

  /** Створює або повертає клієнта при бронюванні (без SMS на старті). */
  ensureUser(name: string, phone: string): User | null {
    const n = this.normalizePhone(phone);
    if (!n || !name.trim()) return null;
    const existing = this.findUserByPhone(n);
    if (existing) {
      if (name.trim() && existing.name !== name.trim()) existing.name = name.trim();
      return existing;
    }
    const user: User = {
      id: this.nextUserId++,
      name: name.trim(),
      email: `${n.replace(/\D/g, '')}@phone.befitnow`,
      password: 'booking',
      phone: n,
    };
    this.users.push(user);
    this.prefs.set(user.id, { ...DEFAULT_NOTIFICATION_PREFS });
    return user;
  }

  registerByPhone(name: string, phone: string, code: string): User | null {
    if (!name.trim() || !this.verifyOtp(code)) return null;
    const n = this.normalizePhone(phone);
    if (!n || this.findUserByPhone(n)) return null;
    const user: User = {
      id: this.nextUserId++,
      name: name.trim(),
      email: `${n.replace(/\D/g, '')}@phone.befitnow`,
      password: code,
      phone: n,
    };
    this.users.push(user);
    this.prefs.set(user.id, { ...DEFAULT_NOTIFICATION_PREFS });
    return user;
  }

  register(name: string, email: string, password: string, phone: string): User | null {
    if (!name || !email || !password) return null;
    if (this.users.some(u => u.email === email)) return null;
    const user: User = { id: this.nextUserId++, name, email, password, phone };
    this.users.push(user);
    this.prefs.set(user.id, { ...DEFAULT_NOTIFICATION_PREFS });
    return user;
  }

  login(email: string, password: string): User | null {
    return this.users.find(u => u.email === email && u.password === password) ?? null;
  }

  adminLogin(email: string, password: string): Staff | null {
    if (password !== 'admin') return null;
    const s = this.staff.find(x => x.email === email && x.role === 'Admin');
    return s ?? null;
  }

  trainerLogin(email: string, password: string): Staff | null {
    if (password !== 'trainer') return null;
    const s = this.staff.find(x => x.email === email && x.role === 'Trainer');
    return s ?? null;
  }

  staffLogin(email: string, password: string): { role: 'admin' | 'trainer'; staff: Staff } | null {
    const admin = this.adminLogin(email, password);
    if (admin) return { role: 'admin', staff: admin };
    const trainer = this.trainerLogin(email, password);
    if (trainer) return { role: 'trainer', staff: trainer };
    return null;
  }

  // --- Bookings ---
  getUserBookings(userId: number) {
    return this.bookings.filter(b => b.userId === userId && b.status === 'Confirmed');
  }

  hoursUntilTraining(dateTime: string) {
    return (parseDateTime(dateTime) - parseDateTime(DEMO_NOW)) / 3_600_000;
  }

  isWithinAttendanceConfirmationWindow(dateTime: string) {
    const h = this.hoursUntilTraining(dateTime);
    return h > 0 && h <= 4;
  }

  getBookingsNeedingAttendanceConfirmation(userId: number) {
    return this.getUserBookings(userId)
      .filter(b => !b.attendanceConfirmed)
      .map(b => {
        const training = this.getTraining(b.trainingId);
        return training ? { booking: b, training } : null;
      })
      .filter((x): x is { booking: Booking; training: Training } => !!x)
      .filter(({ training }) => this.isWithinAttendanceConfirmationWindow(training.dateTime));
  }

  confirmAttendance(userId: number, bookingId: number): string {
    const b = this.bookings.find(x => x.id === bookingId && x.userId === userId && x.status === 'Confirmed');
    if (!b) return 'Запис не знайдено.';
    const t = this.getTraining(b.trainingId);
    if (!t || !this.isWithinAttendanceConfirmationWindow(t.dateTime)) {
      return 'Підтвердження зараз недоступне.';
    }
    b.attendanceConfirmed = true;
    const user = this.users.find(u => u.id === userId);
    if (user) {
      this.notify(user.email, 'ScheduleConfirmation', `✅ Візит підтверджено: «${t.title}» ${t.dateTime}`);
    }
    return `Дякуємо! Чекаємо вас на «${t.title}» о ${t.dateTime.split(' ')[1]?.slice(0, 5)}.`;
  }

  declineAttendance(userId: number, bookingId: number): string {
    const b = this.bookings.find(x => x.id === bookingId && x.userId === userId);
    if (!b) return 'Запис не знайдено.';
    return this.cancelBooking(userId, bookingId);
  }

  /** MVP: пасивне нагадування (без підтвердження так/ні) */
  private schedulePassiveReminder(email: string, t: Training, bookingId: number) {
    const gym = this.getGym(t.gymId);
    const lateHours = gym?.lateCancelHours ?? 3;
    this.notify(
      email,
      'Reminder',
      `⏰ Нагадування: «${t.title}» ${t.dateTime}. BFN-${bookingId}. Пізнє скасування — менш ніж за ${lateHours} год до початку.`,
    );
  }

  getBookingHistory(userId: number) {
    return this.bookings.filter(b => b.userId === userId && b.status !== 'Confirmed')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getAllBookings() { return [...this.bookings]; }

  getParticipants(trainingId: number) {
    return this.bookings
      .filter(b => b.trainingId === trainingId && b.status === 'Confirmed')
      .map(b => this.users.find(u => u.id === b.userId))
      .filter((u): u is User => !!u);
  }

  bookWorkout(
    userId: number,
    trainingId: number,
    skipPayment = false,
    allowConflict = false,
  ): { success: boolean; message: string; bookingId?: number; needsPayment?: boolean } {
    const t = this.trainings.find(x => x.id === trainingId);
    if (!t || t.active === false) return { success: false, message: 'Тренування не знайдено.' };
    const trainer = this.getTrainerProfile(t.trainer);
    if (trainer && !trainer.available) return { success: false, message: 'Тренер недоступний.' };
    if (this.freeSpots(t) <= 0) {
      const alts = this.findAlternatives(trainingId);
      return { success: false, message: 'Немає вільних місць.' + (alts.length ? ' Перегляньте альтернативні слоти.' : '') };
    }
    if (this.bookings.some(b => b.userId === userId && b.trainingId === trainingId && b.status === 'Confirmed')) {
      return { success: false, message: 'Ви вже записані на це тренування.' };
    }
    const conflict = this.hasTimeConflict(userId, trainingId);
    if (conflict && !allowConflict) {
      return { success: false, message: `⚠️ У вас вже є запис на ${conflict.dateTime}: «${conflict.title}».` };
    }
    const bookingId = this.nextBookingId++;
    t.currentParticipants++;
    this.bookings.push({
      id: bookingId,
      userId,
      trainingId,
      status: 'Confirmed',
      createdAt: now(),
      attendanceConfirmed: false,
    });
    const bookUser = this.users.find(u => u.id === userId);
    const gym = this.getGym(t.gymId);
    if (bookUser) {
      this.notify(bookUser.email, 'Reminder', `✅ BFN-${bookingId}: ${t.title} | ${t.dateTime} | ${t.trainer} | ${gym?.name}`);
      this.scheduleReminders(bookUser.email, t);
      this.schedulePassiveReminder(bookUser.email, t, bookingId);
      if (t.trainer && t.trainer !== '—') {
        this.notifyTrainer(t.trainer, `Новий запис на "${t.title}" ${t.dateTime}. Записано: ${t.currentParticipants}`);
      }
      const m = this.getMembership(userId);
      if (m?.active) m.bookedSessions++;
    }
    this.removeFromWaitlist(userId, trainingId);
    return {
      success: true,
      bookingId,
      needsPayment: !skipPayment && t.price > 0,
      message: `Запис підтверджено! BFN-${bookingId}`,
    };
  }

  joinWaitlist(userId: number, trainingId: number): { success: boolean; message: string } {
    const t = this.getTraining(trainingId);
    if (!t) return { success: false, message: 'Тренування не знайдено.' };
    if (this.freeSpots(t) > 0) return { success: false, message: 'Є вільні місця — можете записатися одразу.' };
    if (this.isOnWaitlist(userId, trainingId)) return { success: false, message: 'Ви вже у листі очікування.' };
    this.waitlist.push({ id: this.nextWaitlistId++, userId, trainingId, createdAt: now() });
    return { success: true, message: 'Додано до листа очікування. Повідомимо, коли з\'явиться місце.' };
  }

  leaveWaitlist(userId: number, trainingId: number): string {
    const idx = this.waitlist.findIndex(w => w.userId === userId && w.trainingId === trainingId);
    if (idx < 0) return 'Ви не у листі очікування.';
    this.waitlist.splice(idx, 1);
    return 'Видалено з листа очікування.';
  }

  isOnWaitlist(userId: number, trainingId: number) {
    return this.waitlist.some(w => w.userId === userId && w.trainingId === trainingId);
  }

  getUserWaitlist(userId: number) {
    return this.waitlist.filter(w => w.userId === userId);
  }

  private removeFromWaitlist(userId: number, trainingId: number) {
    const idx = this.waitlist.findIndex(w => w.userId === userId && w.trainingId === trainingId);
    if (idx >= 0) this.waitlist.splice(idx, 1);
  }

  private notifyWaitlist(t: Training) {
    const entries = this.waitlist.filter(w => w.trainingId === t.id);
    for (const w of entries) {
      const user = this.users.find(u => u.id === w.userId);
      if (user) {
        this.notify(user.email, 'FreeSpot', `🎉 Місце звільнилось: «${t.title}» ${t.dateTime}. Запишіться зараз!`);
      }
      this.waitlist = this.waitlist.filter(x => x.id !== w.id);
    }
  }

  createPayment(userId: number, trainingId: number): { paymentId: number; amount: number; clubName: string; url: string } | null {
    const t = this.getTraining(trainingId);
    const gym = t ? this.getGym(t.gymId) : null;
    if (!t || !gym) return null;
    const paymentId = this.nextPaymentId++;
    this.payments.push({
      id: paymentId,
      bookingId: 0,
      userId,
      amount: t.price,
      status: 'pending',
      clubName: gym.name,
      createdAt: now(),
    });
    return {
      paymentId,
      amount: t.price,
      clubName: gym.name,
      url: `https://pay.${gym.name.toLowerCase().replace(/\s/g, '')}.club.ua/checkout?ref=BFN-PAY-${paymentId}`,
    };
  }

  completePayment(paymentId: number, bookingId: number, method: PaymentMethod = 'online'): boolean {
    const p = this.payments.find(x => x.id === paymentId);
    if (!p) return false;
    p.status = 'completed';
    p.bookingId = bookingId;
    p.method = method;
    return true;
  }

  canCancelWithoutPenalty(bookingId: number): boolean {
    const b = this.bookings.find(x => x.id === bookingId);
    if (!b) return false;
    const t = this.getTraining(b.trainingId);
    if (!t) return true;
    return this.hoursUntilTraining(t.dateTime) >= 3;
  }

  cancelMultipleBookings(userId: number, bookingIds: number[]): string {
    let count = 0;
    for (const id of bookingIds) {
      const b = this.bookings.find(x => x.id === id && x.userId === userId && x.status === 'Confirmed');
      if (b) {
        this.cancelBooking(userId, id);
        count++;
      }
    }
    return count ? `Скасовано ${count} запис(ів).` : 'Немає записів для скасування.';
  }

  repeatBooking(userId: number, pastBookingId: number): { success: boolean; message: string; bookingId?: number; trainingId?: number } {
    const past = this.bookings.find(b => b.id === pastBookingId && b.userId === userId);
    if (!past) return { success: false, message: 'Запис не знайдено.' };
    const oldTraining = this.getTraining(past.trainingId);
    if (!oldTraining) return { success: false, message: 'Тренування не знайдено.' };
    const similar = this.trainings.find(t =>
      t.id !== past.trainingId && t.type === oldTraining.type
      && this.freeSpots(t) > 0 && (t.trainer === oldTraining.trainer || t.gymId === oldTraining.gymId)
    ) ?? this.trainings.find(t => t.type === oldTraining.type && this.freeSpots(t) > 0);
    if (!similar) return { success: false, message: 'Немає схожих доступних слотів.' };
    const r = this.bookWorkout(userId, similar.id);
    return { ...r, trainingId: similar.id };
  }

  cancelBooking(userId: number, bookingId: number): string {
    const b = this.bookings.find(x => x.id === bookingId);
    if (!b || b.userId !== userId) return 'Запис не знайдено.';
    if (b.status !== 'Confirmed') return 'Запис вже скасовано.';
    const t = this.trainings.find(x => x.id === b.trainingId);
    if (t && t.currentParticipants > 0) t.currentParticipants--;
    b.status = 'Cancelled';
    const user = this.users.find(u => u.id === userId);
    if (user) this.notify(user.email, 'ScheduleChange', `Запис #${bookingId} скасовано.`);
    if (t) {
      this.notifyTrainer(t.trainer, `Скасування на "${t.title}" ${t.dateTime}.`);
      this.notifySlotAvailable(t);
      this.notifyWaitlist(t);
      const m = this.getMembership(userId);
      if (m?.active && m.bookedSessions > 0) {
        m.bookedSessions--;
        m.returnedSessions++;
      }
    }
    return 'Запис скасовано.';
  }

  adminCancelBooking(bookingId: number): string {
    const b = this.bookings.find(x => x.id === bookingId);
    if (!b || b.status !== 'Confirmed') return 'Запис не знайдено.';
    return this.cancelBooking(b.userId, bookingId);
  }

  adminCreateBooking(userId: number, trainingId: number, method: PaymentMethod = 'cash'): { success: boolean; message: string } {
    const r = this.bookWorkout(userId, trainingId, true);
    if (!r.success || !r.bookingId) return { success: false, message: r.message };
    const t = this.getTraining(trainingId);
    if (t) {
      this.payments.push({
        id: this.nextPaymentId++,
        bookingId: r.bookingId,
        userId,
        amount: t.price,
        status: 'completed',
        method,
        clubName: this.getGym(t.gymId)?.name ?? 'Клуб',
        createdAt: now(),
      });
    }
    return { success: true, message: `Створено BFN-${r.bookingId}` };
  }

  getBookingsForPortal(gymId?: number, trainerName?: string) {
    return this.getAllBookings()
      .map(b => {
        const t = this.getTraining(b.trainingId);
        const user = this.getUserById(b.userId);
        if (!t) return null;
        if (gymId && t.gymId !== gymId) return null;
        if (trainerName && !contains(t.trainer, trainerName)) return null;
        return { ...b, training: t, user };
      })
      .filter((x): x is NonNullable<typeof x> => !!x)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  rescheduleBooking(userId: number, bookingId: number, newTrainingId: number): string {
    const b = this.bookings.find(x => x.id === bookingId);
    if (!b || b.userId !== userId || b.status !== 'Confirmed') return 'Запис не знайдено.';
    const newT = this.trainings.find(x => x.id === newTrainingId);
    if (!newT || this.freeSpots(newT) <= 0) return 'На нове тренування немає місць.';
    const oldT = this.trainings.find(x => x.id === b.trainingId);
    if (oldT && oldT.currentParticipants > 0) oldT.currentParticipants--;
    b.trainingId = newTrainingId;
    newT.currentParticipants++;
    const user = this.users.find(u => u.id === userId);
    if (user) this.notify(user.email, 'ScheduleChange', `Перенесено на "${newT.title}" ${newT.dateTime}.`);
    return `Перенесено на "${newT.title}" ${newT.dateTime}. Код: BFN-${b.id}`;
  }

  // --- Admin ---
  createTraining(data: Omit<Training, 'id' | 'currentParticipants'>): Training {
    const t: Training = { ...data, id: this.nextTrainingId++, currentParticipants: 0 };
    this.trainings.push(t);
    this.broadcastNewWorkout(t);
    return t;
  }

  updateTraining(id: number, data: Partial<Training>): Training | null {
    const t = this.trainings.find(x => x.id === id);
    if (!t) return null;
    Object.assign(t, data, { id, currentParticipants: t.currentParticipants });
    return t;
  }

  deleteTraining(id: number): boolean {
    const active = this.bookings.some(b => b.trainingId === id && b.status === 'Confirmed');
    if (active) return false;
    const idx = this.trainings.findIndex(t => t.id === id);
    if (idx < 0) return false;
    this.trainings.splice(idx, 1);
    return true;
  }

  addTrainer(name: string, gymId: number, qualifications: string): TrainerProfile {
    const profile: TrainerProfile = { name, qualifications, certificates: [], averageRating: 0, reviewCount: 0, gymId, available: true };
    this.trainerProfiles.push(profile);
    this.staff.push({ id: this.staff.length + 1, gymId, name, email: `${name.split(' ')[0].toLowerCase()}@club.ua`, role: 'Trainer', available: true });
    return profile;
  }

  getOccupancyStats() {
    return this.trainings.map(t => ({
      id: t.id,
      title: t.title,
      dateTime: t.dateTime,
      occupied: t.currentParticipants,
      capacity: t.maxParticipants,
      pct: Math.round((t.currentParticipants / t.maxParticipants) * 100),
    }));
  }

  // --- Trainer ---
  getTrainingsForTrainer(trainerName: string) {
    return this.trainings.filter(t => contains(t.trainer, trainerName));
  }

  setTrainerAvailability(trainerName: string, available: boolean) {
    const p = this.trainerProfiles.find(t => contains(t.name, trainerName));
    if (p) p.available = available;
    const s = this.staff.find(x => contains(x.name, trainerName));
    if (s) s.available = available;
  }

  getStaffNotifications(email: string) {
    return this.notifications.filter(n => n.recipientEmail === email).reverse();
  }

  // --- Profile ---
  getMembership(userId: number) {
    const user = this.users.find(u => u.id === userId);
    if (!user?.membershipId) return null;
    return this.memberships.find(m => m.id === user.membershipId) ?? null;
  }

  getProfile(userId: number) {
    const user = this.getUserById(userId);
    if (!user) return null;
    const m = this.getMembership(userId);
    return {
      name: user.name, email: user.email, phone: user.phone,
      membership: m ? { typeName: m.typeName, remaining: m.totalSessions - m.bookedSessions + m.returnedSessions, validUntil: m.validUntil } : null,
    };
  }

  getNotifications(email: string) { return this.notifications.filter(n => n.recipientEmail === email).reverse(); }

  getUnreadNotificationCount(email: string) {
    return this.notifications.filter(n => n.recipientEmail === email && !n.read).length;
  }

  markNotificationRead(notificationId: number, email: string) {
    const n = this.notifications.find(x => x.id === notificationId && x.recipientEmail === email);
    if (n) n.read = true;
  }

  markAllNotificationsRead(email: string) {
    for (const n of this.notifications) {
      if (n.recipientEmail === email) n.read = true;
    }
  }

  sendSupportMessage(ticketId: number, userEmail: string, text: string): string {
    const ticket = this.supportTickets.find(t => t.id === ticketId && t.userEmail === userEmail);
    if (!ticket) return 'Чат не знайдено.';
    if (!ticket.replies) ticket.replies = [];
    ticket.replies.push({ from: 'user', text, at: now() });
    if (ticket.status === 'assigned_live') return '';
    const adminReply = 'Дякуємо за звернення! Адміністратор клубу відповість найближчим часом. Типовий час відповіді — 15 хв.';
    ticket.replies.push({ from: 'admin', text: adminReply, at: now() });
    ticket.status = 'in_progress';
    return adminReply;
  }

  adminJoinSupportChat(ticketId: number, adminName: string): boolean {
    const ticket = this.supportTickets.find(t => t.id === ticketId);
    if (!ticket) return false;
    ticket.status = 'assigned_live';
    ticket.assignedAdmin = adminName;
    if (!ticket.replies) ticket.replies = [];
    ticket.replies.push({ from: 'admin', text: `${adminName} підключився до чату.`, at: now() });
    return true;
  }

  adminReplySupport(ticketId: number, adminName: string, text: string): boolean {
    const ticket = this.supportTickets.find(t => t.id === ticketId);
    if (!ticket) return false;
    if (!ticket.replies) ticket.replies = [];
    ticket.replies.push({ from: 'admin', text, at: now() });
    ticket.status = 'assigned_live';
    ticket.assignedAdmin = adminName;
    this.notify(ticket.userEmail, 'Reminder', `Відповідь адміна: ${text.slice(0, 80)}`);
    return true;
  }

  openSupportChat(name: string, email: string): { ticketId: number; message: string } {
    const id = this.nextTicketId++;
    this.supportTickets.push({
      id,
      userName: name,
      userEmail: email,
      subject: 'Чат підтримки',
      message: 'Користувач відкрив чат',
      escalated: true,
      status: 'open',
      createdAt: now(),
      replies: [],
    });
    this.notify('admin@befitnow.com', 'Reminder', `Новий чат #${id} від ${name}`);
    return {
      ticketId: id,
      message: `💬 Чат #${id} відкрито. Напишіть повідомлення — адміністратор клубу відповість.`,
    };
  }
  getFaq() { return this.faq; }
  searchFaq(q: string) { return q ? this.faq.filter(f => contains(f.question, q) || contains(f.answer, q)) : this.faq; }

  submitSupport(name: string, email: string, subject: string, message: string) {
    this.supportTickets.push({ id: this.nextTicketId++, userName: name, userEmail: email, subject, message, escalated: false, status: 'open', createdAt: now() });
    return `Запит #${this.nextTicketId - 1} прийнято. Відповімо на ${email}.`;
  }

  escalateToHuman(name: string, email: string, message: string) {
    const id = this.nextTicketId++;
    this.supportTickets.push({
      id,
      userName: name,
      userEmail: email,
      subject: 'Ескалація',
      message,
      escalated: true,
      status: 'assigned',
      createdAt: now(),
      replies: [{ from: 'user', text: message, at: now() }],
    });
    this.notify('admin@befitnow.com', 'Reminder', `Ескалація #${id} від ${name}: ${message.slice(0, 80)}`);
    return `Запит #${id} передано адміністратору клубу.`;
  }

  getSupportTickets() { return [...this.supportTickets].reverse(); }

  getPreferences(userId: number): NotificationPreferences {
    return this.prefs.get(userId) ?? { ...DEFAULT_NOTIFICATION_PREFS };
  }

  updatePreferences(userId: number, p: NotificationPreferences) { this.prefs.set(userId, p); }

  getUsers() { return this.users.map(({ password: _, ...u }) => u); }

  // --- Notifications helpers ---
  private scheduleReminders(email: string, t: Training) {
    const user = this.users.find(u => u.email === email);
    if (!user) return;
    const p = this.getPreferences(user.id);
    if (!p.reminders) return;
    const parts: string[] = [];
    if (p.reminderTimes.before24h) parts.push('24 год');
    if (p.reminderTimes.before2h) parts.push('2 год');
    if (p.reminderTimes.before30m) parts.push('30 хв');
    if (parts.length) {
      this.notify(email, 'Reminder', `Нагадування (${parts.join(', ')}) про "${t.title}" ${t.dateTime}`);
    }
  }

  private notifySlotAvailable(t: Training) {
    for (const user of this.users) {
      const p = this.getPreferences(user.id);
      if (p.slotAlerts || p.freeSpots) {
        this.notify(user.email, 'FreeSpot', `Вільне місце: "${t.title}" ${t.dateTime}`);
      }
    }
  }

  private broadcastNewWorkout(t: Training) {
    for (const user of this.users) {
      const p = this.getPreferences(user.id);
      if (p.newWorkouts) this.notify(user.email, 'Promotion', `Нове тренування: "${t.title}" ${t.dateTime}`);
    }
  }

  private notifyTrainer(trainerName: string, message: string) {
    const s = this.staff.find(x => contains(x.name, trainerName) && x.role === 'Trainer');
    if (s) this.notify(s.email, 'TrainerReminder', message);
  }

  private notify(email: string, type: NotificationType, message: string) {
    const user = this.users.find(u => u.email === email);
    if (user) {
      const p = this.getPreferences(user.id);
      if (type === 'Promotion' && !p.promotions && !p.newWorkouts) return;
      if (type === 'Reminder' && !p.reminders) return;
      if (type === 'ScheduleChange' && !p.scheduleChanges) return;
      if (type === 'FreeSpot' && !p.freeSpots && !p.slotAlerts) return;
    }
    this.notifications.push({ id: this.nextNotificationId++, recipientEmail: email, type, message, sentAt: now(), read: false });
  }

  private detectCityInQuery(q: string, fallback?: string): string | undefined {
    if (q.includes('київ') || q.includes('kyiv') || q.includes('киев')) return 'Київ';
    if (q.includes('дніпр') || q.includes('dnipro') || q.includes('днепр')) return 'Дніпро';
    if (q.includes('львів') || q.includes('lviv') || q.includes('львов')) return 'Львів';
    if (q.includes('одес') || q.includes('odesa')) return 'Одеса';
    if (q.includes('харків') || q.includes('kharkiv') || q.includes('харьков')) return 'Харків';
    return fallback;
  }

  private formatTrainingLine(t: Training) {
    const gym = this.getGym(t.gymId);
    return `• [${t.id}] ${t.title} — ${t.dateTime}${gym ? ` · ${gym.city}` : ''} (вільно: ${this.freeSpots(t)})`;
  }

  // --- Portal ---
  runPortalMaintenance(gymId?: number) {
    this.runLowEnrollmentChecks(gymId);
    this.sendTrainerSessionReminders(gymId);
  }

  runLowEnrollmentChecks(gymId?: number) {
    for (const t of this.getPortalTrainings(gymId)) {
      if (this.lowEnrollmentProcessed.has(t.id)) continue;
      const hours = this.hoursUntilTraining(t.dateTime);
      if (hours > t.bookingDeadlineHours || hours <= 0) continue;
      if (t.currentParticipants >= t.minParticipants) continue;
      this.lowEnrollmentProcessed.add(t.id);
      t.active = false;
      t.lowEnrollmentCancelled = true;
      const gym = this.getGym(t.gymId);
      const participants = this.getParticipants(t.id);
      for (const p of participants) {
        const b = this.bookings.find(x => x.userId === p.id && x.trainingId === t.id && x.status === 'Confirmed');
        if (b) this.cancelBooking(p.id, b.id);
        this.notify(p.email, 'LowEnrollment', `❌ «${t.title}» ${t.dateTime} скасовано — недостатньо записів.`);
      }
      for (const s of this.staff.filter(x => x.gymId === t.gymId && x.role === 'Admin')) {
        this.notify(s.email, 'LowEnrollment', `⚠️ Скасовано «${t.title}» ${t.dateTime} — ${t.currentParticipants}/${t.minParticipants} учасників (дедлайн ${t.bookingDeadlineHours} год).`);
      }
      this.notifyTrainer(t.trainer, `Заняття «${t.title}» ${t.dateTime} скасовано через низьку заповненість.`);
      if (gym) {
        this.notify('admin@befitnow.com', 'LowEnrollment', `[${gym.name}] Скасовано «${t.title}» — мало записів.`);
      }
    }
  }

  sendTrainerSessionReminders(gymId?: number) {
    const todayDate = DEMO_NOW.split(' ')[0];
    for (const t of this.getPortalTrainings(gymId).filter(x => x.dateTime.startsWith(todayDate))) {
      const key = `reminder_${t.id}`;
      if (this.trainerRemindersSent.has(key)) continue;
      const hours = this.hoursUntilTraining(t.dateTime);
      if (hours > 0 && hours <= 6) {
        this.notifyTrainer(t.trainer, `⏰ Нагадування: «${t.title}» о ${t.dateTime.split(' ')[1]?.slice(0, 5)} · ${t.currentParticipants} учасників`);
        this.trainerRemindersSent.add(key);
      }
    }
  }

  getClientDatabase(gymId?: number): ClientRecord[] {
    return this.users.map(u => {
      const m = this.getMembership(u.id);
      const bookings = this.bookings.filter(b => b.userId === u.id && b.status === 'Confirmed');
      const gymBookings = bookings.filter(b => {
        const t = this.getTraining(b.trainingId);
        return t && (!gymId || t.gymId === gymId);
      });
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone,
        membership: m ? {
          typeName: m.typeName,
          total: m.totalSessions,
          booked: m.bookedSessions,
          returned: m.returnedSessions,
          remaining: m.totalSessions - m.bookedSessions + m.returnedSessions,
          validUntil: m.validUntil,
        } : null,
        confirmedBookings: gymBookings.length,
        blacklisted: this.isBlacklisted(u.phone),
      };
    });
  }

  isBlacklisted(phone: string): boolean {
    const n = this.normalizePhone(phone);
    if (!n) return false;
    return this.blacklist.some(b => this.normalizePhone(b.phone) === n);
  }

  getBlacklist() { return [...this.blacklist]; }

  addToBlacklist(phone: string, reason: string, name?: string) {
    const n = this.normalizePhone(phone);
    if (!n) return false;
    if (this.isBlacklisted(n)) return false;
    this.blacklist.push({ id: this.nextBlacklistId++, phone: n, name, reason, createdAt: now() });
    return true;
  }

  removeFromBlacklist(id: number) {
    const idx = this.blacklist.findIndex(b => b.id === id);
    if (idx < 0) return false;
    this.blacklist.splice(idx, 1);
    return true;
  }

  updateGymProfile(gymId: number, data: Partial<Gym>): Gym | null {
    const g = this.gyms.find(x => x.id === gymId);
    if (!g) return null;
    Object.assign(g, data, { id: gymId });
    return g;
  }

  toggleCrmConnection(gymId: number, connected: boolean) {
    const g = this.getGym(gymId);
    if (!g) return false;
    g.crmConnected = connected;
    return true;
  }

  updateTrainerProfile(name: string, data: Partial<TrainerProfile>): TrainerProfile | null {
    const p = this.trainerProfiles.find(t => t.name === name);
    if (!p) return null;
    Object.assign(p, data, { name });
    return p;
  }

  deleteTrainer(name: string) {
    const p = this.trainerProfiles.find(t => t.name === name);
    if (!p) return false;
    p.available = false;
    const s = this.staff.find(x => x.name === name);
    if (s) s.available = false;
    return true;
  }

  updateTrainingPrice(id: number, price: number) {
    const t = this.trainings.find(x => x.id === id);
    if (!t) return false;
    t.price = price;
    return true;
  }

  getSlotComments(trainingId: number) {
    return this.slotComments.filter(c => c.trainingId === trainingId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  addSlotComment(trainingId: number, staffEmail: string, staffName: string, text: string) {
    const c: SlotComment = { id: this.nextCommentId++, trainingId, staffEmail, staffName, text: text.trim(), createdAt: now() };
    this.slotComments.push(c);
    return c;
  }

  isStaffScheduleConfirmed(trainingId: number, staffEmail: string) {
    return this.staffScheduleConfirmations.get(`${trainingId}_${staffEmail}`) === true;
  }

  confirmStaffSchedule(trainingId: number, staffEmail: string) {
    this.staffScheduleConfirmations.set(`${trainingId}_${staffEmail}`, true);
    const t = this.getTraining(trainingId);
    if (t) this.notifyTrainer(t.trainer, `✅ Розклад підтверджено персоналом: «${t.title}» ${t.dateTime}`);
    return true;
  }

  getPendingStaffScheduleConfirmations(staffEmail: string, gymId?: number) {
    return this.getPortalTrainings(gymId)
      .filter(t => this.hoursUntilTraining(t.dateTime) > 0 && this.hoursUntilTraining(t.dateTime) <= 48)
      .filter(t => !this.isStaffScheduleConfirmed(t.id, staffEmail));
  }

  getBookingStatusBreakdown(gymId?: number): BookingStatusBreakdown {
    const list = this.getBookingsForPortal(gymId);
    return {
      confirmed: list.filter(b => b.status === 'Confirmed').length,
      cancelled: list.filter(b => b.status === 'Cancelled').length,
      rescheduled: list.filter(b => b.status === 'Rescheduled').length,
    };
  }

  getPaymentStats(gymId?: number): PaymentStats {
    const clubName = gymId ? this.getGym(gymId)?.name : undefined;
    const pays = this.payments.filter(p => p.status === 'completed' && (!clubName || p.clubName === clubName));
    const sum = (method: PaymentMethod) => pays.filter(p => p.method === method).reduce((s, p) => s + p.amount, 0);
    return {
      membership: sum('membership'),
      oneTime: sum('one_time'),
      online: sum('online'),
      cash: sum('cash'),
      total: pays.reduce((s, p) => s + p.amount, 0),
    };
  }

  getPortalKPIs(gymId?: number): PortalKPIs {
    const trainings = this.getPortalTrainings(gymId);
    const occupied = trainings.reduce((s, t) => s + t.currentParticipants, 0);
    const capacity = trainings.reduce((s, t) => s + t.maxParticipants, 0);
    const breakdown = this.getBookingStatusBreakdown(gymId);
    const payments = this.getPaymentStats(gymId);
    const members = this.memberships.filter(m => m.active).length;
    const lowCancelled = trainings.filter(t => t.lowEnrollmentCancelled).length;
    const withParticipants = trainings.filter(t => t.currentParticipants > 0);
    const avgGroup = withParticipants.length
      ? withParticipants.reduce((s, t) => s + t.currentParticipants, 0) / withParticipants.length
      : 0;
    return {
      occupancyPct: capacity ? Math.round((occupied / capacity) * 100) : 0,
      confirmedBookings: breakdown.confirmed,
      cancelledBookings: breakdown.cancelled,
      revenueTotal: payments.total,
      activeMembers: members,
      lowEnrollmentCancelled: lowCancelled,
      avgGroupSize: Math.round(avgGroup * 10) / 10,
    };
  }

  getBookingTrends(gymId?: number): BookingTrends {
    const bookings = this.getBookingsForPortal(gymId);
    const weekdays = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const byHour = Array.from({ length: 24 }, (_, h) => ({ label: `${String(h).padStart(2, '0')}:00`, count: 0 }));
    const byWeekday = weekdays.map(label => ({ label, count: 0 }));
    const byMonthMap = new Map<string, number>();

    for (const b of bookings) {
      const dt = b.training.dateTime;
      const h = parseInt(dt.split(' ')[1]?.split(':')[0] ?? '0');
      byHour[h].count++;
      const d = new Date(dt.replace(' ', 'T'));
      byWeekday[d.getDay()].count++;
      const monthKey = dt.slice(0, 7);
      byMonthMap.set(monthKey, (byMonthMap.get(monthKey) ?? 0) + 1);
    }

    return {
      byHour: byHour.filter(x => x.count > 0).slice(0, 12),
      byWeekday: byWeekday.filter(x => x.count > 0),
      byMonth: [...byMonthMap.entries()].sort().map(([label, count]) => ({ label, count })),
    };
  }

  getPayments() { return [...this.payments].reverse(); }

  // --- AI ---
  processAI(userId: number, query: string, preferredCity?: string): string {
    const q = query.toLowerCase();
    const u = this.users.find(x => x.id === userId);
    const city = this.detectCityInQuery(q, preferredCity);

    if (q.includes('початків') || q.includes('новач') || q.includes('recommend') || q.includes('рекоменд')) {
      const beginner = this.searchTrainings({ city, type: undefined, onlyAvailable: true })
        .filter(t => ['Yoga', 'Pilates', 'Stretching'].includes(t.type));
      if (!beginner.length) return `Немає слотів для початківців${city ? ` у ${city}` : ''}. Спробуйте інше місто.`;
      return `Для початківців рекомендую${city ? ` (${city})` : ''}:\n` + beginner.slice(0, 3).map(t => this.formatTrainingLine(t)).join('\n');
    }

    if (q.includes('завтра') || q.includes('tomorrow')) {
      const results = this.searchTrainings({ city, date: '2026-06-06', onlyAvailable: true });
      return results.length
        ? `Завтра${city ? ` · ${city}` : ''}:\n` + results.slice(0, 6).map(t => this.formatTrainingLine(t)).join('\n')
        : `Завтра немає слотів${city ? ` у ${city}` : ''}. Спробуйте інше місто через 📍 Місто.`;
    }

    if (q.includes('вечір') || q.includes('evening')) {
      const results = this.searchTrainings({ city, timeOfDay: 'evening', onlyAvailable: true });
      return results.length
        ? `Вечірні${city ? ` · ${city}` : ''}:\n` + results.slice(0, 6).map(t => this.formatTrainingLine(t)).join('\n')
        : 'Вечірніх слотів немає.';
    }

    if (q.includes('знайти') || q.includes('пошук') || q.includes('покажи') || q.includes('find')) {
      let type: TrainingType | undefined;
      if (q.includes('йог') || q.includes('yoga')) type = 'Yoga';
      else if (q.includes('бокс') || q.includes('boxing')) type = 'Boxing';
      else if (q.includes('hiit')) type = 'HIIT';
      else if (q.includes('спін') || q.includes('spinning')) type = 'Spinning';
      else if (q.includes('танц') || q.includes('zumba')) type = 'Dance';
      else if (q.includes('аква') || q.includes('басейн')) type = 'Aqua';
      else if (q.includes('пілатес')) type = 'Pilates';
      else if (q.includes('крос') || q.includes('crossfit')) type = 'CrossFit';
      const results = this.searchTrainings({
        keyword: query, type, city,
        gymId: this.gyms.find(g => contains(g.name, query) || contains(g.address, query))?.id,
        trainer: this.trainings.find(t => contains(t.trainer, query))?.trainer,
        timeOfDay: q.includes('ранок') ? 'morning' : q.includes('вечір') ? 'evening' : undefined,
        onlyAvailable: !q.includes('всі'),
      });
      if (!results.length) return `Не знайшов${city ? ` у ${city}` : ''}. Спробуйте: «знайти йогу в Дніпрі завтра».`;
      return `Знайдено${city ? ` · ${city}` : ''}:\n` + results.slice(0, 6).map(t => this.formatTrainingLine(t)).join('\n');
    }

    if (q.includes('запис') || q.includes('book')) {
      const id = parseInt([...query.matchAll(/\d+/g)].pop()?.[0] ?? '0');
      if (!id) return 'Вкажіть ID: «записатися на 2».';
      return this.bookWorkout(userId, id).message;
    }

    if (q.includes('скасув') || q.includes('cancel')) {
      const bookings = this.getUserBookings(userId);
      const id = parseInt([...query.matchAll(/\d+/g)].pop()?.[0] ?? '0') || bookings[0]?.id;
      if (!id) return 'Немає записів.';
      return this.cancelBooking(userId, id);
    }

    if (q.includes('перенес') || q.includes('move')) {
      const nums = [...query.matchAll(/\d+/g)].map(m => parseInt(m[0]));
      const bookings = this.getUserBookings(userId);
      if (nums.length >= 2) return this.rescheduleBooking(userId, nums[0], nums[1]);
      if (nums.length === 1 && bookings.length) return this.rescheduleBooking(userId, bookings[0].id, nums[0]);
      return 'Вкажіть: «перенести запис 1 на 5».';
    }

    if (q.includes('профіль') || q.includes('абонемент')) {
      const p = this.getProfile(userId);
      if (!p) return 'Помилка.';
      return p.membership ? `Залишилось ${p.membership.remaining} тренувань до ${p.membership.validUntil}.` : `Профіль: ${p.name}. Без абонемента.`;
    }

    if (q.includes('співробітник') || q.includes('людин') || q.includes('адмін') || q.includes('підтрим')) {
      return u ? this.escalateToHuman(u.name, u.email, query) : 'Помилка.';
    }

    // Auto FAQ
    const faqHit = this.faq.find(f => contains(f.question, query) || contains(query, f.question.slice(0, 10)));
    if (faqHit) return faqHit.answer;

    if (q.includes('допомога') || q.includes('help')) {
      return 'Приклади:\n• знайти йогу завтра вечером\n• записатися на 2\n• скасувати запис\n• рекомендація для початківців\n• потрібен співробітник';
    }

    return 'Не зрозумів. Напишіть «допомога» або опишіть, що шукаєте.';
  }
}

export const service = new BeFitNowService();
