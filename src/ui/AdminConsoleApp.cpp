#include "ui/AdminConsoleApp.h"

#include <iostream>

#include "ui/ConsoleIo.h"

AdminConsoleApp::AdminConsoleApp(BeFitNowService& service) : service_(service) {}

void AdminConsoleApp::run() {
    std::cout << "\n========================================\n";
    std::cout << "   BeFitNow — Веб-панель адміністратора\n";
    std::cout << "========================================\n";
    std::cout << "Керування розкладом — тут, не в чатботі.\n";
    showLogin();
}

void AdminConsoleApp::showLogin() {
    const std::string email = ConsoleIo::readLine("Email адміна: ");
    const std::string password = ConsoleIo::readLine("Пароль: ");
    if (service_.adminLogin(email, password)) {
        authenticated_ = true;
        std::cout << "Вхід успішний.\n";
        showMainMenu();
    } else {
        std::cout << "Невірні дані. (demo: admin@befitnow.com / admin)\n";
    }
}

void AdminConsoleApp::showMainMenu() {
    while (authenticated_) {
        std::cout << "\n--- Адмін-панель ---\n";
        std::cout << " РОЗКЛАД\n";
        std::cout << "  1. Розклад клубу (вільні місця)\n";
        std::cout << "  2. Створити тренування\n";
        std::cout << "  3. Редагувати тренування\n";
        std::cout << "  4. Видалити тренування\n";
        std::cout << " БРОНЮВАННЯ\n";
        std::cout << "  5. Всі бронювання\n";
        std::cout << "  6. Створити бронювання\n";
        std::cout << "  7. Перенести бронювання\n";
        std::cout << "  8. Видалити бронювання\n";
        std::cout << "  9. Статус оплати\n";
        std::cout << " 10. Статус відвідування\n";
        std::cout << " КЛІЄНТИ ТА АБОНЕМЕНТИ\n";
        std::cout << " 11. База клієнтів\n";
        std::cout << " 12. База абонементів\n";
        std::cout << " 13. Створити абонемент\n";
        std::cout << " 14. Залишок занять в абонементі\n";
        std::cout << " ПЕРСОНАЛ ТА СПОВІЩЕННЯ\n";
        std::cout << " 15. Сповіщення\n";
        std::cout << " 16. Перевірка мало записів\n";
        std::cout << " 17. Нагадування тренерам\n";
        std::cout << " 18. Розклад на підтвердження\n";
        std::cout << " 19. Коментарі до слотів\n";
        std::cout << " СТАТИСТИКА\n";
        std::cout << " 20. Статистика оплат\n";
        std::cout << " 21. Розіслати акцію\n";
        std::cout << "  0. Вихід\n";

        switch (ConsoleIo::readInt("Оберіть дію: ")) {
            case 1: handleSchedule(); break;
            case 2: handleCreateTraining(); break;
            case 3: handleEditTraining(); break;
            case 4: handleDeleteTraining(); break;
            case 5: handleBookings(); break;
            case 6: handleAdminCreateBooking(); break;
            case 7: handleAdminRescheduleBooking(); break;
            case 8: handleAdminDeleteBooking(); break;
            case 9: handleUpdatePaymentStatus(); break;
            case 10: handleUpdateAttendance(); break;
            case 11: handleClients(); break;
            case 12: handleMemberships(); break;
            case 13: handleCreateMembership(); break;
            case 14: handleMembershipReport(); break;
            case 15: handleNotifications(); break;
            case 16: handleLowEnrollmentCheck(); break;
            case 17: handleTrainerReminders(); break;
            case 18: handleSendScheduleConfirmation(); break;
            case 19: handleScheduleComments(); break;
            case 20: handlePaymentStats(); break;
            case 21: handlePromotions(); break;
            case 0:
                authenticated_ = false;
                return;
            default: std::cout << "Невірний вибір.\n";
        }
    }
}

void AdminConsoleApp::handleSchedule() {
    for (const auto& gym : service_.getConnectedGyms()) {
        std::cout << "\n" << service_.getClubSchedule(gym.id);
    }
}

void AdminConsoleApp::handleCreateTraining() {
    Training t;
    t.gymId = ConsoleIo::readInt("ID залу: ");
    t.title = ConsoleIo::readLine("Назва: ");
    t.trainer = ConsoleIo::readLine("Тренер: ");
    t.description = ConsoleIo::readLine("Опис: ");
    t.dateTime = ConsoleIo::readLine("Дата і час (YYYY-MM-DD HH:MM): ");
    t.type = parseTrainingType(ConsoleIo::readLine("Тип: "));
    t.durationMinutes = ConsoleIo::readInt("Тривалість (хв): ");
    t.maxParticipants = ConsoleIo::readInt("Макс. учасників: ");
    t.minParticipants = ConsoleIo::readInt("Мін. для проведення: ");
    t.bookingDeadlineHours = ConsoleIo::readInt("Дедлайн бронювання (год): ");
    t.price = ConsoleIo::readDouble("Ціна (грн): ");
    std::cout << service_.createTraining(t) << "\n";
}

void AdminConsoleApp::handleEditTraining() {
    const int id = ConsoleIo::readInt("ID тренування: ");
    const auto existing = service_.getTrainingById(id);
    if (!existing) {
        std::cout << "Не знайдено.\n";
        return;
    }
    Training t = *existing;
    t.title = ConsoleIo::readLine("Назва [" + t.title + "]: ");
    if (t.title.empty()) t.title = existing->title;
    t.trainer = ConsoleIo::readLine("Тренер [" + t.trainer + "]: ");
    if (t.trainer.empty()) t.trainer = existing->trainer;
    t.dateTime = ConsoleIo::readLine("Дата [" + t.dateTime + "]: ");
    if (t.dateTime.empty()) t.dateTime = existing->dateTime;
    t.price = ConsoleIo::readDouble("Ціна [" + std::to_string(t.price) + "]: ");
    std::cout << service_.updateTraining(id, t) << "\n";
}

void AdminConsoleApp::handleDeleteTraining() {
    const int id = ConsoleIo::readInt("ID тренування для видалення: ");
    std::cout << service_.deleteTraining(id) << "\n";
}

void AdminConsoleApp::handleBookings() {
    std::cout << "\n--- Всі бронювання ---\n";
    for (const auto& b : service_.getAllBookings()) {
        if (b.status != BookingStatus::Confirmed) continue;
        const auto client = service_.getClientById(b.userId);
        const auto training = service_.getTrainingById(b.trainingId);
        std::cout << "#" << b.id;
        if (client) std::cout << " | " << client->name;
        if (training) std::cout << " | " << training->title << " | записано: "
            << service_.getRegisteredCount(b.trainingId);
        std::cout << "\n    " << paymentStatusToString(b.paymentStatus)
            << " | " << attendanceStatusToString(b.attendanceStatus) << "\n\n";
    }
}

void AdminConsoleApp::handleAdminCreateBooking() {
    handleClients();
    const int clientId = ConsoleIo::readInt("ID клієнта: ");
    const int trainingId = ConsoleIo::readInt("ID тренування: ");
    std::cout << "1.Онлайн 2.Абонемент 3.Готівка 4.Разово\n";
    PaymentMethod method = PaymentMethod::Cash;
    switch (ConsoleIo::readInt("Спосіб: ")) {
        case 1: method = PaymentMethod::Online; break;
        case 2: method = PaymentMethod::Membership; break;
        case 3: method = PaymentMethod::Cash; break;
        case 4: method = PaymentMethod::OneTime; break;
    }
    std::cout << service_.adminCreateBooking(clientId, trainingId, method) << "\n";
}

void AdminConsoleApp::handleAdminRescheduleBooking() {
    const int bookingId = ConsoleIo::readInt("ID бронювання: ");
    const int newTrainingId = ConsoleIo::readInt("ID нового тренування: ");
    std::cout << service_.adminRescheduleBooking(bookingId, newTrainingId) << "\n";
}

void AdminConsoleApp::handleAdminDeleteBooking() {
    const int id = ConsoleIo::readInt("ID бронювання: ");
    std::cout << service_.adminDeleteBooking(id) << "\n";
}

void AdminConsoleApp::handleUpdatePaymentStatus() {
    const int id = ConsoleIo::readInt("ID бронювання: ");
    const bool paid = ConsoleIo::readYesNo("Оплачено?");
    std::cout << "1.Онлайн 2.Абонемент 3.Готівка 4.Разово\n";
    PaymentMethod method = PaymentMethod::Cash;
    switch (ConsoleIo::readInt("Спосіб: ")) {
        case 1: method = PaymentMethod::Online; break;
        case 2: method = PaymentMethod::Membership; break;
        case 3: method = PaymentMethod::Cash; break;
        case 4: method = PaymentMethod::OneTime; break;
    }
    std::cout << service_.updateBookingPayment(id,
        paid ? PaymentStatus::Paid : PaymentStatus::Unpaid, method) << "\n";
}

void AdminConsoleApp::handleUpdateAttendance() {
    const int id = ConsoleIo::readInt("ID бронювання: ");
    const bool visited = ConsoleIo::readYesNo("Відвідано?");
    std::cout << service_.updateBookingAttendance(id,
        visited ? AttendanceStatus::Visited : AttendanceStatus::NotVisited) << "\n";
}

void AdminConsoleApp::handleClients() {
    std::cout << "\n--- База клієнтів ---\n";
    for (const auto& c : service_.getAllClients()) {
        std::cout << "[" << c.id << "] " << c.name << " | " << c.email
            << " | " << c.phone;
        if (c.membershipId) std::cout << " | абонемент #" << *c.membershipId;
        std::cout << "\n";
    }
}

void AdminConsoleApp::handleMemberships() {
    std::cout << "\n--- База абонементів ---\n";
    for (const auto& m : service_.getAllMemberships()) {
        const auto client = service_.getClientById(m.clientId);
        std::cout << "[" << m.id << "] " << m.typeName;
        if (client) std::cout << " | " << client->name;
        std::cout << " | залишок: " << m.remainingSessions()
            << "/" << m.totalSessions << " | до " << m.validUntil << "\n";
    }
}

void AdminConsoleApp::handleCreateMembership() {
    handleClients();
    const int clientId = ConsoleIo::readInt("ID клієнта: ");
    const std::string type = ConsoleIo::readLine("Тип абонемента: ");
    const int sessions = ConsoleIo::readInt("Кількість занять: ");
    const std::string until = ConsoleIo::readLine("Дійсний до (YYYY-MM-DD): ");
    std::cout << service_.createMembership(clientId, type, sessions, until) << "\n";
}

void AdminConsoleApp::handleMembershipReport() {
    const int clientId = ConsoleIo::readInt("ID клієнта: ");
    std::cout << service_.getMembershipUsageReport(clientId) << "\n";
}

void AdminConsoleApp::handleNotifications() {
    std::cout << "\n--- Сповіщення ---\n";
    for (const auto& n : service_.getAllNotifications()) {
        std::cout << "→ " << n.recipientEmail << " [" << notificationTypeToString(n.type) << "]\n";
        std::cout << "  " << n.message << "\n\n";
    }
}

void AdminConsoleApp::handleLowEnrollmentCheck() {
    std::cout << service_.checkLowEnrollmentAlerts() << "\n";
}

void AdminConsoleApp::handleTrainerReminders() {
    std::cout << service_.sendTrainerReminders() << "\n";
}

void AdminConsoleApp::handleSendScheduleConfirmation() {
    const int gymId = ConsoleIo::readInt("ID залу: ");
    std::cout << service_.sendScheduleForConfirmation(gymId) << "\n";
}

void AdminConsoleApp::handleScheduleComments() {
    const int trainingId = ConsoleIo::readInt("ID слота: ");
    const int staffId = ConsoleIo::readInt("ID співробітника: ");
    const std::string comment = ConsoleIo::readLine("Коментар: ");
    std::cout << service_.addScheduleComment(trainingId, staffId, comment) << "\n";

    for (const auto& c : service_.getScheduleComments(trainingId)) {
        std::cout << "  [staff #" << c.staffId << "] " << c.comment << "\n";
    }
}

void AdminConsoleApp::handlePaymentStats() {
    const auto stats = service_.getPaymentStats();
    std::cout << "\n--- Статистика оплат ---\n";
    std::cout << "Абонементом: " << stats.membershipCount << "\n";
    std::cout << "Разово:      " << stats.oneTimeCount << "\n";
    std::cout << "Онлайн:      " << stats.onlineCount << "\n";
    std::cout << "Готівкою:    " << stats.cashCount << "\n";
    std::cout << "Дохід:       " << stats.totalRevenue << " грн\n";
}

void AdminConsoleApp::handlePromotions() {
    const std::string msg = ConsoleIo::readLine("Текст акції: ");
    std::cout << service_.broadcastPromotion(msg) << "\n";
}
