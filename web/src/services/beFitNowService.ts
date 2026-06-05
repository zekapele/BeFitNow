import type {
  Booking, FaqEntry, Gym, Membership, Notification, NotificationPreferences, NotificationType,
  Review, ReviewTarget, Staff, SupportTicket, TrainerProfile, Training, TrainingFilter,
  TrainingType, User,
} from '../types';
import { DEFAULT_NOTIFICATION_PREFS } from '../types';

function now() {
  return new Date().toISOString().slice(0, 16).replace('T', ' ');
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
    { id: 1, name: 'FitZone Київ', address: 'вул. Хрещатик, 15', description: 'Сучасний зал у центрі з зоною кросфіту', connected: true },
    { id: 2, name: 'PowerGym Київ', address: 'вул. Басейна, 3', description: 'Силові та функціональні тренування', connected: true },
    { id: 3, name: 'YogaSpace Київ', address: 'вул. Шевченка, 45', description: 'Йога, пілатес і медитація', connected: true },
    { id: 4, name: 'CrossFit Arena Київ', address: 'вул. Саксаганського, 30', description: 'Функціональні та CrossFit тренування', connected: true },
    { id: 5, name: 'IronBox Київ', address: 'пр. Перемоги, 67', description: 'Бокс, HIIT і танцювальні класи', connected: true },
    { id: 6, name: 'AquaFit Київ', address: 'вул. Еспланадна, 12', description: 'Аквааеробіка та аква-йога у басейні', connected: true },
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
    { question: 'Як записатися?', answer: 'Оберіть слот → деталі → підтвердіть. Або використайте чатбот.' },
    { question: 'Як скасувати?', answer: 'У «Мої записи» — скасування. Зазвичай за 2–3 год до тренування.' },
    { question: 'Немає місць?', answer: 'Покажемо альтернативні зали та часи.' },
    { question: 'Чи є оплата?', answer: 'Оплата — у Phase 2. MVP: самообслуговування.' },
    { question: 'Нагадування?', answer: 'Налаштуйте: за 24 год, 2 год або 30 хв у профілі.' },
  ];
  private supportTickets: SupportTicket[] = [];
  private prefs = new Map<number, NotificationPreferences>([
    [1, { ...DEFAULT_NOTIFICATION_PREFS }],
    [2, { ...DEFAULT_NOTIFICATION_PREFS, freeSpots: false }],
  ]);
  private nextUserId = 3;
  private nextBookingId = 100;
  private nextNotificationId = 1;
  private nextTrainingId = SCHEDULE_TRAININGS.length + 1;
  private nextTicketId = 1;

  freeSpots(t: Training) { return t.maxParticipants - t.currentParticipants; }

  // --- Discovery ---
  getGyms() { return this.gyms.filter(g => g.connected); }
  getGym(id: number) { return this.gyms.find(g => g.id === id); }
  searchGyms(keyword: string) {
    if (!keyword) return this.getGyms();
    return this.getGyms().filter(g => contains(g.name, keyword) || contains(g.address, keyword) || contains(g.description, keyword));
  }

  getAvailableSlots() { return this.trainings.filter(t => this.freeSpots(t) > 0); }
  getTraining(id: number) { return this.trainings.find(t => t.id === id); }
  getAllTrainings() { return [...this.trainings]; }

  getTrainers() {
    return this.trainerProfiles.filter(p => p.available);
  }

  searchTrainings(filter: TrainingFilter) {
    return this.trainings.filter(t => {
      if (filter.gymId && t.gymId !== filter.gymId) return false;
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
    let alts = this.trainings.filter(t => t.id !== trainingId && this.freeSpots(t) > 0 && (t.type === src.type || t.trainer === src.trainer));
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

  bookWorkout(userId: number, trainingId: number): { success: boolean; message: string; bookingId?: number } {
    const t = this.trainings.find(x => x.id === trainingId);
    if (!t) return { success: false, message: 'Тренування не знайдено.' };
    const trainer = this.getTrainerProfile(t.trainer);
    if (trainer && !trainer.available) return { success: false, message: 'Тренер недоступний.' };
    if (this.freeSpots(t) <= 0) {
      const alts = this.findAlternatives(trainingId);
      return { success: false, message: 'Немає вільних місць.' + (alts.length ? ' Див. альтернативи.' : '') };
    }
    if (this.bookings.some(b => b.userId === userId && b.trainingId === trainingId && b.status === 'Confirmed')) {
      return { success: false, message: 'Ви вже записані на це тренування.' };
    }
    const bookingId = this.nextBookingId++;
    t.currentParticipants++;
    this.bookings.push({ id: bookingId, userId, trainingId, status: 'Confirmed', createdAt: now() });
    const user = this.users.find(u => u.id === userId);
    const gym = this.getGym(t.gymId);
    if (user) {
      this.notify(user.email, 'Reminder', `✅ BFN-${bookingId}: ${t.title} | ${t.dateTime} | ${t.trainer} | ${gym?.name}`);
      this.scheduleReminders(user.email, t);
      this.notifyTrainer(t.trainer, `Новий запис на "${t.title}" ${t.dateTime}. Записано: ${t.currentParticipants}`);
    }
    return { success: true, bookingId, message: `Запис підтверджено! BFN-${bookingId}` };
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
    }
    return 'Запис скасовано.';
  }

  adminCancelBooking(bookingId: number): string {
    const b = this.bookings.find(x => x.id === bookingId);
    if (!b || b.status !== 'Confirmed') return 'Запис не знайдено.';
    return this.cancelBooking(b.userId, bookingId);
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
    return `Перенесено на "${newT.title}".`;
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
    const user = this.users.find(u => u.id === userId);
    if (!user) return null;
    const m = this.getMembership(userId);
    return {
      name: user.name, email: user.email, phone: user.phone,
      membership: m ? { typeName: m.typeName, remaining: m.totalSessions - m.bookedSessions + m.returnedSessions, validUntil: m.validUntil } : null,
    };
  }

  getNotifications(email: string) { return this.notifications.filter(n => n.recipientEmail === email).reverse(); }
  getFaq() { return this.faq; }
  searchFaq(q: string) { return q ? this.faq.filter(f => contains(f.question, q) || contains(f.answer, q)) : this.faq; }

  submitSupport(name: string, email: string, subject: string, message: string) {
    this.supportTickets.push({ id: this.nextTicketId++, userName: name, userEmail: email, subject, message, escalated: false, status: 'open', createdAt: now() });
    return `Запит #${this.nextTicketId - 1} прийнято. Відповімо на ${email}.`;
  }

  escalateToHuman(name: string, email: string, message: string) {
    const id = this.nextTicketId++;
    this.supportTickets.push({ id, userName: name, userEmail: email, subject: 'Ескалація', message, escalated: true, status: 'assigned', createdAt: now() });
    this.notify('admin@befitnow.com', 'Reminder', `Ескалація #${id} від ${name}: ${message.slice(0, 80)}`);
    return `Запит #${id} передано адміністратору.`;
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

  // --- AI ---
  processAI(userId: number, query: string): string {
    const q = query.toLowerCase();
    const u = this.users.find(x => x.id === userId);

    if (q.includes('початків') || q.includes('новач') || q.includes('recommend') || q.includes('рекоменд')) {
      const beginner = this.trainings.filter(t => ['Yoga', 'Pilates', 'Stretching'].includes(t.type) && this.freeSpots(t) > 0);
      if (!beginner.length) return 'Немає слотів для початківців зараз. Спробуйте йогу або пілатес пізніше.';
      return 'Для початківців рекомендую:\n' + beginner.slice(0, 3).map(t => `• [${t.id}] ${t.title} — ${t.dateTime}`).join('\n');
    }

    if (q.includes('завтра') || q.includes('tomorrow')) {
      const results = this.searchTrainings({ date: '2026-06-10', onlyAvailable: true });
      return results.length ? 'Завтра:\n' + results.map(t => `• [${t.id}] ${t.title} — ${t.dateTime}`).join('\n') : 'Завтра немає доступних слотів.';
    }

    if (q.includes('вечір') || q.includes('evening')) {
      const results = this.searchTrainings({ timeOfDay: 'evening', onlyAvailable: true });
      return results.length ? 'Вечірні:\n' + results.map(t => `• [${t.id}] ${t.title} — ${t.dateTime}`).join('\n') : 'Вечірніх слотів немає.';
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
        keyword: query, type,
        gymId: this.gyms.find(g => contains(g.name, query) || contains(g.address, query))?.id,
        trainer: this.trainings.find(t => contains(t.trainer, query))?.trainer,
        timeOfDay: q.includes('ранок') ? 'morning' : q.includes('вечір') ? 'evening' : undefined,
        onlyAvailable: !q.includes('всі'),
      });
      if (!results.length) return 'Не знайшов. Спробуйте: «знайти йогу завтра вечером».';
      return 'Знайдено:\n' + results.slice(0, 6).map(t => `• [${t.id}] ${t.title} — ${t.dateTime} (вільно: ${this.freeSpots(t)})`).join('\n');
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
