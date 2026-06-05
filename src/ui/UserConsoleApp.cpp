#include "ui/UserConsoleApp.h"

#include <iostream>

#include "models/Review.h"
#include "ui/ConsoleIo.h"

UserConsoleApp::UserConsoleApp(BeFitNowService& service) : service_(service) {}

void UserConsoleApp::run() {
    std::cout << "\n========================================\n";
    std::cout << "   BeFitNow — Клієнтський застосунок\n";
    std::cout << "========================================\n";
    std::cout << "Швидкий запис | Миттєве підтвердження | 24/7\n";
    showAuthMenu();
}

void UserConsoleApp::showAuthMenu() {
    while (!currentUser_) {
        std::cout << "\n--- Вхід ---\n";
        std::cout << "1. Реєстрація\n2. Вхід\n0. Назад\n";
        switch (ConsoleIo::readInt("Оберіть дію: ")) {
            case 1: handleRegister(); break;
            case 2: handleLogin(); break;
            case 0: return;
            default: std::cout << "Невірний вибір.\n";
        }
    }
    showMainMenu();
}

void UserConsoleApp::showMainMenu() {
    while (currentUser_) {
        std::cout << "\n--- BeFitNow MVP ---\n";
        std::cout << "Вітаємо, " << currentUser_->name << "!\n\n";
        std::cout << " ЗАПИС\n";
        std::cout << "  1. Доступні слоти\n";
        std::cout << "  2. Пошук тренувань\n";
        std::cout << "  3. Вибір тренера\n";
        std::cout << "  4. Деталі перед записом\n";
        std::cout << "  5. Записатися\n";
        std::cout << " КЕРУВАННЯ ЗАПИСОМ\n";
        std::cout << "  6. Мої записи\n";
        std::cout << "  7. Скасувати (зазвичай за 2–3 год)\n";
        std::cout << "  8. Перенести\n";
        std::cout << " ДОВІРА ТА ПРОФІЛЬ\n";
        std::cout << "  9. Відгуки про клуб\n";
        std::cout << " 10. Особистий кабінет / абонемент\n";
        std::cout << " 11. Налаштування сповіщень\n";
        std::cout << " 12. Мої сповіщення\n";
        std::cout << "  0. Вихід\n";

        switch (ConsoleIo::readInt("Оберіть дію: ")) {
            case 1: handleViewSlots(); break;
            case 2: handleSearchTrainings(); break;
            case 3: handleSelectTrainer(); break;
            case 4: handleTrainingDetails(); break;
            case 5: handleBookWorkout(); break;
            case 6: handleMyBookings(); break;
            case 7: handleCancelBooking(); break;
            case 8: handleRescheduleBooking(); break;
            case 9: handleGymReviews(); break;
            case 10: handleProfile(); break;
            case 11: handleNotificationSettings(); break;
            case 12: handleNotifications(); break;
            case 0:
                std::cout << "До побачення!\n";
                currentUser_ = std::nullopt;
                return;
            default: std::cout << "Невірний вибір.\n";
        }
    }
}

void UserConsoleApp::handleRegister() {
    const auto user = service_.registerUser(
        ConsoleIo::readLine("Ім'я: "),
        ConsoleIo::readLine("Email: "),
        ConsoleIo::readLine("Пароль: "),
        ConsoleIo::readLine("Телефон: "));
    if (user) {
        currentUser_ = user;
        std::cout << "Реєстрація успішна!\n";
    } else {
        std::cout << "Помилка реєстрації.\n";
    }
}

void UserConsoleApp::handleLogin() {
    const auto user = service_.login(
        ConsoleIo::readLine("Email: "),
        ConsoleIo::readLine("Пароль: "));
    if (user) {
        currentUser_ = user;
        std::cout << "Вітаємо, " << user->name << "!\n";
    } else {
        std::cout << "Невірний email або пароль.\n";
    }
}

void UserConsoleApp::printTrainingBrief(const Training& training) const {
    const auto gym = service_.getGymById(training.gymId);
    std::cout << "[" << training.id << "] " << training.title
        << " | " << trainingTypeToString(training.type) << "\n";
    std::cout << "    Тренер: " << training.trainer
        << " | " << training.dateTime << "\n";
    std::cout << "    Вільних місць: " << training.freeSpots()
        << " / " << training.maxParticipants << "\n";
    if (gym) std::cout << "    Клуб: " << gym->name << ", " << gym->address << "\n";
    std::cout << "\n";
}

void UserConsoleApp::handleViewSlots() {
    std::cout << "\n--- Доступні слоти ---\n";
    const auto slots = service_.getAvailableSlots();
    if (slots.empty()) {
        std::cout << "Немає вільних місць.\n";
        return;
    }
    for (const auto& t : slots) printTrainingBrief(t);
}

void UserConsoleApp::handleSearchTrainings() {
    std::cout << "\n--- Пошук тренувань ---\n";
    TrainingFilter filter;
    const std::string keyword = ConsoleIo::readLine("Ключове слово: ");
    if (!keyword.empty()) filter.keyword = keyword;

    const std::string typeStr = ConsoleIo::readLine("Тип (йога/hiit/пілатес, Enter — пропустити): ");
    if (!typeStr.empty()) filter.type = parseTrainingType(typeStr);

    std::cout << "\n--- Клуби ---\n";
    for (const auto& gym : service_.getConnectedGyms()) {
        std::cout << "[" << gym.id << "] " << gym.name << "\n";
    }
    const int gymId = ConsoleIo::readInt("ID клубу (0 — всі): ");
    if (gymId > 0) filter.gymId = gymId;

    const auto results = service_.searchTrainings(filter);
    if (results.empty()) {
        std::cout << "Нічого не знайдено.\n";
        return;
    }
    for (const auto& t : results) printTrainingBrief(t);
}

void UserConsoleApp::handleSelectTrainer() {
    std::cout << "\n--- Тренери ---\n";
    const auto trainers = service_.getAvailableTrainers();
    for (size_t i = 0; i < trainers.size(); ++i) {
        const auto profile = service_.getTrainerProfile(trainers[i]);
        std::cout << (i + 1) << ". " << trainers[i];
        if (profile) std::cout << " ★ " << profile->averageRating;
        std::cout << "\n";
        if (profile) {
            std::cout << "    " << profile->qualifications << "\n";
            std::cout << "    Сертифікати: ";
            for (size_t j = 0; j < profile->certificates.size(); ++j) {
                if (j > 0) std::cout << ", ";
                std::cout << profile->certificates[j];
            }
            std::cout << "\n";
        }
    }
    const std::string trainer = ConsoleIo::readLine("Ім'я тренера: ");
    const auto results = service_.searchTrainings({.trainer = trainer});
    if (results.empty()) {
        std::cout << "Тренувань цього тренера не знайдено.\n";
        return;
    }
    for (const auto& t : results) printTrainingBrief(t);
}

void UserConsoleApp::handleTrainingDetails() {
    const int id = ConsoleIo::readInt("ID тренування: ");
    std::cout << service_.getTrainingDetails(id) << "\n";
}

void UserConsoleApp::handleBookWorkout() {
    handleViewSlots();
    const int id = ConsoleIo::readInt("ID тренування для запису: ");
    std::cout << service_.getTrainingDetails(id) << "\n";
    if (!ConsoleIo::readYesNo("Підтвердити запис?")) {
        std::cout << "Запис скасовано.\n";
        return;
    }
    std::cout << service_.bookWorkout(currentUser_->id, id) << "\n";
}

void UserConsoleApp::handleMyBookings() {
    std::cout << "\n--- Мої записи ---\n";
    const auto bookings = service_.getUserBookings(currentUser_->id);
    if (bookings.empty()) {
        std::cout << "Немає активних записів.\n";
        return;
    }
    for (const auto& b : bookings) {
        const auto training = service_.getTrainingById(b.trainingId);
        std::cout << "Запис #" << b.id << " (BFN-" << b.id << ")";
        if (training) std::cout << " | " << training->title << " | " << training->dateTime;
        std::cout << "\n\n";
    }
}

void UserConsoleApp::handleCancelBooking() {
    handleMyBookings();
    const int id = ConsoleIo::readInt("Номер запису для скасування: ");
    std::cout << service_.cancelBooking(currentUser_->id, id) << "\n";
}

void UserConsoleApp::handleRescheduleBooking() {
    handleMyBookings();
    handleViewSlots();
    const int bookingId = ConsoleIo::readInt("Номер запису: ");
    const int newTrainingId = ConsoleIo::readInt("ID нового тренування: ");
    std::cout << service_.rescheduleBooking(currentUser_->id, bookingId, newTrainingId) << "\n";
}

void UserConsoleApp::handleGymReviews() {
    std::cout << "\n--- Клуби ---\n";
    for (const auto& gym : service_.getConnectedGyms()) {
        std::cout << "[" << gym.id << "] " << gym.name << " ★ "
            << service_.getAverageRating(ReviewTarget::Gym, gym.id) << "\n";
    }
    const int gymId = ConsoleIo::readInt("ID клубу: ");
    std::cout << service_.getGymTrustSummary(gymId) << "\n";
}

void UserConsoleApp::handleProfile() {
    std::cout << service_.getUserProfileSummary(currentUser_->id) << "\n";
}

void UserConsoleApp::handleNotificationSettings() {
    const auto prefs = service_.getUserPreferences(currentUser_->id);
    std::cout << "\n--- Сповіщення (щоб не дратували) ---\n";
    std::cout << "Зараз: нагадування=" << (prefs.notifications.reminders ? "так" : "ні")
        << ", зміни=" << (prefs.notifications.scheduleChanges ? "так" : "ні")
        << ", вільні місця=" << (prefs.notifications.freeSpots ? "так" : "ні")
        << ", акції=" << (prefs.notifications.promotions ? "так" : "ні") << "\n";

    NotificationPreferences updated = prefs.notifications;
    updated.reminders = ConsoleIo::readYesNo("Нагадування про тренування?");
    updated.scheduleChanges = ConsoleIo::readYesNo("Зміни в розкладі?");
    updated.freeSpots = ConsoleIo::readYesNo("Поява вільного місця?");
    updated.promotions = ConsoleIo::readYesNo("Акції та промо?");
    std::cout << service_.updateNotificationPreferences(currentUser_->id, updated) << "\n";
}

void UserConsoleApp::handleNotifications() {
    std::cout << "\n--- Сповіщення ---\n";
    const auto notes = service_.getUserNotifications(currentUser_->email);
    if (notes.empty()) {
        std::cout << "Сповіщень немає.\n";
        return;
    }
    for (const auto& n : notes) {
        std::cout << "[" << notificationTypeToString(n.type) << "] " << n.sentAt << "\n";
        std::cout << "    " << n.message << "\n\n";
    }
}
