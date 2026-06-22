import { service } from '../services/beFitNowService';
import type { TrainingType, User } from '../types';
import { TRAINING_TYPE_LABELS } from '../types';
import { detectNearestCity, formatDistance, mapsUrl, walkMinutes } from '../utils/geo';

export interface TgButton {
  id: string;
  text: string;
}

export interface BotReply {
  text: string;
  buttons?: TgButton[][];
  openUrl?: string;
}

export interface BotContext {
  step: string;
  filterCity?: string;
  filterGymId?: number;
  filterType?: TrainingType | 'all';
  filterDate?: string;
  filterTrainer?: string;
  slotOffset?: number;
  selectedTrainingId?: number;
  selectedGymId?: number;
  selectedBookingId?: number;
  userLat?: number;
  userLng?: number;
  geoRadiusKm?: number;
  bookingsTab?: 'active' | 'history';
  supportTicketId?: number;
  supportMode?: boolean;
  pendingPaymentId?: number;
  allowDoubleBooking?: boolean;
  locationSet?: boolean;
  bookingStep?: 'name' | 'phone' | 'lookup_phone';
  guestName?: string;
  pendingTrainingId?: number;
  /** Після реєстрації продовжити Book-flow (menu_find, menu_pool, …). */
  pendingBookAction?: string;
}

export type BookingInputResult =
  | { kind: 'none' }
  | { kind: 'user'; user: User; resumeActionId?: string };

const CITY_SLUGS: Record<string, string> = {
  kyiv: 'Київ',
  lviv: 'Львів',
  dnipro: 'Дніпро',
  kharkiv: 'Харків',
  odesa: 'Одеса',
};

function slugToCity(slug: string) { return CITY_SLUGS[slug] ?? 'Київ'; }

function cityToSlug(city: string) {
  return Object.entries(CITY_SLUGS).find(([, v]) => v === city)?.[0] ?? 'kyiv';
}

export const DEFAULT_CITY = 'Київ';
const DEMO_TODAY = '2026-06-05';

const WORKOUT_TYPES: TrainingType[] = [
  'Yoga', 'HIIT', 'Pilates', 'CrossFit', 'Strength', 'Boxing', 'Spinning',
];

function today() { return DEMO_TODAY; }

function tomorrow() {
  const d = new Date(DEMO_TODAY);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
}

function chunkButtons(items: TgButton[], perRow = 2): TgButton[][] {
  const rows: TgButton[][] = [];
  for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow));
  return rows;
}

function cityLabel(ctx: BotContext) {
  return ctx.filterCity ?? DEFAULT_CITY;
}

function searchSlots(ctx: BotContext, onlyAvailable = true) {
  return service.searchTrainings({
    city: cityLabel(ctx),
    gymId: ctx.filterGymId,
    type: ctx.filterType && ctx.filterType !== 'all' ? ctx.filterType : undefined,
    date: ctx.filterDate,
    trainer: ctx.filterTrainer,
    onlyAvailable,
  }).sort((a, b) => a.dateTime.localeCompare(b.dateTime));
}

function locationMenu(ctx: BotContext): BotReply {
  const cities = service.getCities();
  const cityBtns: TgButton[] = cities.map(city => {
    const mark = ctx.filterCity === city ? ' ✓' : '';
    return { id: `city_${cityToSlug(city)}`, text: `${city}${mark}` };
  });
  const buttons: TgButton[][] = [...chunkButtons(cityBtns, 2)];
  if (ctx.locationSet) {
    buttons.push([{ id: 'back_main', text: '◀️ Меню' }]);
  } else if (ctx.step === 'location') {
    buttons.push([{ id: 'welcome_back', text: '◀️ Назад' }]);
  }
  return {
    text: [
      '📍 <b>Оберіть місто</b>',
      '',
      'Без реєстрації — одразу переглядайте клуби та тренування.',
    ].join('\n'),
    buttons,
  };
}

/** Discover — хаб пошуку після локації. */
function discoverMenu(ctx: BotContext, userEmail?: string, loggedIn = false): BotReply {
  const city = cityLabel(ctx);
  const unread = userEmail ? service.getUnreadNotificationCount(userEmail) : 0;
  const buttons: TgButton[][] = [
    [{ id: 'menu_find', text: '🗓 Знайти тренування' }],
    [{ id: 'menu_clubs', text: '🏢 Знайти клуб' }, { id: 'menu_trainers', text: '👤 Знайти тренера' }],
    [{ id: 'menu_schedule', text: '📅 Переглянути розклад' }, { id: 'menu_pool', text: '🏊 Басейн' }],
    [
      { id: 'menu_bookings', text: '📋 Мої записи' },
      { id: 'menu_notifications', text: `🔔 Нагадування${unread > 0 ? ` (${unread})` : ''}` },
    ],
    [{ id: 'menu_location', text: '📍 Змінити локацію' }, { id: 'menu_support', text: '💬 Підтримка' }],
  ];
  if (loggedIn) buttons.push([{ id: 'auth_logout', text: '🚪 Вийти' }]);
  return {
    text: [
      '🔍 <b>Пошук</b>',
      `📍 ${city}`,
      '',
      'Переглядайте клуби та тренування без реєстрації.',
      'При записі: введіть дані → оберіть слот → підтвердьте запис.',
    ].join('\n'),
    buttons,
  };
}

function hubMenu(ctx: BotContext, userEmail?: string, loggedIn = false): BotReply {
  if (!ctx.locationSet) {
    if (ctx.step === 'welcome') return getDiscoverWelcome();
    return locationMenu(ctx);
  }
  return discoverMenu(ctx, userEmail, loggedIn);
}

function hasBookingProfile(userId: number, userName: string) {
  if (userId <= 0) return false;
  const u = service.getUserById(userId);
  return !!(u?.phone && (u.name || userName));
}

function ensureLocationStep(ctx: BotContext, replies: BotReply[]): BotContext | null {
  if (ctx.locationSet) return null;
  replies.push(locationMenu({ ...ctx, step: 'location' }));
  return { ...ctx, step: 'location' };
}

function gymFilterMenu(ctx: BotContext): BotReply {
  const city = cityLabel(ctx);
  const type = ctx.filterType;
  if (!type || type === 'all') return typeMenu(ctx);

  const typeLabel = TRAINING_TYPE_LABELS[type];
  const gyms = service.getGymsByCity(city).filter(g =>
    service.searchTrainings({ city, gymId: g.id, type, onlyAvailable: true }).length > 0,
  );
  if (!gyms.length) {
    return {
      text: `😔 Немає клубів із типом <b>${typeLabel}</b> у ${city}.`,
      buttons: [
        [{ id: 'back_types', text: '◀️ Інший тип' }],
        [{ id: 'back_main', text: '🏠 Меню' }],
      ],
    };
  }
  const btns: TgButton[] = gyms.map(g => {
    const count = service.searchTrainings({ city, gymId: g.id, type, onlyAvailable: true }).length;
    return { id: `gym_${g.id}`, text: `${g.name} (${count})` };
  });
  return {
    text: `🏢 <b>Оберіть клуб</b>\n📍 ${city} · ${typeLabel}:`,
    buttons: [
      ...chunkButtons(btns, 1),
      [{ id: 'back_types', text: '◀️ Змінити тип' }],
      [{ id: 'back_main', text: '🏠 Меню' }],
    ],
  };
}

function nearbyRequestMenu(): BotReply {
  return {
    text: [
      '📍 <b>Пошук поруч (GPS)</b>',
      '',
      'Дозвольте геолокацію → оберіть радіус:',
      '500 м · 1000 м · 5000 м',
    ].join('\n'),
    buttons: [
      [{ id: 'geo_allow', text: '📍 Дозволити геолокацію' }],
      [{ id: 'menu_city', text: '🏙 Обрати місто' }],
      [{ id: 'back_main', text: '◀️ Меню' }],
    ],
  };
}

function radiusMenu(): BotReply {
  return {
    text: '📏 <b>Оберіть радіус пошуку</b>',
    buttons: [
      [{ id: 'geo_radius_0.5', text: '500 м' }],
      [{ id: 'geo_radius_1', text: '1000 м' }],
      [{ id: 'geo_radius_5', text: '5000 м' }],
      [{ id: 'back_nearby', text: '◀️ Назад' }],
    ],
  };
}

function nearbyGymsMenu(lat: number, lng: number, radiusKm = 1): BotReply {
  const gyms = service.getGymsSortedByDistance(lat, lng, 8, radiusKm);
  const detectedCity = detectNearestCity(lat, lng);
  if (!gyms.length) {
    return {
      text: `😔 У радіусі ${radiusKm < 1 ? `${radiusKm * 1000} м` : `${radiusKm} км`} клубів немає.\nСпробуйте більший радіус або оберіть місто.`,
      buttons: [
        [{ id: 'geo_radius_5', text: '5000 м' }],
        [{ id: 'menu_city', text: '🏙 Місто' }],
        [{ id: 'back_main', text: '◀️ Меню' }],
      ],
    };
  }
  const lines = gyms.map((g, i) => {
    const slots = service.countAvailableSlotsToday(g.id, today());
    const rating = service.getGymGoogleRating(g.id);
    return `${i + 1}. <b>${g.name}</b> · ★${rating}\n   ${formatDistance(g.distanceKm)} · ${slots} слотів`;
  });
  const gymBtns: TgButton[] = gyms.map(g => ({
    id: `nearby_gym_${g.id}`,
    text: `${g.name} · ${formatDistance(g.distanceKm)}`,
  }));
  const radiusLabel = radiusKm < 1 ? `${radiusKm * 1000} м` : `${radiusKm} км`;
  return {
    text: ['📍 <b>Клуби поруч</b>', `Радіус: ${radiusLabel}`, detectedCity ? `🏙 ${detectedCity}` : '', '', ...lines].filter(Boolean).join('\n'),
    buttons: [
      ...chunkButtons(gymBtns, 1),
      [{ id: 'geo_pick_radius', text: '📏 Інший радіус' }],
      [{ id: 'menu_discover', text: '🔍 До пошуку' }],
      [{ id: 'back_main', text: '◀️ Меню' }],
    ],
  };
}

function clubsMenu(ctx: BotContext): BotReply {
  const city = cityLabel(ctx);
  const gyms = service.getGymsByCity(city);
  if (!gyms.length) {
    return { text: `Немає клубів у ${city}.`, buttons: [[{ id: 'menu_city', text: '🏙 Місто' }], [{ id: 'back_main', text: '◀️' }]] };
  }
  return {
    text: `🏢 <b>Знайти клуб</b> · ${city}`,
    buttons: [
      ...chunkButtons(gyms.map(g => {
        const rating = service.getGymGoogleRating(g.id);
        const slots = service.countAvailableSlotsToday(g.id, today());
        return { id: `club_${g.id}`, text: `${g.name} ★${rating} · ${slots}` };
      }), 1),
      [{ id: 'back_main', text: '◀️ Меню' }],
    ],
  };
}

function clubDetailMenu(gymId: number): BotReply {
  const gym = service.getGym(gymId);
  if (!gym) return { text: 'Клуб не знайдено.', buttons: [[{ id: 'menu_clubs', text: '◀️' }]] };
  const rating = service.getGymGoogleRating(gymId);
  const slots = service.countAvailableSlotsToday(gymId, today());
  return {
    text: [
      `🏢 <b>${gym.name}</b>`,
      `★ ${rating} Google`,
      `📍 ${gym.city}, ${gym.address}`,
      `🗓 Вільних слотів сьогодні: <b>${slots}</b>`,
      '',
      gym.description,
      '',
      `📋 ${service.getCancellationPolicy(gymId)}`,
    ].join('\n'),
    buttons: [
      [{ id: `club_find_${gymId}`, text: '🗓 Знайти слот' }],
      [{ id: `nearby_slots_${gymId}`, text: '📅 Слоти сьогодні' }],
      [{ id: 'menu_clubs', text: '◀️ До клубів' }],
    ],
  };
}

function gymDetailMenu(gymId: number, userLat?: number, userLng?: number): BotReply {
  const gym = service.getGym(gymId);
  if (!gym) return { text: 'Зал не знайдено.', buttons: [[{ id: 'menu_nearby', text: '◀️ Назад' }]] };
  const slots = service.countAvailableSlotsToday(gymId, today());
  let distLine = '';
  if (userLat != null && userLng != null) {
    const found = service.getGymsSortedByDistance(userLat, userLng, 20).find(g => g.id === gymId);
    if (found) distLine = `📏 ${formatDistance(found.distanceKm)} · ${walkMinutes(found.distanceKm)}`;
  }
  const rating = service.getGymGoogleRating(gymId);
  return {
    text: [`🏋️ <b>${gym.name}</b>`, `★ ${rating} Google`, `📍 ${gym.city}`, `🏠 ${gym.address}`, distLine, `🗓 Слотів сьогодні: <b>${slots}</b>`, '', gym.description, '', `📋 ${service.getCancellationPolicy(gymId)}`].filter(Boolean).join('\n'),
    buttons: [
      [{ id: `nearby_slots_${gymId}`, text: '🗓 Слоти на сьогодні' }],
      [{ id: `route_gym_${gymId}`, text: '🗺 Маршрут' }],
      [{ id: 'back_nearby', text: '◀️ До списку' }],
    ],
  };
}

function gymTodaySlotsMenu(gymId: number, offset = 0): BotReply {
  const gym = service.getGym(gymId);
  const slots = service.searchTrainings({ gymId, date: today(), onlyAvailable: true })
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  if (!slots.length) {
    return {
      text: `😔 Сьогодні немає вільних слотів у <b>${gym?.name ?? 'залі'}</b>.`,
      buttons: [[{ id: `nearby_gym_${gymId}`, text: '◀️ До залу' }], [{ id: 'back_nearby', text: '📍 Інші зали' }]],
    };
  }
  const page = slots.slice(offset, offset + 6);
  const slotBtns: TgButton[] = page.map(t => {
    const time = t.dateTime.split(' ')[1]?.slice(0, 5) ?? '';
    return { id: `slot_${t.id}`, text: `${time} ${t.title.slice(0, 18)} · ${service.freeSpots(t)}` };
  });
  const nav: TgButton[] = [];
  if (offset > 0) nav.push({ id: `nearby_slots_prev_${gymId}`, text: '◀️' });
  if (offset + 6 < slots.length) nav.push({ id: `nearby_slots_next_${gymId}`, text: '▶️' });
  return {
    text: `🗓 Слоти · <b>${gym?.name}</b>\n${slots.length} вільних:`,
    buttons: [
      ...chunkButtons(slotBtns, 1),
      ...(nav.length ? [nav] : []),
      [{ id: `nearby_gym_${gymId}`, text: '◀️ До залу' }],
    ],
  };
}

export function getDiscoverWelcome(): BotReply {
  return {
    text: [
      '👋 <b>BeFitNow Bot</b>',
      '',
      'Привіт!',
      '',
      'Дивіться клуби та тренування <b>без реєстрації</b>.',
      'При записі: спочатку ім\'я та телефон, потім слот.',
    ].join('\n'),
    buttons: [[{ id: 'start_bot', text: '▶️ Почати' }]],
  };
}

export function initialDiscoverContext(): BotContext {
  return { step: 'welcome', filterCity: loadSavedCity(), locationSet: false };
}

/** Book · Enter details — крок 1 перед Choose slot (story map). */
function bookEnterDetailsPrompt(backId = 'menu_discover'): BotReply {
  return {
    text: [
      '📝 <b>Запис на тренування · Введення даних</b>',
      '',
      '<b>Реєстрація</b> — ім\'я та телефон.',
      'Далі: вибір слоту → підтвердження.',
      '',
      'Введіть <b>ім\'я</b> у чат.',
    ].join('\n'),
    buttons: [[{ id: backId, text: '◀️ Назад' }]],
  };
}

function startBookEnterDetails(
  ctx: BotContext,
  pendingAction: string,
): BotContext {
  return { ...ctx, step: 'book_enter', bookingStep: 'name', pendingBookAction: pendingAction, pendingTrainingId: undefined };
}

/** Якщо немає профілю — Enter details перед Choose slot. */
function requireBookProfile(
  userId: number,
  userName: string,
  actionId: string,
  ctx: BotContext,
  replies: BotReply[],
): BotContext | null {
  if (hasBookingProfile(userId, userName)) return null;
  replies.push(bookEnterDetailsPrompt());
  return startBookEnterDetails(ctx, actionId);
}

export function handleBookingInput(
  text: string,
  ctx: BotContext,
): { reply: BotReply; ctx: BotContext; result: BookingInputResult; extraReply?: BotReply } {
  const step = ctx.bookingStep;

  if (step === 'name') {
    const name = text.trim();
    if (!name) {
      return {
        reply: { text: '❌ Введіть ім\'я (як до вас звертатись).' },
        ctx,
        result: { kind: 'none' },
      };
    }
    return {
      reply: {
        text: [
          '📝 <b>Запис · Введення даних</b>',
          '',
          `👤 ${name}`,
          '',
          'Введіть <b>номер телефону</b> для запису.',
          'Формат: +380501112233',
        ].join('\n'),
      },
      ctx: { ...ctx, guestName: name, bookingStep: 'phone' },
      result: { kind: 'none' },
    };
  }

  if (step === 'phone') {
    const trainingId = ctx.pendingTrainingId;
    const pendingAction = ctx.pendingBookAction;
    const name = ctx.guestName;
    if (!name) {
      return { reply: bookEnterDetailsPrompt(), ctx, result: { kind: 'none' } };
    }
    const user = service.ensureUser(name, text);
    if (!user) {
      return {
        reply: { text: '❌ Невірний номер. Формат: +380501112233' },
        ctx,
        result: { kind: 'none' },
      };
    }
    const cleared: BotContext = {
      ...ctx,
      bookingStep: undefined,
      guestName: undefined,
      pendingTrainingId: undefined,
      pendingBookAction: undefined,
    };
    if (trainingId) {
      return {
        reply: confirmBookingMenu(trainingId, user.id, user.name, user.phone ?? text),
        ctx: cleared,
        result: { kind: 'user', user },
      };
    }
    if (pendingAction) {
      return {
        reply: {
          text: `✅ <b>Реєстрація готова</b>, ${user.name.split(' ')[0]}!\n\n📌 <b>Вибір слота</b> — оберіть слот:`,
        },
        ctx: cleared,
        result: { kind: 'user', user, resumeActionId: pendingAction },
      };
    }
    return { reply: { text: '✅ Дані збережено.', buttons: [[{ id: 'menu_discover', text: '🔍 Пошук' }]] }, ctx: cleared, result: { kind: 'user', user } };
  }

  if (step === 'lookup_phone') {
    const user = service.findUserByPhone(text);
    if (!user) {
      return {
        reply: {
          text: '❌ Записів за цим номером немає.\nСпочатку забронюйте тренування.',
          buttons: [[{ id: 'menu_discover', text: '🔍 Пошук' }]],
        },
        ctx: { ...ctx, bookingStep: undefined },
        result: { kind: 'none' },
      };
    }
    return {
      reply: bookingsMenu(user.id, 'active'),
      ctx: { ...ctx, bookingStep: undefined },
      result: { kind: 'user', user },
      extraReply: undefined,
    };
  }

  return { reply: { text: '' }, ctx, result: { kind: 'none' } };
}

function typeMenu(ctx: BotContext): BotReply {
  const city = cityLabel(ctx);
  const typeBtns: TgButton[] = WORKOUT_TYPES.map(t => ({
    id: `type_${t}`,
    text: TRAINING_TYPE_LABELS[t],
  }));
  return {
    text: `🏋️ <b>Оберіть тип тренування</b>\n📍 ${city}:`,
    buttons: [
      ...chunkButtons(typeBtns),
      [{ id: 'back_main', text: '🏠 Меню' }],
    ],
  };
}

function dateMenu(ctx: BotContext): BotReply {
  const week: TgButton[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(DEMO_TODAY);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const summary = service.getScheduleDaySummary(cityLabel(ctx), iso);
    week.push({ id: `date_${iso}`, text: `${formatDateLabel(iso)} (${summary.available})` });
  }
  const gym = ctx.filterGymId ? service.getGym(ctx.filterGymId) : null;
  const typeLabel = ctx.filterType && ctx.filterType !== 'all'
    ? TRAINING_TYPE_LABELS[ctx.filterType]
    : '—';
  return {
    text: `📅 Оберіть дату\n📍 ${cityLabel(ctx)} · ${typeLabel}${gym ? ` · ${gym.name}` : ''}:`,
    buttons: [
      [{ id: `date_${today()}`, text: '📍 Сьогодні' }, { id: `date_${tomorrow()}`, text: '📍 Завтра' }],
      ...chunkButtons(week, 2),
      [{ id: 'back_gyms', text: '◀️ Змінити клуб' }],
      [{ id: 'back_types', text: '◀️ Змінити тип' }],
    ],
  };
}

function slotsMenu(_userId: number, ctx: BotContext): BotReply {
  const offset = ctx.slotOffset ?? 0;
  const slots = searchSlots(ctx, true);
  if (!slots.length) {
    return {
      text: `😔 Немає вільних слотів за цими фільтрами.`,
      buttons: [
        [{ id: 'back_dates', text: '◀️ Інша дата' }],
        [{ id: 'back_gyms', text: '🏢 Інший клуб' }],
        [{ id: 'back_main', text: '🏠 Меню' }],
      ],
    };
  }
  const page = slots.slice(offset, offset + 6);
  const slotBtns: TgButton[] = page.map(t => {
    const gym = service.getGym(t.gymId);
    const time = t.dateTime.split(' ')[1]?.slice(0, 5) ?? '';
    return { id: `slot_${t.id}`, text: `${time} ${t.title.slice(0, 14)} · ${gym?.name.slice(0, 8) ?? ''} · ${service.freeSpots(t)}` };
  });
  const nav: TgButton[] = [];
  if (offset > 0) nav.push({ id: 'slots_prev', text: '◀️' });
  if (offset + 6 < slots.length) nav.push({ id: 'slots_next', text: '▶️' });
  return {
    text: `✅ ${slots.length} слотів · ${cityLabel(ctx)} · ${ctx.filterDate ? formatDateLabel(ctx.filterDate) : ''}`,
    buttons: [
      ...chunkButtons(slotBtns, 1),
      ...(nav.length ? [nav] : []),
      [{ id: 'back_dates', text: '◀️ Інша дата' }],
    ],
  };
}

function slotDetail(trainingId: number, userId: number): BotReply {
  const t = service.getTraining(trainingId);
  if (!t) return { text: 'Тренування не знайдено.', buttons: [[{ id: 'back_main', text: '🏠 Меню' }]] };
  const gym = service.getGym(t.gymId);
  const free = service.freeSpots(t);
  const meta = service.getTrainingDetails(t);
  const hasTrainer = t.trainer && t.trainer !== '—';
  const trainer = hasTrainer ? service.getTrainerProfile(t.trainer) : null;
  const conflict = service.hasTimeConflict(userId, trainingId);
  const lines = [
    '📋 <b>Деталі</b>',
    '',
    `🏋️ <b>${t.title}</b>`,
    `📅 ${t.dateTime}`,
    hasTrainer ? `👤 ${service.formatTrainerName(t.trainer)}${trainer ? ` ★ ${trainer.averageRating}` : ''}` : '🏊 Без тренера (басейн)',
    `📊 Складність: ${meta.difficulty}`,
    `⏱ ${t.durationMinutes} хв · 💰 <b>${t.price} грн</b>`,
    `📍 ${gym ? `${gym.name} ★${service.getGymGoogleRating(t.gymId)}` : ''}`,
    `👥 Вільно: <b>${free}</b> / ${t.maxParticipants}`,
    '',
    t.description,
    '',
    `🎒 Взяти з собою: ${meta.whatToBring}`,
    '',
    `📋 Скасування: ${gym ? service.getCancellationPolicy(t.gymId) : 'за правилами клубу'}`,
  ];
  if (conflict) lines.push('', `⚠️ <b>Увага:</b> у вас вже є запис на цей час — «${conflict.title}»`);
  const buttons: TgButton[][] = [];
  if (free > 0 && !conflict) {
    buttons.push([{ id: `confirm_${t.id}`, text: '✅ Записатися' }]);
  } else if (free > 0 && conflict) {
    buttons.push([{ id: `confirm_${t.id}`, text: '⚠️ Все одно записатися' }]);
  } else {
    buttons.push([{ id: `alts_${t.id}`, text: '🔄 Альтернативи' }]);
  }
  if (hasTrainer) {
    buttons.push([{ id: `trainer_from_slot_${encodeURIComponent(t.trainer)}`, text: '👤 Про тренера' }]);
  }
  if (gym) buttons.push([{ id: `club_${gym.id}`, text: '🏢 Про клуб' }]);
  buttons.push([{ id: 'back_slots', text: '◀️ До списку' }]);
  return { text: lines.join('\n'), buttons };
}

function confirmBookingMenu(
  trainingId: number,
  userId: number,
  userName: string,
  userPhone: string,
): BotReply {
  const t = service.getTraining(trainingId);
  if (!t) return { text: 'Тренування не знайдено.', buttons: [[{ id: 'back_main', text: '🏠 Меню' }]] };
  const profile = service.getProfile(userId);
  const name = profile?.name ?? userName;
  const phone = profile?.phone ?? userPhone;
  const gym = service.getGym(t.gymId);
  const conflict = service.hasTimeConflict(userId, trainingId);
  const lines = [
    '📝 <b>Запис · Підтвердження</b>',
    '',
    `👤 ${name}`,
    `📱 ${phone}`,
    '',
    `🏋️ ${t.title}`,
    `📅 ${t.dateTime}`,
    `📍 ${gym?.name}, ${gym?.city}`,
    `💰 ${t.price} грн`,
    '',
    `📋 ${gym ? service.getCancellationPolicy(gym.id) : ''}`,
  ];
  if (conflict) lines.push('', `⚠️ <b>Увага:</b> у вас вже є «${conflict.title}» на цей час.`);
  return {
    text: lines.join('\n'),
    buttons: [
      [{
        id: conflict ? `book_confirm_${trainingId}_force` : `book_confirm_${trainingId}`,
        text: conflict ? '⚠️ Все одно підтвердити' : '✅ Підтвердити запис',
      }],
      [{ id: `slot_${trainingId}`, text: '◀️ Назад' }],
    ],
  };
}

function paymentReviewMenu(trainingId: number, userId: number, bookingId: number): BotReply {
  const t = service.getTraining(trainingId);
  if (!t) return { text: 'Помилка.', buttons: [[{ id: 'back_main', text: '🏠 Меню' }]] };
  const gym = service.getGym(t.gymId);
  const payment = service.createPayment(userId, trainingId);
  const lines = [
    '💳 <b>Оплата</b>',
    '',
    `Запис BFN-${bookingId} створено — далі оплата в клубі`,
    '',
    `🏋️ ${t.title}`,
    `📅 ${t.dateTime}`,
    `📍 ${gym?.name}`,
    `💰 До сплати: <b>${t.price} грн</b>`,
    '',
    'ℹ️ Оплату обробляє клуб. Натисніть «Оплатити» — відкриється сторінка клубу.',
  ];
  return {
    text: lines.join('\n'),
    buttons: [
      [{ id: `pay_go_${bookingId}_${payment?.paymentId ?? 0}`, text: '💳 Оплатити' }],
      [{ id: 'menu_bookings', text: '📋 Мої записи' }],
      [{ id: 'back_main', text: '🏠 Меню' }],
    ],
  };
}

function paymentCheckoutUrl(paymentId: number, trainingId: number): string | undefined {
  const t = service.getTraining(trainingId);
  const gym = t ? service.getGym(t.gymId) : null;
  if (!gym) return undefined;
  return `https://pay.${gym.name.toLowerCase().replace(/\s/g, '')}.club.ua/checkout?ref=BFN-PAY-${paymentId}`;
}

function alternativesMenu(trainingId: number): BotReply {
  const alts = service.findAlternatives(trainingId).slice(0, 6);
  if (!alts.length) {
    return {
      text: '😔 Альтернатив немає.',
      buttons: [[{ id: 'menu_find', text: '🗓 Новий пошук' }]],
    };
  }
  return {
    text: '🔄 Альтернативні слоти:',
    buttons: [
      ...chunkButtons(alts.map(t => {
        const time = t.dateTime.split(' ')[1]?.slice(0, 5) ?? '';
        return { id: `slot_${t.id}`, text: `${time} ${t.title.slice(0, 16)}` };
      }), 1),
      [{ id: `slot_${trainingId}`, text: '◀️ Назад' }],
    ],
  };
}

function trainersMenu(ctx: BotContext): BotReply {
  const city = cityLabel(ctx);
  const trainers = service.getTrainersInCity(city);
  if (!trainers.length) {
    return { text: `Немає тренерів у ${city}.`, buttons: [[{ id: 'menu_city', text: '🏙 Змінити місто' }], [{ id: 'back_main', text: '◀️ Меню' }]] };
  }
  return {
    text: `👤 <b>Знайти тренера</b> · ${city}\nОберіть тренера:`,
    buttons: [
      ...chunkButtons(trainers.map(tr => ({
        id: `trainer_${encodeURIComponent(tr.name)}`,
        text: `${tr.name} ★${tr.averageRating}`,
      })), 1),
      [{ id: 'back_main', text: '◀️ Меню' }],
    ],
  };
}

function trainerDetailMenu(trainerName: string): BotReply {
  const profile = service.getTrainerProfile(trainerName);
  if (!profile) return { text: 'Тренер не знайдено.', buttons: [[{ id: 'menu_trainers', text: '◀️ Назад' }]] };
  const gym = profile.gymId ? service.getGym(profile.gymId) : null;
  const lines = [
    `👤 <b>${service.formatTrainerName(profile.name)}</b>`,
    `★ ${profile.averageRating} (${profile.reviewCount} відгуків)`,
    gym ? `📍 ${gym.name}, ${gym.city}` : '',
    profile.available ? '✅ Доступний' : '❌ Недоступний',
    '',
    profile.qualifications,
    profile.certificates.length ? `\n📜 ${profile.certificates.join(', ')}` : '',
  ].filter(Boolean);
  return {
    text: lines.join('\n'),
    buttons: [
      [{ id: `trainer_schedule_${encodeURIComponent(trainerName)}`, text: '🗓 Розклад тренера' }],
      [{ id: 'menu_trainers', text: '◀️ До списку' }],
    ],
  };
}

function trainerScheduleMenu(trainerName: string, ctx: BotContext, offset = 0): BotReply {
  const date = ctx.filterDate ?? today();
  const slots = service.getTrainingsForTrainerOnDate(trainerName, date);
  if (!slots.length) {
    return {
      text: `😔 Немає занять у <b>${trainerName}</b> на ${formatDateLabel(date)}.`,
      buttons: [[{ id: `trainer_${encodeURIComponent(trainerName)}`, text: '◀️ До тренера' }]],
    };
  }
  const page = slots.slice(offset, offset + 6);
  return {
    text: `🗓 <b>${trainerName}</b>\n${formatDateLabel(date)} · ${slots.length} занять:`,
    buttons: [
      ...chunkButtons(page.map(t => {
        const free = service.freeSpots(t);
        const time = t.dateTime.split(' ')[1]?.slice(0, 5) ?? '';
        return { id: `slot_${t.id}`, text: `${time} ${t.title.slice(0, 14)} · ${free > 0 ? free : 'заповн.'}` };
      }), 1),
      [{ id: `trainer_${encodeURIComponent(trainerName)}`, text: '◀️ До тренера' }],
    ],
  };
}

function scheduleBrowseMenu(ctx: BotContext): BotReply {
  const city = cityLabel(ctx);
  const week: TgButton[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(DEMO_TODAY);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const s = service.getScheduleDaySummary(city, iso);
    week.push({ id: `sched_date_${iso}`, text: `${formatDateLabel(iso)} (${s.available}/${s.total})` });
  }
  return {
    text: `📅 <b>Перегляд розкладу</b> · ${city}\nВільні / всього слотів:`,
    buttons: [
      ...chunkButtons(week, 2),
      [{ id: 'menu_city', text: '🏙 Змінити місто' }],
      [{ id: 'back_main', text: '◀️ Меню' }],
    ],
  };
}

function scheduleDayMenu(ctx: BotContext, date: string, offset = 0): BotReply {
  const slots = service.searchTrainings({ city: cityLabel(ctx), date })
    .sort((a, b) => a.dateTime.localeCompare(b.dateTime));
  if (!slots.length) {
    return {
      text: `😔 Немає занять ${formatDateLabel(date)} у ${cityLabel(ctx)}.`,
      buttons: [[{ id: 'menu_find', text: '◀️ До пошуку' }]],
    };
  }
  const page = slots.slice(offset, offset + 6);
  return {
    text: `📅 <b>${formatDateLabel(date)}</b> · ${cityLabel(ctx)}\n${slots.length} занять:`,
    buttons: [
      ...chunkButtons(page.map(t => {
        const time = t.dateTime.split(' ')[1]?.slice(0, 5) ?? '';
        const gym = service.getGym(t.gymId);
        const free = service.freeSpots(t);
        return { id: `slot_${t.id}`, text: `${time} ${t.title.slice(0, 12)} · ${gym?.name.slice(0, 6) ?? ''} · ${free}` };
      }), 1),
      [{ id: 'menu_schedule', text: '◀️ До розкладу' }],
    ],
  };
}

function bookingsMenu(userId: number, tab: 'active' | 'history' = 'active'): BotReply {
  const tabs: TgButton[] = [
    { id: 'bookings_tab_active', text: tab === 'active' ? '✓ Активні' : 'Активні' },
    { id: 'bookings_tab_history', text: tab === 'history' ? '✓ Історія' : 'Історія' },
  ];

  if (tab === 'history') {
    const history = service.getBookingHistory(userId);
    if (!history.length) {
      return {
        text: '📋 Історія порожня.',
        buttons: [tabs, [{ id: 'back_main', text: '◀️ Меню' }]],
      };
    }
    const btns = history.map(b => {
      const t = service.getTraining(b.trainingId);
      return { id: `booking_${b.id}`, text: `${b.status} · ${t?.title.slice(0, 20) ?? 'Запис'}` };
    });
    return { text: `📋 Історія (${history.length}):`, buttons: [tabs, ...chunkButtons(btns, 1), [{ id: 'back_main', text: '◀️ Меню' }]] };
  }

  const bookings = service.getUserBookings(userId);
  if (!bookings.length) {
    return {
      text: '📋 Немає активних записів.',
      buttons: [tabs, [{ id: 'menu_find', text: '🗓 Знайти тренування' }], [{ id: 'back_main', text: '◀️ Меню' }]],
    };
  }
  const btns = bookings.map(b => {
    const t = service.getTraining(b.trainingId);
    const time = t?.dateTime.split(' ')[1]?.slice(0, 5) ?? '';
    return { id: `booking_${b.id}`, text: `${time} ${t?.title.slice(0, 22) ?? 'Запис'}` };
  });
  return {
    text: `📋 Активні записи (${bookings.length}):`,
    buttons: [tabs, ...chunkButtons(btns, 1), [{ id: 'back_main', text: '◀️ Меню' }]],
  };
}

function bookingDetail(bookingId: number, userId: number): BotReply {
  const b = service.getAllBookings().find(x => x.id === bookingId && x.userId === userId);
  const t = b ? service.getTraining(b.trainingId) : null;
  if (!b || !t) return { text: 'Запис не знайдено.', buttons: [[{ id: 'menu_bookings', text: '◀️ Назад' }]] };
  const gym = service.getGym(t.gymId);
  const isActive = b.status === 'Confirmed';
  const lateHours = gym?.lateCancelHours ?? 3;
  const penalty = isActive && !service.canCancelWithoutPenalty(bookingId);
  const lines = [
    `📋 Запис BFN-${b.id} · ${b.status}`,
    `🏋️ ${t.title}`,
    `📅 ${t.dateTime}`,
    `📍 ${gym ? `${gym.name}, ${gym.city}` : ''}`,
    `💰 ${t.price} грн`,
    '',
    penalty
      ? `⚠️ Скасування менш ніж за ${lateHours} год — повна вартість.`
      : `✅ Безкоштовне скасування (більше ${lateHours} год до початку).`,
  ];
  const buttons: TgButton[][] = [];
  if (isActive) {
    buttons.push([{ id: `cancel_${b.id}`, text: '❌ Скасувати' }]);
  }
  buttons.push([{ id: 'menu_bookings', text: '◀️ Назад' }]);
  return { text: lines.join('\n'), buttons };
}

function notificationsMenu(userEmail: string): BotReply {
  const items = service.getNotifications(userEmail).slice(0, 8);
  if (!items.length) {
    return {
      text: '🔔 Сповіщень поки немає.',
      buttons: [
        [{ id: 'notif_prefs', text: '⚙️ Налаштування' }],
        [{ id: 'back_main', text: '◀️ Меню' }],
      ],
    };
  }
  const typeIcon: Record<string, string> = {
    Reminder: '⏰', ScheduleChange: '📅', FreeSpot: '🎉', Promotion: '📢',
  };
  const btns = items.map(n => ({
    id: `notif_${n.id}`,
    text: `${typeIcon[n.type] ?? '🔔'} ${n.message.slice(0, 28)}${n.read ? '' : ' •'}`,
  }));
  return {
    text: `🔔 <b>Сповіщення</b> (${service.getUnreadNotificationCount(userEmail)} нових):`,
    buttons: [
      ...chunkButtons(btns, 1),
      [{ id: 'notif_read_all', text: '✓ Прочитати всі' }],
      [{ id: 'notif_prefs', text: '⚙️ Налаштування' }],
      [{ id: 'back_main', text: '◀️ Меню' }],
    ],
  };
}

function notificationPrefsMenu(userId: number): BotReply {
  const p = service.getPreferences(userId);
  const toggle = (key: string, label: string, on: boolean) => ({
    id: `pref_${key}_${on ? 'off' : 'on'}`,
    text: `${on ? '✅' : '⬜'} ${label}`,
  });
  return {
    text: '⚙️ <b>Налаштування сповіщень</b>',
    buttons: [
      [toggle('reminders', 'Нагадування', p.reminders)],
      [toggle('slotAlerts', 'Алерт вільного місця', p.slotAlerts)],
      [toggle('scheduleChanges', 'Зміни розкладу', p.scheduleChanges)],
      [toggle('reminder24', 'За 24 год', p.reminderTimes.before24h)],
      [toggle('reminder2', 'За 2 год', p.reminderTimes.before2h)],
      [toggle('reminder30', 'За 30 хв', p.reminderTimes.before30m)],
      [{ id: 'menu_notifications', text: '◀️ Назад' }],
    ],
  };
}

function supportMenu(): BotReply {
  return {
    text: '💬 <b>Підтримка</b>\nОберіть:',
    buttons: [
      [{ id: 'menu_faq', text: '❓ FAQ' }],
      [{ id: 'support_chat', text: '💬 Чат з адміном' }],
      [{ id: 'support_escalate', text: '👨‍💼 Зв\'язати з клубом' }],
      [{ id: 'back_main', text: '◀️ Меню' }],
    ],
  };
}

function faqMenu(): BotReply {
  const faq = service.getFaq();
  return {
    text: '❓ <b>Часті питання</b>',
    buttons: [
      ...chunkButtons(faq.map((f, i) => ({ id: `faq_${i}`, text: f.question.slice(0, 30) })), 1),
      [{ id: 'menu_support', text: '◀️ Назад' }],
    ],
  };
}

function faqDetail(index: number): BotReply {
  const faq = service.getFaq();
  const entry = faq[index];
  if (!entry) return { text: 'Не знайдено.', buttons: [[{ id: 'menu_faq', text: '◀️ FAQ' }]] };
  return {
    text: `❓ <b>${entry.question}</b>\n\n${entry.answer}`,
    buttons: [[{ id: 'menu_faq', text: '◀️ До списку FAQ' }], [{ id: 'menu_support', text: '💬 Підтримка' }]],
  };
}

function helpMenu(): BotReply {
  return {
    text: [
      '❓ <b>Story Map · Client</b>',
      '',
      '<b>Пошук</b> — без реєстрації',
      'Оберіть локацію → знайдіть клуб / тренування / тренера → перегляньте розклад',
      '',
      '<b>Запис на тренування</b>',
      'Оберіть слот → введіть дані (ім\'я + телефон) → підтвердьте запис',
      '',
      '<b>Оплата</b> → сторінка клубу',
      '<b>Manage booking</b> → Мої записи, скасування',
      '<b>Get notification</b> → пасивні нагадування',
      '<b>Get support</b> → FAQ, чат з адміном',
    ].join('\n'),
    buttons: [[{ id: 'menu_support', text: '💬 Підтримка' }], [{ id: 'back_main', text: '🏠 Меню' }]],
  };
}

export function loadSavedCity() {
  return localStorage.getItem('befitnow_city') ?? DEFAULT_CITY;
}

export function loadLocationSet(): boolean {
  return localStorage.getItem('befitnow_location_set') === '1';
}

export function saveCity(city: string) {
  localStorage.setItem('befitnow_city', city);
  localStorage.setItem('befitnow_location_set', '1');
}

export const GEO_ACTIONS = new Set(['geo_allow', 'geo_refresh']);
export const PAYMENT_ACTIONS_PREFIX = 'pay_go_';

export function getGymRouteUrl(gymId: number): string | null {
  const gym = service.getGym(gymId);
  if (!gym) return null;
  return mapsUrl(gym.latitude, gym.longitude, `${gym.name}, ${gym.address}`);
}

export function handleNearbyLocation(lat: number, lng: number, ctx: BotContext) {
  const detectedCity = detectNearestCity(lat, lng);
  const newCtx: BotContext = {
    ...ctx,
    step: 'nearby_radius',
    userLat: lat,
    userLng: lng,
    ...(detectedCity ? { filterCity: detectedCity } : {}),
  };
  if (detectedCity) saveCity(detectedCity);
  return {
    replies: [
      { text: `✅ Локацію отримано${detectedCity ? ` · <b>${detectedCity}</b>` : ''}` },
      radiusMenu(),
    ] as BotReply[],
    ctx: { ...newCtx, locationSet: true },
  };
}

function decodeTrainerName(encoded: string) {
  try { return decodeURIComponent(encoded); } catch { return encoded; }
}

export function handleBotAction(
  actionId: string,
  userId: number,
  userName: string,
  userEmail: string,
  ctx: BotContext,
): { replies: BotReply[]; ctx: BotContext } {
  let newCtx = { ...ctx };
  const replies: BotReply[] = [];
  const loggedIn = userId > 0;

  if (actionId === 'auth_logout') {
    replies.push({ text: '👋 До зустрічі! Можете знову переглядати без реєстрації.' });
    return { replies, ctx: initialDiscoverContext() };
  }

  if (actionId === 'start_bot') {
    newCtx = { ...newCtx, step: 'location' };
    replies.push(locationMenu(newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId === 'welcome_back') {
    newCtx = { ...newCtx, step: 'welcome' };
    replies.push(getDiscoverWelcome());
    return { replies, ctx: newCtx };
  }

  if (actionId === 'back_main' || actionId === 'menu_discover') {
    newCtx = { ...newCtx, supportMode: false, supportTicketId: undefined };
    if (!newCtx.locationSet) {
      if (newCtx.step === 'location') {
        newCtx = { ...newCtx, step: 'welcome' };
        replies.push(getDiscoverWelcome());
      } else {
        newCtx = { ...newCtx, step: 'location' };
        replies.push(locationMenu(newCtx));
      }
    } else {
      newCtx = { ...newCtx, step: 'search' };
      replies.push(discoverMenu(newCtx, userEmail, loggedIn));
    }
    return { replies, ctx: newCtx };
  }

  if (actionId === 'menu_location') {
    replies.push(locationMenu(newCtx));
    return { replies, ctx: { ...newCtx, step: 'location' } };
  }

  // --- City / gym / find flow ---
  if (actionId === 'menu_city' || actionId === 'back_cities') {
    newCtx = { ...newCtx, step: 'location' };
    replies.push(locationMenu(newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('city_')) {
    const city = slugToCity(actionId.slice(5));
    newCtx = {
      ...newCtx,
      step: 'search',
      filterCity: city,
      filterGymId: undefined,
      slotOffset: 0,
      locationSet: true,
    };
    saveCity(city);
    replies.push({ text: `✅ <b>Локація:</b> ${city}` });
    replies.push(discoverMenu(newCtx, userEmail, loggedIn));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('gym_')) {
    const gymId = parseInt(actionId.slice(4));
    newCtx = { ...newCtx, step: 'dates', filterGymId: gymId, slotOffset: 0 };
    const gym = service.getGym(gymId);
    replies.push({ text: `🏢 <b>${gym?.name ?? 'Клуб'}</b>\nОберіть дату:` });
    replies.push(dateMenu(newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId === 'back_gyms') {
    newCtx = { ...newCtx, step: 'gyms', filterGymId: undefined, slotOffset: 0 };
    replies.push(gymFilterMenu(newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId === 'menu_clubs') {
    if (!newCtx.filterCity) newCtx.filterCity = loadSavedCity();
    const loc = ensureLocationStep(newCtx, replies);
    if (loc) return { replies, ctx: loc };
    replies.push(clubsMenu(newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('club_find_')) {
    const profile = requireBookProfile(userId, userName, actionId, newCtx, replies);
    if (profile) return { replies, ctx: profile };
    newCtx = {
      ...newCtx,
      filterGymId: undefined,
      filterType: undefined,
      step: 'types',
      slotOffset: 0,
    };
    replies.push({ text: '🗓 <b>Вибір слота</b>\nСпочатку оберіть тип тренування:' });
    replies.push(typeMenu(newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('club_')) {
    const gymId = parseInt(actionId.slice(5));
    replies.push(clubDetailMenu(gymId));
    return { replies, ctx: newCtx };
  }

  if (actionId === 'menu_pool') {
    if (!newCtx.filterCity) newCtx.filterCity = loadSavedCity();
    const loc = ensureLocationStep(newCtx, replies);
    if (loc) return { replies, ctx: loc };
    const profile = requireBookProfile(userId, userName, 'menu_pool', newCtx, replies);
    if (profile) return { replies, ctx: profile };
    newCtx = { ...newCtx, filterType: 'Aqua', step: 'gyms', slotOffset: 0, filterGymId: undefined };
    replies.push({ text: '🏊 <b>Басейн</b>\nОберіть клуб:' });
    replies.push(gymFilterMenu(newCtx));
    return { replies, ctx: newCtx };
  }

  // --- Nearby ---
  if (actionId === 'menu_nearby' || actionId === 'back_nearby') {
    const { userLat, userLng, geoRadiusKm } = newCtx;
    if (userLat != null && userLng != null && geoRadiusKm) {
      newCtx = { ...newCtx, step: 'nearby' };
      replies.push(nearbyGymsMenu(userLat, userLng, geoRadiusKm));
    } else if (userLat != null && userLng != null) {
      replies.push(radiusMenu());
    } else {
      newCtx = { ...newCtx, step: 'nearby_request' };
      replies.push(nearbyRequestMenu());
    }
    return { replies, ctx: newCtx };
  }

  if (actionId === 'geo_pick_radius') {
    replies.push(radiusMenu());
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('geo_radius_')) {
    const km = parseFloat(actionId.slice(11));
    const { userLat, userLng } = newCtx;
    if (userLat == null || userLng == null) {
      replies.push(nearbyRequestMenu());
      return { replies, ctx: newCtx };
    }
    newCtx = { ...newCtx, geoRadiusKm: km, step: 'nearby', locationSet: true };
    const radiusLabel = km < 1 ? `${km * 1000} м` : `${km} км`;
    replies.push({ text: `✅ <b>Локація</b> (GPS · ${radiusLabel})` });
    replies.push(nearbyGymsMenu(userLat, userLng, km));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('nearby_gym_')) {
    const gymId = parseInt(actionId.slice(11));
    newCtx = { ...newCtx, step: 'nearby_gym', selectedGymId: gymId };
    replies.push(gymDetailMenu(gymId, newCtx.userLat, newCtx.userLng));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('nearby_slots_prev_')) {
    const gymId = parseInt(actionId.slice(18));
    replies.push(gymTodaySlotsMenu(gymId, Math.max(0, (newCtx.slotOffset ?? 0) - 6)));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('nearby_slots_next_')) {
    const gymId = parseInt(actionId.slice(18));
    replies.push(gymTodaySlotsMenu(gymId, (newCtx.slotOffset ?? 0) + 6));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('nearby_slots_')) {
    const gymId = parseInt(actionId.slice(13));
    replies.push(gymTodaySlotsMenu(gymId, 0));
    return { replies, ctx: newCtx };
  }

  // --- Find workout (Book: Enter details → Choose slot) ---
  if (actionId === 'menu_find') {
    if (!newCtx.filterCity) newCtx = { ...newCtx, filterCity: loadSavedCity() };
    const loc = ensureLocationStep(newCtx, replies);
    if (loc) return { replies, ctx: loc };
    const profile = requireBookProfile(userId, userName, 'menu_find', newCtx, replies);
    if (profile) return { replies, ctx: profile };
    newCtx = {
      ...newCtx,
      step: 'types',
      filterType: undefined,
      filterGymId: undefined,
      slotOffset: 0,
    };
    replies.push({ text: '🗓 <b>Вибір слота</b> · Знайти тренування\nТип → клуб → дата → слот' });
    replies.push(typeMenu(newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId === 'back_types') {
    newCtx = { ...newCtx, step: 'types', filterType: undefined, filterGymId: undefined, slotOffset: 0 };
    replies.push(typeMenu(newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('type_')) {
    const type = actionId.slice(5) as TrainingType;
    if (!WORKOUT_TYPES.includes(type)) {
      replies.push(typeMenu(newCtx));
      return { replies, ctx: newCtx };
    }
    newCtx = { ...newCtx, step: 'gyms', filterType: type, filterGymId: undefined, slotOffset: 0 };
    replies.push({ text: `🏋️ <b>${TRAINING_TYPE_LABELS[type]}</b>\nОберіть клуб:` });
    replies.push(gymFilterMenu(newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId === 'back_dates') {
    replies.push(dateMenu(newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('date_')) {
    newCtx = { ...newCtx, step: 'slots', filterDate: actionId.slice(5), slotOffset: 0 };
    replies.push(slotsMenu(userId, newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId === 'slots_next') {
    newCtx = { ...newCtx, slotOffset: (newCtx.slotOffset ?? 0) + 6 };
    replies.push(slotsMenu(userId, newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId === 'slots_prev') {
    newCtx = { ...newCtx, slotOffset: Math.max(0, (newCtx.slotOffset ?? 0) - 6) };
    replies.push(slotsMenu(userId, newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId === 'back_slots') {
    replies.push(slotsMenu(userId, newCtx));
    return { replies, ctx: newCtx };
  }

  // --- Slot / book / pay ---
  if (actionId.startsWith('slot_')) {
    const id = parseInt(actionId.slice(5));
    newCtx = { ...newCtx, step: 'slot_detail', selectedTrainingId: id };
    replies.push(slotDetail(id, userId));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('confirm_')) {
    const id = parseInt(actionId.slice(8));
    if (!id) {
      replies.push({ text: 'Невірний слот. Спробуйте обрати тренування знову.', buttons: [[{ id: 'menu_find', text: '🗓 Знайти' }]] });
      return { replies, ctx: newCtx };
    }
    const phone = service.getUserById(userId)?.phone ?? '';
    if (hasBookingProfile(userId, userName)) {
      replies.push(confirmBookingMenu(id, userId, userName, phone));
      return { replies, ctx: newCtx };
    }
    newCtx = {
      ...startBookEnterDetails(newCtx, `confirm_slot_${id}`),
      pendingTrainingId: id,
      pendingBookAction: undefined,
    };
    replies.push({
      text: [
        '📝 <b>Запис · Введення даних</b>',
        '',
        'Слот обрано. Перед <b>підтвердженням запису</b> вкажіть:',
        'Введіть <b>ім\'я</b> у чат.',
      ].join('\n'),
      buttons: [[{ id: `slot_${id}`, text: '◀️ Назад до слоту' }]],
    });
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('book_confirm_')) {
    const rest = actionId.slice(13);
    const force = rest.endsWith('_force');
    const trainingId = parseInt(force ? rest.slice(0, -6) : rest);
    const r = service.bookWorkout(userId, trainingId, false, force);
    if (r.success && r.bookingId) {
      newCtx = { ...newCtx, selectedBookingId: r.bookingId, allowDoubleBooking: undefined };
      const t = service.getTraining(trainingId);
      replies.push({
        text: [
          '✅ <b>Підтвердження бронювання</b>',
          `Код: <b>BFN-${r.bookingId}</b>`,
          '',
          `🏋️ ${t?.title ?? ''}`,
          `📅 ${t?.dateTime ?? ''}`,
        ].join('\n'),
      });
      replies.push(paymentReviewMenu(trainingId, userId, r.bookingId));
    } else {
      replies.push({ text: `❌ ${r.message}`, buttons: [[{ id: `slot_${trainingId}`, text: '◀️ Назад' }]] });
    }
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('pay_go_')) {
    const parts = actionId.slice(7).split('_');
    const bookingId = parseInt(parts[0]);
    const paymentId = parseInt(parts[1] ?? '0');
    const booking = service.getAllBookings().find(b => b.id === bookingId && b.userId === userId);
    const t = booking ? service.getTraining(booking.trainingId) : null;
    if (!booking || !t) {
      replies.push({ text: '❌ Запис не знайдено.', buttons: [[{ id: 'menu_bookings', text: '📋 Мої записи' }]] });
      return { replies, ctx: newCtx };
    }
    if (paymentId) service.completePayment(paymentId, bookingId);
    replies.push({
      text: [
        '💳 <b>Оплата</b> — перенаправляємо на сторінку клубу…',
        'ℹ️ Оплату обробляє клуб.',
        '',
        '📋 Керуйте записами у «Мої записи» (скасування).',
        '🔔 Нагадування надійдуть перед дедлайном скасування.',
      ].join('\n'),
      openUrl: paymentCheckoutUrl(paymentId, t.id),
      buttons: [
        [{ id: 'menu_bookings', text: '📋 Мої записи' }],
        [{ id: 'menu_notifications', text: '🔔 Нагадування' }],
        [{ id: 'menu_discover', text: '🔍 Новий пошук' }],
      ],
    });
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('alts_')) {
    replies.push(alternativesMenu(parseInt(actionId.slice(5))));
    return { replies, ctx: newCtx };
  }

  // --- Trainers ---
  if (actionId === 'menu_trainers') {
    if (!newCtx.filterCity) newCtx.filterCity = loadSavedCity();
    const loc = ensureLocationStep(newCtx, replies);
    if (loc) return { replies, ctx: loc };
    replies.push(trainersMenu(newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('trainer_from_slot_')) {
    const name = decodeTrainerName(actionId.slice(18));
    replies.push(trainerDetailMenu(name));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('trainer_schedule_')) {
    const name = decodeTrainerName(actionId.slice(17));
    replies.push(trainerScheduleMenu(name, newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('trainer_')) {
    const name = decodeTrainerName(actionId.slice(8));
    replies.push(trainerDetailMenu(name));
    return { replies, ctx: newCtx };
  }

  // --- Schedule browse ---
  if (actionId === 'menu_schedule') {
    if (!newCtx.filterCity) newCtx.filterCity = loadSavedCity();
    const loc = ensureLocationStep(newCtx, replies);
    if (loc) return { replies, ctx: loc };
    replies.push(scheduleBrowseMenu(newCtx));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('sched_date_')) {
    const date = actionId.slice(11);
    newCtx = { ...newCtx, filterDate: date };
    replies.push(scheduleDayMenu(newCtx, date));
    return { replies, ctx: newCtx };
  }

  // --- Bookings ---
  if (actionId === 'menu_bookings') {
    if (!loggedIn) {
      newCtx = { ...newCtx, step: 'bookings', bookingStep: 'lookup_phone' };
      replies.push({
        text: '📋 <b>Мої записи</b>\n\nВведіть <b>телефон</b>, який вказували при записі.\nФормат: +380501112233',
        buttons: [[{ id: 'menu_discover', text: '◀️ Назад' }]],
      });
      return { replies, ctx: newCtx };
    }
    newCtx = { ...newCtx, step: 'bookings', bookingsTab: 'active' };
    replies.push(bookingsMenu(userId, 'active'));
    return { replies, ctx: newCtx };
  }

  if (actionId === 'bookings_tab_active') {
    newCtx.bookingsTab = 'active';
    replies.push(bookingsMenu(userId, 'active'));
    return { replies, ctx: newCtx };
  }

  if (actionId === 'bookings_tab_history') {
    newCtx.bookingsTab = 'history';
    replies.push(bookingsMenu(userId, 'history'));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('booking_')) {
    replies.push(bookingDetail(parseInt(actionId.slice(8)), userId));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('cancel_')) {
    const id = parseInt(actionId.slice(7));
    const penalty = !service.canCancelWithoutPenalty(id);
    const msg = service.cancelBooking(userId, id);
    replies.push({
      text: `✅ ${msg}${penalty ? '\n\n💰 Списано повну вартість (< 3 год).' : ''}`,
      buttons: [[{ id: 'menu_bookings', text: '📋 Мої записи' }], [{ id: 'back_main', text: '🏠 Меню' }]],
    });
    return { replies, ctx: newCtx };
  }

  // --- Notifications ---
  if (actionId === 'menu_notifications') {
    if (!loggedIn || !userEmail) {
      replies.push({
        text: '🔔 Нагадування з\'являться після першого запису.\nВведіть телефон у «Мої записи», якщо вже бронювали.',
        buttons: [[{ id: 'menu_bookings', text: '📋 Мої записи' }], [{ id: 'menu_discover', text: '🔍 Пошук' }]],
      });
      return { replies, ctx: newCtx };
    }
    replies.push(notificationsMenu(userEmail));
    return { replies, ctx: newCtx };
  }

  if (actionId === 'notif_read_all') {
    service.markAllNotificationsRead(userEmail);
    replies.push(notificationsMenu(userEmail));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('notif_') && actionId !== 'notif_prefs' && actionId !== 'notif_read_all') {
    const notifId = parseInt(actionId.slice(6));
    service.markNotificationRead(notifId, userEmail);
    const n = service.getNotifications(userEmail).find(x => x.id === notifId);
    replies.push({
      text: n?.message ?? 'Сповіщення',
      buttons: [[{ id: 'menu_notifications', text: '◀️ Назад' }]],
    });
    return { replies, ctx: newCtx };
  }

  if (actionId === 'notif_prefs') {
    replies.push(notificationPrefsMenu(userId));
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('pref_')) {
    const p = service.getPreferences(userId);
    const parts = actionId.slice(5).split('_');
    const val = parts.pop() === 'on';
    const key = parts.join('_');
    const updated = { ...p, reminderTimes: { ...p.reminderTimes } };
    if (key === 'reminders') updated.reminders = val;
    else if (key === 'slotAlerts') updated.slotAlerts = val;
    else if (key === 'scheduleChanges') updated.scheduleChanges = val;
    else if (key === 'reminder24') updated.reminderTimes.before24h = val;
    else if (key === 'reminder2') updated.reminderTimes.before2h = val;
    else if (key === 'reminder30') updated.reminderTimes.before30m = val;
    service.updatePreferences(userId, updated);
    replies.push(notificationPrefsMenu(userId));
    return { replies, ctx: newCtx };
  }

  // --- Support ---
  if (actionId === 'menu_support') {
    replies.push(supportMenu());
    return { replies, ctx: newCtx };
  }

  if (actionId === 'menu_faq') {
    replies.push(faqMenu());
    return { replies, ctx: newCtx };
  }

  if (actionId.startsWith('faq_')) {
    replies.push(faqDetail(parseInt(actionId.slice(4))));
    return { replies, ctx: newCtx };
  }

  if (actionId === 'support_chat') {
    const chat = service.openSupportChat(userName, userEmail);
    newCtx = { ...newCtx, supportMode: true, supportTicketId: chat.ticketId };
    replies.push({
      text: chat.message + '\n\nНапишіть повідомлення. «/end» — завершити чат.',
      buttons: [[{ id: 'support_end', text: '✓ Завершити чат' }], [{ id: 'menu_support', text: '◀️ Назад' }]],
    });
    return { replies, ctx: newCtx };
  }

  if (actionId === 'support_end') {
    newCtx = { ...newCtx, supportMode: false, supportTicketId: undefined };
    replies.push({ text: '💬 Чат завершено. Дякуємо!', buttons: [[{ id: 'back_main', text: '🏠 Меню' }]] });
    return { replies, ctx: newCtx };
  }

  if (actionId === 'support_escalate') {
    const msg = service.escalateToHuman(userName, userEmail, 'Запит через бот');
    replies.push({
      text: `👨‍💼 ${msg}\n\nАдміністратор клубу відповість протягом 15 хв.`,
      buttons: [[{ id: 'back_main', text: '🏠 Меню' }]],
    });
    return { replies, ctx: newCtx };
  }

  if (actionId === 'menu_help') {
    replies.push(helpMenu());
    return { replies, ctx: newCtx };
  }

  replies.push({
    text: '🤔 Оберіть кнопку або напишіть «допомога».',
    buttons: hubMenu(newCtx, userEmail, loggedIn).buttons,
  });
  return { replies, ctx: newCtx };
}

export function handleBotText(
  text: string,
  userId: number,
  _userName: string,
  userEmail: string,
  ctx?: BotContext,
): { reply: BotReply; ctx: BotContext; user?: User; resumeActionId?: string } {
  const q = text.toLowerCase().trim();
  const currentCtx = ctx ?? initialDiscoverContext();
  const city = cityLabel(currentCtx);
  const loggedIn = userId > 0;

  if (currentCtx.bookingStep) {
    const { reply, ctx: nextCtx, result } = handleBookingInput(text, currentCtx);
    if (reply.text) {
      return {
        reply,
        ctx: nextCtx,
        user: result.kind === 'user' ? result.user ?? undefined : undefined,
        resumeActionId: result.kind === 'user' ? result.resumeActionId : undefined,
      };
    }
  }

  if (currentCtx.supportMode && currentCtx.supportTicketId) {
    if (q === '/end' || q === 'завершити') {
      return {
        reply: { text: '💬 Чат завершено.', buttons: [[{ id: 'back_main', text: '🏠 Меню' }]] },
        ctx: { ...currentCtx, supportMode: false, supportTicketId: undefined },
      };
    }
    const adminReply = service.sendSupportMessage(currentCtx.supportTicketId, userEmail, text);
    return {
      reply: {
        text: `👨‍💼 Адміністратор:\n${adminReply}`,
        buttons: [[{ id: 'support_end', text: '✓ Завершити чат' }]],
      },
      ctx: currentCtx,
    };
  }

  if (q === '/start' || q === 'старт' || q === 'меню') {
    const step = currentCtx.locationSet ? 'search' : 'location';
    return { reply: hubMenu(currentCtx, userEmail, loggedIn), ctx: { ...currentCtx, step } };
  }
  if (q === 'допомога' || q === 'help') {
    return { reply: helpMenu(), ctx: currentCtx };
  }
  if (q.includes('faq') || q.includes('питан')) {
    const hits = service.searchFaq(text);
    if (hits.length === 1) return { reply: { text: `❓ ${hits[0].answer}`, buttons: [[{ id: 'menu_faq', text: '📋 Всі FAQ' }]] }, ctx: currentCtx };
    return { reply: faqMenu(), ctx: currentCtx };
  }
  if (q.includes('поруч') || q.includes('ближ') || q.includes('геолок')) {
    return {
      reply: currentCtx.userLat != null && currentCtx.userLng != null
        ? nearbyGymsMenu(currentCtx.userLat, currentCtx.userLng)
        : nearbyRequestMenu(),
      ctx: currentCtx,
    };
  }

  const aiReply = service.processAI(userId, text, city);
  if (!aiReply.includes('Не зрозумів')) {
    return {
      reply: { text: aiReply, buttons: hubMenu(currentCtx, userEmail, loggedIn).buttons },
      ctx: currentCtx,
    };
  }

  return {
    reply: {
      text: 'Оберіть дію кнопкою або опишіть запит («знайти йогу завтра», «допомога»).',
      buttons: hubMenu(currentCtx, userEmail, loggedIn).buttons,
    },
    ctx: currentCtx,
  };
}

export const REPLY_KEYBOARD: TgButton[] = [
  { id: 'menu_discover', text: '🔍 Пошук' },
  { id: 'menu_bookings', text: '📋 Записи' },
  { id: 'menu_notifications', text: '🔔 Нагадування' },
  { id: 'menu_support', text: '💬 Підтримка' },
];
