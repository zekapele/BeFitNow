#include "ui/TrainerConsoleApp.h"

#include <iostream>

#include "ui/ConsoleIo.h"

TrainerConsoleApp::TrainerConsoleApp(BeFitNowService& service) : service_(service) {}

void TrainerConsoleApp::run() {
    std::cout << "\n========================================\n";
    std::cout << "      BeFitNow — Панель тренера\n";
    std::cout << "========================================\n";
    std::cout << "Розклад керується через веб-панель адміна.\n";
    std::cout << "Тут — перегляд занять і нагадування.\n";
    showLogin();
}

void TrainerConsoleApp::showLogin() {
    const std::string email = ConsoleIo::readLine("Email тренера: ");
    const std::string password = ConsoleIo::readLine("Пароль: ");
    const auto trainer = service_.trainerLogin(email, password);
    if (!trainer) {
        std::cout << "Невірні дані. (demo: olena@fitzone.ua / trainer)\n";
        return;
    }
    currentTrainer_ = trainer;
    std::cout << "Вітаємо, " << trainer->name << "!\n";
    showMainMenu();
}

void TrainerConsoleApp::showMainMenu() {
    while (currentTrainer_) {
        std::cout << "\n--- Тренер: " << currentTrainer_->name << " ---\n";
        std::cout << "1. Мій розклад\n";
        std::cout << "2. Нагадування\n";
        std::cout << "0. Вихід\n";

        switch (ConsoleIo::readInt("Оберіть: ")) {
            case 1: handleMySchedule(); break;
            case 2: handleNotifications(); break;
            case 0:
                currentTrainer_ = std::nullopt;
                return;
            default: std::cout << "Невірний вибір.\n";
        }
    }
}

void TrainerConsoleApp::handleMySchedule() {
    std::cout << "\n--- Мої тренування ---\n";
    const auto trainings = service_.getTrainingsForTrainer(currentTrainer_->name);
    if (trainings.empty()) {
        std::cout << "Немає запланованих тренувань.\n";
        return;
    }
    for (const auto& t : trainings) {
        const auto gym = service_.getGymById(t.gymId);
        std::cout << "[" << t.id << "] " << t.title << " | " << t.dateTime << "\n";
        std::cout << "    Записано: " << service_.getRegisteredCount(t.id)
            << " / " << t.maxParticipants << "\n";
        if (gym) std::cout << "    Клуб: " << gym->name << "\n";
        std::cout << "\n";
    }
}

void TrainerConsoleApp::handleNotifications() {
    std::cout << "\n--- Нагадування ---\n";
    const auto notes = service_.getStaffNotifications(currentTrainer_->email);
    if (notes.empty()) {
        std::cout << "Сповіщень немає.\n";
        return;
    }
    for (const auto& n : notes) {
        std::cout << "[" << notificationTypeToString(n.type) << "] " << n.sentAt << "\n";
        std::cout << "    " << n.message << "\n\n";
    }
}
