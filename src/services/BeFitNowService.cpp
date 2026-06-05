#include "services/BeFitNowService.h"

#include <algorithm>
#include <chrono>
#include <cctype>
#include <ctime>
#include <iomanip>
#include <iterator>
#include <sstream>

namespace {

std::string toLower(std::string value) {
    std::transform(value.begin(), value.end(), value.begin(),
        [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return value;
}

bool containsIgnoreCase(const std::string& haystack, const std::string& needle) {
    return toLower(haystack).find(toLower(needle)) != std::string::npos;
}

}  // namespace

BeFitNowService::BeFitNowService() {
    seedDemoData();
}

void BeFitNowService::seedDemoData() {
    gyms_ = {
        {1, "FitZone Київ", "вул. Хрещатик, 15", "Сучасний зал з зоною кросфіту", true},
        {2, "PowerGym Львів", "пр. Свободи, 42", "Силові тренування та бодібілдинг", true},
        {3, "YogaSpace Одеса", "вул. Дерибасівська, 8", "Йога, пілатес та стретчинг", true},
        {4, "CrossFit Arena", "вул. Саксаганського, 30", "Функціональні тренування", true},
    };

    clubSettings_ = {
        {1, 3, 2, 1},
        {2, 4, 2, 1},
        {3, 2, 2, 1},
        {4, 5, 2, 1},
    };

    staff_ = {
        {1, 1, "Олена Коваль", "olena@fitzone.ua", StaffRole::Trainer},
        {2, 1, "Андрій Мельник", "andriy@fitzone.ua", StaffRole::Trainer},
        {3, 1, "Анна Адмін", "admin@befitnow.com", StaffRole::Admin},
        {4, 2, "Ігор Бондар", "igor@powergym.ua", StaffRole::Trainer},
        {5, 3, "Наталія Гринько", "natalia@yogaspace.ua", StaffRole::Trainer},
        {6, 4, "Дмитро Кравець", "dmitro@crossfit.ua", StaffRole::Trainer},
    };

    users_ = {
        {1, "Марія Іваненко", "maria@mail.ua", "1234", "+380501112233", 1},
        {2, "Петро Сидоренко", "petro@mail.ua", "1234", "+380672223344", std::nullopt},
    };
    nextUserId_ = 3;

    memberships_ = {
        {1, 1, "Стандарт 12 занять", 12, 1, 0, "2026-12-31", true},
    };
    nextMembershipId_ = 2;

    trainings_ = {
        {1, 1, "Ранкова йога", "Олена Коваль",
         "М'яка ранкова практика для всіх рівнів", "2026-06-10 08:00",
         TrainingType::Yoga, 60, 15, 1, 3, 2, 250.0},
        {2, 1, "HIIT тренування", "Андрій Мельник",
         "Інтенсивне спалювання калорій", "2026-06-10 18:00",
         TrainingType::HIIT, 45, 12, 0, 4, 2, 300.0},
        {3, 1, "Силове тренування", "Віктор Шевченко",
         "Робота з вагою та технікою", "2026-06-11 10:00",
         TrainingType::Strength, 90, 10, 0, 3, 2, 350.0},
        {4, 2, "Бодібілдинг", "Ігор Бондар",
         "Гіпертрофія та ізоляційні вправи", "2026-06-10 09:00",
         TrainingType::Bodybuilding, 120, 8, 0, 4, 2, 400.0},
        {5, 2, "Функціональний тренінг", "Марія Лисенко",
         "Рухи на витривалість і координацію", "2026-06-11 17:00",
         TrainingType::Functional, 60, 14, 0, 3, 2, 280.0},
        {6, 3, "Пілатес", "Наталія Гринько",
         "Зміцнення кору та гнучкість", "2026-06-10 11:00",
         TrainingType::Pilates, 55, 12, 0, 2, 2, 270.0},
        {7, 3, "Стретчинг", "Юлія Савченко",
         "Розтяжка та відновлення", "2026-06-12 19:00",
         TrainingType::Stretching, 45, 20, 0, 2, 2, 200.0},
        {8, 4, "CrossFit WOD", "Дмитро Кравець",
         "Workout of the Day — висока інтенсивність", "2026-06-10 07:00",
         TrainingType::CrossFit, 60, 16, 0, 5, 2, 320.0},
        {9, 4, "Важка атлетика", "Сергій Ткаченко",
         "Ривок, поштовх, техніка", "2026-06-11 16:00",
         TrainingType::Strength, 90, 10, 0, 4, 2, 380.0},
    };
    nextTrainingId_ = 10;

    bookings_ = {
        {1, 1, 1, BookingStatus::Confirmed, PaymentStatus::Paid,
         PaymentMethod::Membership, AttendanceStatus::NotVisited, "2026-06-05 09:00", std::nullopt},
    };
    nextBookingId_ = 2;

    faqEntries_ = {
        {"Як записатися на тренування?",
         "Оберіть слот, перегляньте відгуки та сертифікати тренера, підтвердіть запис — це 3 кроки."},
        {"Як скасувати або перенести запис?",
         "У \"Мої записи\" — скасування або перенесення. Зазвичай це потрібно за 2–3 год до тренування."},
        {"Що робити, якщо немає вільних місць?",
         "Без листа очікування: бот покаже інші зали, дати та часи з вільними слотами."},
        {"Де побачити відгуки та рейтинг?",
         "У деталях тренування та клубу — рейтинг залу, тренування і тренера."},
        {"Де працює чатбот?",
         "Чатбот вбудований у застосунок BeFitNow — доступний 24/7 без месенджерів."},
        {"Хто керує розкладом?",
         "Адміністратори керують розкладом через окрему веб-панель, не через чатбот."},
        {"Що робити зі складними питаннями?",
         "Швидкі дії — чатбот у застосунку. Складні — \"Передати співробітнику\"."},
        {"Чи є оплата в застосунку?",
         "Ні. Оплата — у наступній фазі. MVP: запис, скасування, підтримка."},
        {"Що показує особистий кабінет?",
         "Залишок занять (напр. \"4 тренування\") та дату закінчення абонемента."},
    };

    trainerProfiles_ = {
        {"Олена Коваль", "Сертифікований інструктор з йоги, 8 років досвіду",
         {"Yoga Alliance RYT-200", "Стретчинг та реабілітація"}, 4.8, 24},
        {"Андрій Мельник", "Тренер з функціонального тренінгу та HIIT",
         {"NASM CPT", "CrossFit Level 1"}, 4.6, 18},
        {"Ігор Бондар", "Майстер спорту з бодібілдингу",
         {"ISSA Certified", "Спортивна дієтологія"}, 4.9, 31},
        {"Наталія Гринько", "Інструктор пілатесу та корекційної гімнастики",
         {"Pilates Mat", "Фізіотерапія basics"}, 4.7, 15},
        {"Дмитро Кравець", "Тренер CrossFit, 6 років досвіду",
         {"CrossFit L2", "Weightlifting"}, 4.5, 22},
    };

    reviews_ = {
        {1, ReviewTarget::Gym, 1, "FitZone Київ", "Оксана", 5,
         "Чистий зал, зручний запис, привітний персонал.", "2026-05-20"},
        {2, ReviewTarget::Gym, 1, "FitZone Київ", "Іван", 4,
         "Гарне обладнання, інколи багато людей ввечері.", "2026-05-15"},
        {3, ReviewTarget::Trainer, 0, "Олена Коваль", "Марта", 5,
         "Професійна, пояснює кожну позу. Рекомендую!", "2026-05-18"},
        {4, ReviewTarget::Training, 1, "Ранкова йога", "Софія", 5,
         "Ідеально для ранку, не перевантажено.", "2026-05-22"},
        {5, ReviewTarget::Gym, 3, "YogaSpace Одеса", "Леся", 5,
         "Затишна атмосфера, чудові тренери з йоги.", "2026-05-10"},
        {6, ReviewTarget::Trainer, 0, "Ігор Бондар", "Максим", 5,
         "Серйозний підхід до техніки, відчувається досвід.", "2026-05-12"},
    };
    nextReviewId_ = 7;

    userPreferences_ = {
        {1, {true, true, true, false}},
        {2, {true, true, false, false}},
    };
}

std::string BeFitNowService::currentTimestamp() const {
    const auto now = std::chrono::system_clock::now();
    const auto time = std::chrono::system_clock::to_time_t(now);
    std::tm localTime{};
#ifdef _WIN32
    localtime_s(&localTime, &time);
#else
    localtime_r(&time, &localTime);
#endif
    std::ostringstream oss;
    oss << std::put_time(&localTime, "%Y-%m-%d %H:%M");
    return oss.str();
}

UserPreferences& BeFitNowService::ensureUserPreferences(int userId) {
    const auto it = std::find_if(userPreferences_.begin(), userPreferences_.end(),
        [userId](const UserPreferences& p) { return p.userId == userId; });
    if (it != userPreferences_.end()) return *it;

    userPreferences_.push_back({userId, {true, true, true, false}});
    return userPreferences_.back();
}

bool BeFitNowService::shouldNotifyUser(int userId, NotificationType type) const {
    const auto it = std::find_if(userPreferences_.begin(), userPreferences_.end(),
        [userId](const UserPreferences& p) { return p.userId == userId; });
    if (it == userPreferences_.end()) return true;

    switch (type) {
        case NotificationType::Reminder:
        case NotificationType::TrainerReminder:
            return it->notifications.reminders;
        case NotificationType::ScheduleChange:
            return it->notifications.scheduleChanges;
        case NotificationType::FreeSpot:
            return it->notifications.freeSpots;
        case NotificationType::Promotion:
            return it->notifications.promotions;
        default:
            return true;
    }
}

void BeFitNowService::sendNotification(const std::string& recipientEmail,
                                       NotificationType type,
                                       const std::string& message) {
    const auto userIt = std::find_if(users_.begin(), users_.end(),
        [&recipientEmail](const User& u) { return u.email == recipientEmail; });
    if (userIt != users_.end() && !shouldNotifyUser(userIt->id, type)) {
        return;
    }

    notifications_.push_back({
        nextNotificationId_++,
        recipientEmail,
        type,
        message,
        currentTimestamp(),
        false
    });
}

std::optional<ClubSettings> BeFitNowService::getClubSettings(int gymId) const {
    const auto it = std::find_if(clubSettings_.begin(), clubSettings_.end(),
        [gymId](const ClubSettings& s) { return s.gymId == gymId; });
    if (it == clubSettings_.end()) return std::nullopt;
    return *it;
}

Training* BeFitNowService::findTraining(int trainingId) {
    const auto it = std::find_if(trainings_.begin(), trainings_.end(),
        [trainingId](Training& t) { return t.id == trainingId; });
    return it != trainings_.end() ? &(*it) : nullptr;
}

Booking* BeFitNowService::findBooking(int bookingId) {
    const auto it = std::find_if(bookings_.begin(), bookings_.end(),
        [bookingId](Booking& b) { return b.id == bookingId; });
    return it != bookings_.end() ? &(*it) : nullptr;
}

User* BeFitNowService::findUser(int userId) {
    const auto it = std::find_if(users_.begin(), users_.end(),
        [userId](User& u) { return u.id == userId; });
    return it != users_.end() ? &(*it) : nullptr;
}

bool BeFitNowService::adminLogin(const std::string& email,
                                 const std::string& password) const {
    return email == "admin@befitnow.com" && password == "admin";
}

std::optional<User> BeFitNowService::registerUser(const std::string& name,
                                                    const std::string& email,
                                                    const std::string& password,
                                                    const std::string& phone) {
    if (name.empty() || email.empty() || password.empty()) return std::nullopt;
    if (std::any_of(users_.begin(), users_.end(),
            [&email](const User& u) { return u.email == email; })) {
        return std::nullopt;
    }
    User user{nextUserId_++, name, email, password, phone, std::nullopt};
    users_.push_back(user);
    return user;
}

std::optional<User> BeFitNowService::login(const std::string& email,
                                           const std::string& password) {
    const auto it = std::find_if(users_.begin(), users_.end(),
        [&](const User& u) { return u.email == email && u.password == password; });
    if (it == users_.end()) return std::nullopt;
    return *it;
}

std::vector<Gym> BeFitNowService::getConnectedGyms() const {
    std::vector<Gym> result;
    std::copy_if(gyms_.begin(), gyms_.end(), std::back_inserter(result),
        [](const Gym& g) { return g.connected; });
    return result;
}

std::optional<Gym> BeFitNowService::getGymById(int gymId) const {
    const auto it = std::find_if(gyms_.begin(), gyms_.end(),
        [gymId](const Gym& g) { return g.id == gymId; });
    if (it == gyms_.end()) return std::nullopt;
    return *it;
}

std::vector<Training> BeFitNowService::getAllTrainings() const {
    return trainings_;
}

std::vector<Training> BeFitNowService::searchTrainings(const TrainingFilter& filter) const {
    std::vector<Training> result;
    for (const auto& training : trainings_) {
        if (filter.gymId && training.gymId != *filter.gymId) continue;
        if (filter.type && training.type != *filter.type) continue;
        if (filter.trainer && !containsIgnoreCase(training.trainer, *filter.trainer)) continue;
        if (filter.keyword) {
            const bool match = containsIgnoreCase(training.title, *filter.keyword)
                || containsIgnoreCase(training.description, *filter.keyword)
                || containsIgnoreCase(trainingTypeToString(training.type), *filter.keyword);
            if (!match) continue;
        }
        result.push_back(training);
    }
    return result;
}

std::vector<Training> BeFitNowService::getTrainingsByGym(int gymId) const {
    return searchTrainings({.gymId = gymId});
}

std::optional<Training> BeFitNowService::getTrainingById(int trainingId) const {
    const auto it = std::find_if(trainings_.begin(), trainings_.end(),
        [trainingId](const Training& t) { return t.id == trainingId; });
    if (it == trainings_.end()) return std::nullopt;
    return *it;
}

std::string BeFitNowService::getTrainingDetails(int trainingId) const {
    const auto training = getTrainingById(trainingId);
    if (!training) return "Тренування не знайдено.";

    const auto gym = getGymById(training->gymId);
    const auto trainerProfile = getTrainerProfile(training->trainer);
    const double trainingRating = getAverageRating(ReviewTarget::Training, trainingId, training->title);
    const int trainingReviewCount = static_cast<int>(getTrainingReviews(trainingId).size());

    std::ostringstream oss;
    oss << "=== " << training->title << " ===\n";
    oss << "Тип: " << trainingTypeToString(training->type) << "\n";
    oss << "Тренер: " << training->trainer;
    if (trainerProfile) oss << " ★ " << trainerProfile->averageRating;
    oss << "\n";
    if (trainerProfile) {
        oss << "Кваліфікація: " << trainerProfile->qualifications << "\n";
        oss << "Сертифікати: ";
        for (size_t i = 0; i < trainerProfile->certificates.size(); ++i) {
            if (i > 0) oss << ", ";
            oss << trainerProfile->certificates[i];
        }
        oss << "\n";
    }
    oss << "Опис: " << training->description << "\n";
    oss << "Дата і час: " << training->dateTime << "\n";
    oss << "Тривалість: " << training->durationMinutes << " хв\n";
    oss << "Вільних місць: " << training->freeSpots() << " / " << training->maxParticipants << "\n";
    if (trainingReviewCount > 0) {
        oss << "Рейтинг тренування: ★ " << trainingRating
            << " (" << trainingReviewCount << " відгуків)\n";
    }
    if (gym) {
        oss << "Клуб: " << gym->name << " ★ "
            << getAverageRating(ReviewTarget::Gym, gym->id) << "\n";
        oss << "Локація: " << gym->address << "\n";
        oss << getGymTrustSummary(gym->id);
    }
    oss << "Скасування/перенесення: за " << training->bookingDeadlineHours
        << " год до початку\n";
    if (training->freeSpots() == 0) {
        oss << "\n" << suggestAlternatives(trainingId);
    }
    return oss.str();
}

bool BeFitNowService::isBookingOpen(const Training& training) const {
    return training.freeSpots() > 0;
}

bool BeFitNowService::hasActiveBooking(int userId, int trainingId) const {
    return std::any_of(bookings_.begin(), bookings_.end(),
        [userId, trainingId](const Booking& b) {
            return b.userId == userId && b.trainingId == trainingId
                && b.status == BookingStatus::Confirmed;
        });
}

void BeFitNowService::applyMembershipOnBook(int userId) {
    auto* user = findUser(userId);
    if (!user || !user->membershipId) return;
    auto* membership = const_cast<Membership*>(
        &(*std::find_if(memberships_.begin(), memberships_.end(),
            [&](const Membership& m) { return m.id == *user->membershipId; })));
    if (membership && membership->active) {
        membership->bookedSessions++;
    }
}

void BeFitNowService::applyMembershipOnCancel(const Booking& booking) {
    if (booking.paymentMethod != PaymentMethod::Membership) return;
    auto* user = findUser(booking.userId);
    if (!user || !user->membershipId) return;
    auto* membership = const_cast<Membership*>(
        &(*std::find_if(memberships_.begin(), memberships_.end(),
            [&](const Membership& m) { return m.id == *user->membershipId; })));
    if (membership) membership->returnedSessions++;
}

OperationResult BeFitNowService::internalBook(int userId, int trainingId,
                                              PaymentMethod method, bool byAdmin) {
    const auto trainingOpt = getTrainingById(trainingId);
    if (!trainingOpt) return {false, 0, "Тренування не знайдено."};

    const auto gymOpt = getGymById(trainingOpt->gymId);
    if (!gymOpt || !gymOpt->connected) return {false, 0, "Зал не підключений до застосунку."};

    if (!byAdmin && !isBookingOpen(*trainingOpt)) {
        return {false, 0, "На це тренування немає вільних місць."};
    }
    if (hasActiveBooking(userId, trainingId)) {
        return {false, 0, "Ви вже записані на це тренування."};
    }

    if (method == PaymentMethod::Membership) {
        const auto membership = getMembershipForClient(userId);
        if (!membership || !membership->active) {
            return {false, 0, "У клієнта немає активного абонемента."};
        }
        if (membership->remainingSessions() <= 0) {
            return {false, 0, "В абонементі не залишилось занять."};
        }
    }

    auto* training = findTraining(trainingId);
    if (!training) return {false, 0, "Тренування не знайдено."};
    if (training->currentParticipants >= training->maxParticipants) {
        return {false, 0, "Група заповнена."};
    }

    PaymentStatus payStatus = PaymentStatus::Unpaid;
    if (method == PaymentMethod::Online || method == PaymentMethod::Cash
        || method == PaymentMethod::Membership) {
        payStatus = PaymentStatus::Paid;
    }

    const int bookingId = nextBookingId_++;
    Booking booking{
        bookingId,
        userId,
        trainingId,
        BookingStatus::Confirmed,
        payStatus,
        method,
        AttendanceStatus::NotVisited,
        currentTimestamp(),
        std::nullopt
    };
    bookings_.push_back(booking);
    training->currentParticipants++;

    if (method == PaymentMethod::Membership) {
        applyMembershipOnBook(userId);
    }

    auto* user = findUser(userId);
    if (user) {
        sendNotification(user->email, NotificationType::Reminder,
            "Підтвердження запису BFN-" + std::to_string(bookingId)
            + ": \"" + training->title + "\" " + training->dateTime + ".");
    }

    return {true, bookingId,
        "Запис створено: \"" + training->title + "\" у \"" + gymOpt->name + "\"."};
}

std::vector<Training> BeFitNowService::getAvailableSlots() const {
    std::vector<Training> result;
    std::copy_if(trainings_.begin(), trainings_.end(), std::back_inserter(result),
        [](const Training& t) { return t.freeSpots() > 0; });
    return result;
}

std::vector<std::string> BeFitNowService::getAvailableTrainers() const {
    std::vector<std::string> trainers;
    for (const auto& t : trainings_) {
        if (std::find(trainers.begin(), trainers.end(), t.trainer) == trainers.end()) {
            trainers.push_back(t.trainer);
        }
    }
    std::sort(trainers.begin(), trainers.end());
    return trainers;
}

std::string BeFitNowService::formatInstantConfirmation(int bookingId) const {
    const auto it = std::find_if(bookings_.begin(), bookings_.end(),
        [bookingId](const Booking& b) { return b.id == bookingId; });
    if (it == bookings_.end()) return "Запис не знайдено.";

    const auto training = getTrainingById(it->trainingId);
    const auto gym = training ? getGymById(training->gymId) : std::nullopt;
    const auto user = getClientById(it->userId);

    std::ostringstream oss;
    oss << "\n╔══════════════════════════════════════╗\n";
    oss <<   "║     МИТТЄВЕ ПІДТВЕРДЖЕННЯ ЗАПИСУ    ║\n";
    oss <<   "╚══════════════════════════════════════╝\n";
    oss << "Код: BFN-" << bookingId << "\n";
    if (user) oss << "Клієнт: " << user->name << "\n";
    if (training) {
        oss << "Тренування: " << training->title << "\n";
        oss << "Тренер: " << training->trainer << "\n";
        oss << "Дата і час: " << training->dateTime << "\n";
    }
    if (gym) oss << "Клуб: " << gym->name << ", " << gym->address << "\n";
    oss << "Статус: ПІДТВЕРДЖЕНО\n";
    oss << "Час підтвердження: " << it->createdAt << "\n";
    return oss.str();
}

std::vector<Training> BeFitNowService::findAlternativeSlots(int trainingId) const {
    const auto source = getTrainingById(trainingId);
    if (!source) return {};

    std::vector<Training> alternatives;
    for (const auto& t : trainings_) {
        if (t.id == trainingId || t.freeSpots() <= 0) continue;
        const bool sameType = t.type == source->type;
        const bool sameTrainer = t.trainer == source->trainer;
        if (sameType || sameTrainer) alternatives.push_back(t);
    }

    if (alternatives.size() < 3) {
        for (const auto& t : trainings_) {
            if (t.id == trainingId || t.freeSpots() <= 0) continue;
            if (std::any_of(alternatives.begin(), alternatives.end(),
                    [&t](const Training& a) { return a.id == t.id; })) {
                continue;
            }
            alternatives.push_back(t);
            if (alternatives.size() >= 5) break;
        }
    }
    return alternatives;
}

std::string BeFitNowService::suggestAlternatives(int trainingId) const {
    const auto alternatives = findAlternativeSlots(trainingId);
    if (alternatives.empty()) {
        return "Наразі немає альтернативних слотів. Спробуйте пізніше.";
    }

    std::ostringstream oss;
    oss << "--- Альтернативи (без листа очікування) ---\n";
    for (const auto& t : alternatives) {
        const auto gym = getGymById(t.gymId);
        oss << "  [" << t.id << "] " << t.title << " | " << t.dateTime;
        if (gym) oss << " | " << gym->name;
        oss << " | вільно: " << t.freeSpots() << "\n";
    }
    return oss.str();
}

std::string BeFitNowService::bookWorkout(int userId, int trainingId) {
    const auto result = internalBook(userId, trainingId, PaymentMethod::None, false);
    if (!result.success) {
        std::string response = result.message;
        if (result.message.find("вільних місць") != std::string::npos
            || result.message.find("заповнена") != std::string::npos) {
            response += "\n\n" + suggestAlternatives(trainingId);
        }
        return response;
    }
    return result.message + formatInstantConfirmation(result.entityId);
}

std::string BeFitNowService::bookTraining(int userId, int trainingId, PaymentMethod method) {
    const auto result = internalBook(userId, trainingId, method, false);
    return result.success ? result.message : result.message;
}

std::string BeFitNowService::adminCreateBooking(int clientId, int trainingId, PaymentMethod method) {
    if (!getClientById(clientId)) return "Клієнт не знайдений.";
    const auto result = internalBook(clientId, trainingId, method, true);
    return result.success ? result.message + formatInstantConfirmation(result.entityId) : result.message;
}

std::string BeFitNowService::internalCancel(int bookingId, int requesterUserId, bool byAdmin) {
    auto* booking = findBooking(bookingId);
    if (!booking) return "Запис не знайдено.";
    if (!byAdmin && booking->userId != requesterUserId) {
        return "Ви не можете скасувати чужий запис.";
    }
    if (booking->status != BookingStatus::Confirmed) {
        return "Запис вже скасовано або перенесено.";
    }

    auto* training = findTraining(booking->trainingId);
    if (training && training->currentParticipants > 0) {
        training->currentParticipants--;
        notifyFreeSpot(booking->trainingId);
    }

    applyMembershipOnCancel(*booking);
    booking->status = BookingStatus::Cancelled;

    auto* user = findUser(booking->userId);
    if (user) {
        sendNotification(user->email, NotificationType::ScheduleChange,
            "Ваш запис #" + std::to_string(bookingId) + " скасовано.");
    }
    return "Запис #" + std::to_string(bookingId) + " скасовано.";
}

std::string BeFitNowService::cancelBooking(int userId, int bookingId) {
    return internalCancel(bookingId, userId, false);
}

std::string BeFitNowService::adminDeleteBooking(int bookingId) {
    return internalCancel(bookingId, 0, true);
}

std::string BeFitNowService::internalReschedule(int bookingId, int newTrainingId,
                                                int requesterUserId, bool byAdmin) {
    auto* booking = findBooking(bookingId);
    if (!booking) return "Запис не знайдено.";
    if (!byAdmin && booking->userId != requesterUserId) {
        return "Ви не можете перенести чужий запис.";
    }
    if (booking->status != BookingStatus::Confirmed) {
        return "Запис неактивний.";
    }
    if (booking->trainingId == newTrainingId) {
        return "Нове тренування збігається з поточним.";
    }
    if (hasActiveBooking(booking->userId, newTrainingId)) {
        return "Клієнт вже записаний на нове тренування.";
    }

    auto* oldTraining = findTraining(booking->trainingId);
    auto* newTraining = findTraining(newTrainingId);
    if (!newTraining) return "Нове тренування не знайдено.";
    if (newTraining->currentParticipants >= newTraining->maxParticipants) {
        return "На нове тренування немає місць.";
    }

    if (oldTraining && oldTraining->currentParticipants > 0) {
        oldTraining->currentParticipants--;
        notifyFreeSpot(booking->trainingId);
    }

    booking->rescheduledFromTrainingId = booking->trainingId;
    booking->trainingId = newTrainingId;
    booking->status = BookingStatus::Confirmed;
    newTraining->currentParticipants++;

    auto* user = findUser(booking->userId);
    if (user) {
        sendNotification(user->email, NotificationType::ScheduleChange,
            "Ваш запис #" + std::to_string(bookingId) + " перенесено на \""
            + newTraining->title + "\" " + newTraining->dateTime + ".");
    }

    return "Запис #" + std::to_string(bookingId) + " перенесено на \""
        + newTraining->title + "\".";
}

std::string BeFitNowService::rescheduleBooking(int userId, int bookingId, int newTrainingId) {
    return internalReschedule(bookingId, newTrainingId, userId, false);
}

std::string BeFitNowService::adminRescheduleBooking(int bookingId, int newTrainingId) {
    return internalReschedule(bookingId, newTrainingId, 0, true);
}

std::string BeFitNowService::payOnline(int userId, int bookingId) {
    auto* booking = findBooking(bookingId);
    if (!booking) return "Запис не знайдено.";
    if (booking->userId != userId) return "Це не ваш запис.";
    if (booking->paymentStatus == PaymentStatus::Paid) return "Запис вже оплачено.";

    booking->paymentStatus = PaymentStatus::Paid;
    booking->paymentMethod = PaymentMethod::Online;

    auto* user = findUser(userId);
    if (user) {
        sendNotification(user->email, NotificationType::Reminder,
            "Онлайн-оплата за запис #" + std::to_string(bookingId) + " успішна.");
    }
    return "Онлайн-оплата успішна для запису #" + std::to_string(bookingId) + ".";
}

std::vector<Booking> BeFitNowService::getUserBookings(int userId) const {
    std::vector<Booking> result;
    std::copy_if(bookings_.begin(), bookings_.end(), std::back_inserter(result),
        [userId](const Booking& b) {
            return b.userId == userId && b.status == BookingStatus::Confirmed;
        });
    return result;
}

std::vector<Notification> BeFitNowService::getUserNotifications(const std::string& email) const {
    std::vector<Notification> result;
    std::copy_if(notifications_.begin(), notifications_.end(), std::back_inserter(result),
        [&email](const Notification& n) { return n.recipientEmail == email; });
    return result;
}

// --- Memberships ---

std::vector<Membership> BeFitNowService::getAllMemberships() const { return memberships_; }

std::optional<Membership> BeFitNowService::getMembershipById(int id) const {
    const auto it = std::find_if(memberships_.begin(), memberships_.end(),
        [id](const Membership& m) { return m.id == id; });
    if (it == memberships_.end()) return std::nullopt;
    return *it;
}

std::optional<Membership> BeFitNowService::getMembershipForClient(int clientId) const {
    const auto userIt = std::find_if(users_.begin(), users_.end(),
        [clientId](const User& u) { return u.id == clientId; });
    if (userIt == users_.end() || !userIt->membershipId) return std::nullopt;
    return getMembershipById(*userIt->membershipId);
}

std::string BeFitNowService::createMembership(int clientId, const std::string& typeName,
                                              int totalSessions, const std::string& validUntil) {
    if (!getClientById(clientId)) return "Клієнт не знайдений.";
    Membership m{nextMembershipId_++, clientId, typeName, totalSessions, 0, 0, validUntil, true};
    memberships_.push_back(m);
    if (auto* user = findUser(clientId)) user->membershipId = m.id;
    return "Абонемент \"" + typeName + "\" створено для клієнта #" + std::to_string(clientId) + ".";
}

std::string BeFitNowService::updateMembership(int membershipId, int totalSessions,
                                              const std::string& validUntil, bool active) {
    auto* m = const_cast<Membership*>(&(*std::find_if(memberships_.begin(), memberships_.end(),
        [membershipId](const Membership& mem) { return mem.id == membershipId; })));
    if (!m) return "Абонемент не знайдено.";
    m->totalSessions = totalSessions;
    m->validUntil = validUntil;
    m->active = active;
    return "Абонемент #" + std::to_string(membershipId) + " оновлено.";
}

std::string BeFitNowService::deleteMembership(int membershipId) {
    const auto it = std::find_if(memberships_.begin(), memberships_.end(),
        [membershipId](const Membership& m) { return m.id == membershipId; });
    if (it == memberships_.end()) return "Абонемент не знайдено.";
    for (auto& user : users_) {
        if (user.membershipId == membershipId) user.membershipId = std::nullopt;
    }
    memberships_.erase(it);
    return "Абонемент #" + std::to_string(membershipId) + " видалено.";
}

// --- Clients ---

std::vector<User> BeFitNowService::getAllClients() const { return users_; }

std::optional<User> BeFitNowService::getClientById(int id) const {
    const auto it = std::find_if(users_.begin(), users_.end(),
        [id](const User& u) { return u.id == id; });
    if (it == users_.end()) return std::nullopt;
    return *it;
}

std::string BeFitNowService::updateClient(int clientId, const std::string& name,
                                          const std::string& phone, const std::string& email) {
    auto* user = findUser(clientId);
    if (!user) return "Клієнт не знайдений.";
    user->name = name;
    user->phone = phone;
    user->email = email;
    return "Дані клієнта #" + std::to_string(clientId) + " оновлено.";
}

// --- Admin schedule ---

std::string BeFitNowService::getClubSchedule(int gymId) const {
    const auto gym = getGymById(gymId);
    if (!gym) return "Зал не знайдено.";

    std::ostringstream oss;
    oss << "=== Розклад: " << gym->name << " ===\n\n";
    const auto trainings = getTrainingsByGym(gymId);
    if (trainings.empty()) return oss.str() + "Розклад порожній.\n";

    for (const auto& t : trainings) {
        oss << "[" << t.id << "] " << t.title << " | " << t.dateTime << "\n";
        oss << "    Тренер: " << t.trainer << " | Тип: " << trainingTypeToString(t.type) << "\n";
        oss << "    Записано: " << t.currentParticipants << " / " << t.maxParticipants;
        oss << " | Вільно: " << t.freeSpots() << "\n";
        oss << "    Мін. для проведення: " << t.minParticipants << "\n\n";
    }
    return oss.str();
}

std::string BeFitNowService::createTraining(const Training& training) {
    if (!getGymById(training.gymId)) return "Зал не знайдено.";
    Training t = training;
    t.id = nextTrainingId_++;
    t.currentParticipants = 0;
    trainings_.push_back(t);
    return "Тренування \"" + t.title + "\" додано до розкладу (ID: " + std::to_string(t.id) + ").";
}

std::string BeFitNowService::updateTraining(int trainingId, const Training& updated) {
    auto* t = findTraining(trainingId);
    if (!t) return "Тренування не знайдено.";
    const int participants = t->currentParticipants;
    *t = updated;
    t->id = trainingId;
    t->currentParticipants = participants;
    broadcastPromotion("Зміни в розкладі: оновлено тренування \"" + t->title + "\".");
    return "Тренування #" + std::to_string(trainingId) + " оновлено.";
}

std::string BeFitNowService::deleteTraining(int trainingId) {
    const auto activeBookings = getBookingsForTraining(trainingId);
    if (!activeBookings.empty()) {
        return "Неможливо видалити: є активні бронювання (" + std::to_string(activeBookings.size()) + ").";
    }
    const auto it = std::find_if(trainings_.begin(), trainings_.end(),
        [trainingId](const Training& t) { return t.id == trainingId; });
    if (it == trainings_.end()) return "Тренування не знайдено.";
    const std::string title = it->title;
    trainings_.erase(it);
    broadcastPromotion("Зміни в розкладі: тренування \"" + title + "\" видалено.");
    return "Тренування \"" + title + "\" видалено.";
}

// --- Admin bookings ---

std::vector<Booking> BeFitNowService::getAllBookings() const { return bookings_; }

std::vector<Booking> BeFitNowService::getBookingsForTraining(int trainingId) const {
    std::vector<Booking> result;
    std::copy_if(bookings_.begin(), bookings_.end(), std::back_inserter(result),
        [trainingId](const Booking& b) {
            return b.trainingId == trainingId && b.status == BookingStatus::Confirmed;
        });
    return result;
}

int BeFitNowService::getRegisteredCount(int trainingId) const {
    return static_cast<int>(getBookingsForTraining(trainingId).size());
}

std::string BeFitNowService::updateBookingPayment(int bookingId, PaymentStatus status,
                                                  PaymentMethod method) {
    auto* booking = findBooking(bookingId);
    if (!booking) return "Запис не знайдено.";
    booking->paymentStatus = status;
    booking->paymentMethod = method;
    return "Статус оплати запису #" + std::to_string(bookingId) + " оновлено: "
        + paymentStatusToString(status) + " (" + paymentMethodToString(method) + ").";
}

std::string BeFitNowService::updateBookingAttendance(int bookingId, AttendanceStatus status) {
    auto* booking = findBooking(bookingId);
    if (!booking) return "Запис не знайдено.";
    booking->attendanceStatus = status;
    return "Відвідуваність запису #" + std::to_string(bookingId) + " оновлено: "
        + attendanceStatusToString(status) + ".";
}

// --- Staff ---

std::vector<Staff> BeFitNowService::getStaffByGym(int gymId) const {
    std::vector<Staff> result;
    std::copy_if(staff_.begin(), staff_.end(), std::back_inserter(result),
        [gymId](const Staff& s) { return s.gymId == gymId; });
    return result;
}

std::string BeFitNowService::addScheduleComment(int trainingId, int staffId,
                                                const std::string& comment) {
    if (!getTrainingById(trainingId)) return "Тренування не знайдено.";
    scheduleComments_.push_back({nextCommentId_++, trainingId, staffId, comment, currentTimestamp()});
    return "Коментар додано до слота #" + std::to_string(trainingId) + ".";
}

std::vector<ScheduleComment> BeFitNowService::getScheduleComments(int trainingId) const {
    std::vector<ScheduleComment> result;
    std::copy_if(scheduleComments_.begin(), scheduleComments_.end(), std::back_inserter(result),
        [trainingId](const ScheduleComment& c) { return c.trainingId == trainingId; });
    return result;
}

std::string BeFitNowService::sendScheduleForConfirmation(int gymId) {
    const auto gymStaff = getStaffByGym(gymId);
    const auto gym = getGymById(gymId);
    if (!gym) return "Зал не знайдено.";

    int sent = 0;
    for (const auto& member : gymStaff) {
        sendNotification(member.email, NotificationType::ScheduleConfirmation,
            "Підтвердіть розклад клубу \"" + gym->name + "\" на найближчі дні.");
        sent++;
    }
    return "Розклад надіслано " + std::to_string(sent) + " співробітникам на підтвердження.";
}

std::string BeFitNowService::confirmScheduleSlot(int trainingId, int staffId,
                                                 bool confirmed, const std::string& comment) {
    scheduleConfirmations_.push_back({trainingId, staffId, confirmed, comment, currentTimestamp()});
    return confirmed ? "Слот #" + std::to_string(trainingId) + " підтверджено."
                     : "Слот #" + std::to_string(trainingId) + " відхилено з коментарем.";
}

std::vector<ScheduleConfirmation> BeFitNowService::getScheduleConfirmations(int gymId) const {
    std::vector<ScheduleConfirmation> result;
    for (const auto& conf : scheduleConfirmations_) {
        const auto training = getTrainingById(conf.trainingId);
        if (training && training->gymId == gymId) result.push_back(conf);
    }
    return result;
}

// --- Notifications ---

std::vector<Notification> BeFitNowService::getAllNotifications() const { return notifications_; }

std::string BeFitNowService::checkLowEnrollmentAlerts() {
    int alerts = 0;
    for (const auto& training : trainings_) {
        if (training.currentParticipants >= training.minParticipants) continue;

        const auto gymStaff = getStaffByGym(training.gymId);
        for (const auto& member : gymStaff) {
            if (member.role == StaffRole::Admin || member.role == StaffRole::Manager) {
                sendNotification(member.email, NotificationType::LowEnrollment,
                    "Увага! На \"" + training.title + "\" (" + training.dateTime
                    + ") записано лише " + std::to_string(training.currentParticipants)
                    + " з мін. " + std::to_string(training.minParticipants)
                    + ". Дедлайн бронювання: за " + std::to_string(training.bookingDeadlineHours) + " год.");
                alerts++;
            }
        }
    }
    return "Перевірено розклад. Надіслано " + std::to_string(alerts) + " сповіщень про низьку заповненість.";
}

std::string BeFitNowService::sendTrainerReminders() {
    int sent = 0;
    for (const auto& training : trainings_) {
        const auto gymStaff = getStaffByGym(training.gymId);
        for (const auto& member : gymStaff) {
            if (member.role == StaffRole::Trainer
                && containsIgnoreCase(training.trainer, member.name)) {
                sendNotification(member.email, NotificationType::TrainerReminder,
                    "Нагадування: тренування \"" + training.title + "\" о "
                    + training.dateTime + ". Записано: " + std::to_string(training.currentParticipants) + " осіб.");
                sent++;
            }
        }
    }
    return "Надіслано " + std::to_string(sent) + " нагадувань тренерам.";
}

std::string BeFitNowService::sendTrainingReminder(int userId, int bookingId) {
    auto* booking = findBooking(bookingId);
    if (!booking || booking->userId != userId) return "Запис не знайдено.";
    auto* user = findUser(userId);
    const auto training = getTrainingById(booking->trainingId);
    if (!user || !training) return "Дані не знайдено.";

    sendNotification(user->email, NotificationType::Reminder,
        "Нагадування: \"" + training->title + "\" о " + training->dateTime + ".");
    return "Нагадування надіслано.";
}

std::string BeFitNowService::notifyFreeSpot(int trainingId) {
    const auto training = getTrainingById(trainingId);
    if (!training || training->freeSpots() <= 0) return "";

    for (const auto& user : users_) {
        sendNotification(user.email, NotificationType::FreeSpot,
            "З'явилось вільне місце на \"" + training->title + "\" " + training->dateTime + "!");
    }
    return "Сповіщення про вільне місце надіслано клієнтам.";
}

std::string BeFitNowService::broadcastPromotion(const std::string& message) {
    for (const auto& user : users_) {
        sendNotification(user.email, NotificationType::Promotion, message);
    }
    return "Акційне повідомлення надіслано " + std::to_string(users_.size()) + " клієнтам.";
}

// --- Statistics ---

PaymentStats BeFitNowService::getPaymentStats() const {
    PaymentStats stats;
    for (const auto& booking : bookings_) {
        if (booking.status != BookingStatus::Confirmed) continue;
        if (booking.paymentStatus != PaymentStatus::Paid) continue;

        switch (booking.paymentMethod) {
            case PaymentMethod::Membership: stats.membershipCount++; break;
            case PaymentMethod::OneTime: stats.oneTimeCount++; break;
            case PaymentMethod::Online: stats.onlineCount++; break;
            case PaymentMethod::Cash: stats.cashCount++; break;
            default: break;
        }

        const auto training = getTrainingById(booking.trainingId);
        if (training && booking.paymentMethod != PaymentMethod::Membership) {
            stats.totalRevenue += training->price;
        }
    }
    return stats;
}

std::string BeFitNowService::getMembershipUsageReport(int clientId) const {
    const auto membership = getMembershipForClient(clientId);
    if (!membership) return "У клієнта немає абонемента.";

    std::ostringstream oss;
    oss << "Абонемент: " << membership->typeName << "\n";
    oss << "Всього занять: " << membership->totalSessions << "\n";
    oss << "Заброньовано: " << membership->bookedSessions << "\n";
    oss << "Повернено (скасування): " << membership->returnedSessions << "\n";
    oss << "Залишилось: " << membership->remainingSessions() << "\n";
    oss << "Дійсний до: " << membership->validUntil << "\n";
    oss << "Статус: " << (membership->active ? "активний" : "неактивний") << "\n";
    return oss.str();
}

// --- Reviews & trust ---

std::vector<Review> BeFitNowService::getGymReviews(int gymId) const {
    std::vector<Review> result;
    std::copy_if(reviews_.begin(), reviews_.end(), std::back_inserter(result),
        [gymId](const Review& r) {
            return r.target == ReviewTarget::Gym && r.targetId == gymId;
        });
    return result;
}

std::vector<Review> BeFitNowService::getTrainingReviews(int trainingId) const {
    std::vector<Review> result;
    std::copy_if(reviews_.begin(), reviews_.end(), std::back_inserter(result),
        [trainingId](const Review& r) {
            return r.target == ReviewTarget::Training && r.targetId == trainingId;
        });
    return result;
}

std::vector<Review> BeFitNowService::getTrainerReviews(const std::string& trainerName) const {
    std::vector<Review> result;
    std::copy_if(reviews_.begin(), reviews_.end(), std::back_inserter(result),
        [&trainerName](const Review& r) {
            return r.target == ReviewTarget::Trainer
                && containsIgnoreCase(r.targetName, trainerName);
        });
    return result;
}

double BeFitNowService::getAverageRating(ReviewTarget target, int targetId,
                                         const std::string& targetName) const {
    std::vector<Review> matched;
    for (const auto& r : reviews_) {
        if (r.target != target) continue;
        if (target == ReviewTarget::Trainer) {
            if (containsIgnoreCase(r.targetName, targetName)) matched.push_back(r);
        } else if (r.targetId == targetId
            || (!targetName.empty() && containsIgnoreCase(r.targetName, targetName))) {
            matched.push_back(r);
        }
    }
    if (matched.empty()) return 0.0;
    double sum = 0;
    for (const auto& r : matched) sum += r.rating;
    return sum / static_cast<double>(matched.size());
}

std::optional<TrainerProfile> BeFitNowService::getTrainerProfile(
    const std::string& trainerName) const {
    const auto it = std::find_if(trainerProfiles_.begin(), trainerProfiles_.end(),
        [&trainerName](const TrainerProfile& p) {
            return containsIgnoreCase(p.name, trainerName);
        });
    if (it == trainerProfiles_.end()) return std::nullopt;
    return *it;
}

std::string BeFitNowService::getGymTrustSummary(int gymId) const {
    const auto gymReviews = getGymReviews(gymId);
    std::ostringstream oss;
    oss << "Відгуки про клуб: ★ " << getAverageRating(ReviewTarget::Gym, gymId)
        << " (" << gymReviews.size() << ")\n";
    for (const auto& r : gymReviews) {
        oss << "  • " << r.authorName << ": " << r.rating << "/5 — " << r.comment << "\n";
    }
    return oss.str();
}

// --- User profile & preferences ---

std::string BeFitNowService::getUserProfileSummary(int userId) const {
    const auto user = getClientById(userId);
    if (!user) return "Користувача не знайдено.";

    std::ostringstream oss;
    oss << "=== Особистий кабінет ===\n";
    oss << "Ім'я: " << user->name << "\n";
    oss << "Платформа: застосунок BeFitNow (24/7)\n\n";

    const auto membership = getMembershipForClient(userId);
    if (!membership) {
        oss << "Абонемент: немає активного\n";
        return oss.str();
    }

    oss << "Абонемент: " << membership->typeName << "\n";
    oss << "Залишилось занять: " << membership->remainingSessions()
        << " тренувань\n";
    oss << "Дійсний до: " << membership->validUntil << "\n";
    return oss.str();
}

UserPreferences BeFitNowService::getUserPreferences(int userId) const {
    const auto it = std::find_if(userPreferences_.begin(), userPreferences_.end(),
        [userId](const UserPreferences& p) { return p.userId == userId; });
    if (it != userPreferences_.end()) return *it;
    return {userId, {true, true, true, false}};
}

std::string BeFitNowService::updateNotificationPreferences(
    int userId, const NotificationPreferences& prefs) {
    auto& userPrefs = ensureUserPreferences(userId);
    userPrefs.notifications = prefs;
    return "Налаштування сповіщень оновлено. Акції "
        + std::string(prefs.promotions ? "увімкнено" : "вимкнено") + ".";
}

std::optional<Staff> BeFitNowService::trainerLogin(const std::string& email,
                                                   const std::string& password) const {
    if (password != "trainer") return std::nullopt;
    const auto it = std::find_if(staff_.begin(), staff_.end(),
        [&email](const Staff& s) {
            return s.email == email && s.role == StaffRole::Trainer;
        });
    if (it == staff_.end()) return std::nullopt;
    return *it;
}

std::vector<Training> BeFitNowService::getTrainingsForTrainer(
    const std::string& trainerName) const {
    std::vector<Training> result;
    std::copy_if(trainings_.begin(), trainings_.end(), std::back_inserter(result),
        [&trainerName](const Training& t) {
            return containsIgnoreCase(t.trainer, trainerName);
        });
    return result;
}

std::vector<Notification> BeFitNowService::getStaffNotifications(
    const std::string& email) const {
    std::vector<Notification> result;
    std::copy_if(notifications_.begin(), notifications_.end(), std::back_inserter(result),
        [&email](const Notification& n) { return n.recipientEmail == email; });
    return result;
}

// --- Support & FAQ ---

std::vector<FaqEntry> BeFitNowService::getFaqEntries() const {
    return faqEntries_;
}

std::vector<FaqEntry> BeFitNowService::searchFaq(const std::string& keyword) const {
    if (keyword.empty()) return faqEntries_;
    std::vector<FaqEntry> result;
    for (const auto& entry : faqEntries_) {
        if (containsIgnoreCase(entry.question, keyword)
            || containsIgnoreCase(entry.answer, keyword)) {
            result.push_back(entry);
        }
    }
    return result;
}

std::string BeFitNowService::submitSupportRequest(const std::string& name,
                                                  const std::string& email,
                                                  const std::string& subject,
                                                  const std::string& message) {
    if (name.empty() || email.empty() || message.empty()) {
        return "Заповніть ім'я, email та повідомлення.";
    }
    const int ticketId = nextSupportTicketId_++;
    supportTickets_.push_back({
        ticketId, name, email, subject, message, false, "open", currentTimestamp()
    });
    sendNotification("support@befitnow.com", NotificationType::Reminder,
        "Новий запит #" + std::to_string(ticketId) + " від " + name + ": " + subject);
    return "Запит #" + std::to_string(ticketId) + " прийнято. Ми відповімо на " + email + ".";
}

std::string BeFitNowService::escalateToHuman(const std::string& name,
                                              const std::string& email,
                                              const std::string& message) {
    const int ticketId = nextSupportTicketId_++;
    supportTickets_.push_back({
        ticketId, name, email, "Ескалація до співробітника", message,
        true, "assigned", currentTimestamp()
    });
    sendNotification("admin@befitnow.com", NotificationType::Reminder,
        "Ескалація #" + std::to_string(ticketId) + " від " + name + ": " + message);
    sendNotification("support@befitnow.com", NotificationType::Reminder,
        "Клієнт " + name + " очікує на співробітника. Запит #" + std::to_string(ticketId));
    return "Ваш запит #" + std::to_string(ticketId)
        + " передано співробітнику. Очікуйте відповіді на " + email + ".";
}

std::vector<SupportTicket> BeFitNowService::getSupportTickets() const {
    return supportTickets_;
}

// --- AI assistant (MVP: search, book, cancel, reschedule) ---

std::string BeFitNowService::processAIQuery(int userId, const std::string& query) {
    const std::string q = toLower(query);

    if (q.find("знайти") != std::string::npos || q.find("пошук") != std::string::npos
        || q.find("покажи") != std::string::npos) {
        TrainingFilter filter;
        filter.keyword = query;

        if (q.find("йог") != std::string::npos) filter.type = TrainingType::Yoga;
        else if (q.find("hiit") != std::string::npos) filter.type = TrainingType::HIIT;
        else if (q.find("пілатес") != std::string::npos) filter.type = TrainingType::Pilates;
        else if (q.find("крос") != std::string::npos) filter.type = TrainingType::CrossFit;

        for (const auto& gym : gyms_) {
            if (containsIgnoreCase(gym.name, query) || containsIgnoreCase(gym.address, query)) {
                filter.gymId = gym.id;
                break;
            }
        }

        for (const auto& training : trainings_) {
            if (containsIgnoreCase(training.trainer, query)) {
                filter.trainer = training.trainer;
                break;
            }
        }

        const auto results = searchTrainings(filter);
        if (results.empty()) return "Не знайшов тренувань за вашим запитом. Спробуйте: \"знайти йогу в Києві\".";

        std::ostringstream oss;
        oss << "Знайдено " << results.size() << " тренувань:\n";
        for (const auto& t : results) {
            oss << "  [" << t.id << "] " << t.title << " — " << t.dateTime
                << " (вільно: " << t.freeSpots() << ")\n";
        }
        return oss.str();
    }

    if (q.find("запис") != std::string::npos) {
        int trainingId = 0;
        const auto pos = q.find_last_of("0123456789");
        if (pos != std::string::npos) {
            try { trainingId = std::stoi(q.substr(pos)); } catch (...) {}
        }
        for (const auto& t : trainings_) {
            if (containsIgnoreCase(q, std::to_string(t.id))) {
                trainingId = t.id;
                break;
            }
        }
        if (trainingId == 0) return "Вкажіть ID тренування, наприклад: \"записатися на 2\".";
        return bookWorkout(userId, trainingId);
    }

    if (q.find("скасув") != std::string::npos) {
        int bookingId = 0;
        for (const auto& b : getUserBookings(userId)) {
            if (containsIgnoreCase(q, std::to_string(b.id))) {
                bookingId = b.id;
                break;
            }
        }
        if (bookingId == 0) return "Вкажіть номер запису, наприклад: \"скасувати запис 1\".";
        return cancelBooking(userId, bookingId);
    }

    if (q.find("перенес") != std::string::npos) {
        int bookingId = 0;
        int newTrainingId = 0;
        const auto bookings = getUserBookings(userId);
        if (!bookings.empty()) bookingId = bookings.front().id;

        for (const auto& t : trainings_) {
            if (containsIgnoreCase(q, std::to_string(t.id))) newTrainingId = t.id;
        }
        if (bookingId == 0 || newTrainingId == 0) {
            return "Вкажіть запис і нове тренування: \"перенести запис 1 на 5\".";
        }
        return rescheduleBooking(userId, bookingId, newTrainingId);
    }

    if (q.find("співробітник") != std::string::npos || q.find("людин") != std::string::npos
        || q.find("адмін") != std::string::npos || q.find("підтрим") != std::string::npos) {
        const auto user = getClientById(userId);
        if (!user) return "Користувача не знайдено.";
        return escalateToHuman(user->name, user->email, query);
    }

    if (q.find("профіль") != std::string::npos || q.find("абонемент") != std::string::npos
        || q.find("кабінет") != std::string::npos) {
        return getUserProfileSummary(userId);
    }

    if (q.find("відгук") != std::string::npos || q.find("рейтинг") != std::string::npos) {
        for (const auto& t : trainings_) {
            if (containsIgnoreCase(q, t.trainer) || containsIgnoreCase(q, t.title)) {
                return getTrainingDetails(t.id);
            }
        }
        for (const auto& gym : gyms_) {
            if (containsIgnoreCase(q, gym.name)) {
                return getGymTrustSummary(gym.id);
            }
        }
        return "Вкажіть назву клубу або тренування для перегляду відгуків.";
    }

    if (q.find("альтернатив") != std::string::npos || q.find("інш") != std::string::npos) {
        for (const auto& t : trainings_) {
            if (containsIgnoreCase(q, std::to_string(t.id))) {
                return suggestAlternatives(t.id);
            }
        }
        return "Вкажіть ID тренування: \"альтернативи для 2\".";
    }

    if (q.find("допомога") != std::string::npos || q.find("help") != std::string::npos) {
        return "Я можу:\n"
            "  • знайти йогу / HIIT / тренування в Києві\n"
            "  • записатися на 2\n"
            "  • скасувати запис 1\n"
            "  • перенести запис 1 на 5\n"
            "  • профіль / абонемент\n"
            "  • альтернативи для 2 (якщо немає місць)\n"
            "  • потрібен співробітник\n\n"
            "Чатбот працює у застосунку BeFitNow 24/7. Оплата — пізніше.";
    }

    return "Не зрозумів запит. Напишіть \"допомога\" або \"потрібен співробітник\".";
}
