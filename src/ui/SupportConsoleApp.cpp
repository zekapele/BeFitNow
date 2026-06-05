#include "ui/SupportConsoleApp.h"

#include <iostream>

#include "ui/ConsoleIo.h"

SupportConsoleApp::SupportConsoleApp(BeFitNowService& service) : service_(service) {}

void SupportConsoleApp::run() {
    std::cout << "\n========================================\n";
    std::cout << "         BeFitNow — Підтримка\n";
    std::cout << "========================================\n";
    showMenu();
}

void SupportConsoleApp::showMenu() {
    while (true) {
        std::cout << "\n--- Підтримка ---\n";
        std::cout << "1. FAQ\n";
        std::cout << "2. Зв'язатися з підтримкою\n";
        std::cout << "3. Передати запит співробітнику\n";
        std::cout << "0. Назад\n";

        switch (ConsoleIo::readInt("Оберіть дію: ")) {
            case 1: handleFaq(); break;
            case 2: handleContactSupport(); break;
            case 3: handleEscalateToHuman(); break;
            case 0: return;
            default: std::cout << "Невірний вибір.\n";
        }
    }
}

void SupportConsoleApp::ensureOptionalUser() {
    if (currentUser_) return;
    std::cout << "Для звернення вкажіть контактні дані.\n";
}

void SupportConsoleApp::handleFaq() {
    std::cout << "\n--- FAQ ---\n";
    const std::string query = ConsoleIo::readLine("Пошук (Enter — показати все): ");
    const auto entries = query.empty()
        ? service_.getFaqEntries()
        : service_.searchFaq(query);

    if (entries.empty()) {
        std::cout << "Нічого не знайдено.\n";
        return;
    }
    for (size_t i = 0; i < entries.size(); ++i) {
        std::cout << "\n" << (i + 1) << ". " << entries[i].question << "\n";
        std::cout << "   " << entries[i].answer << "\n";
    }
}

void SupportConsoleApp::handleContactSupport() {
    ensureOptionalUser();
    const std::string name = currentUser_
        ? currentUser_->name
        : ConsoleIo::readLine("Ім'я: ");
    const std::string email = currentUser_
        ? currentUser_->email
        : ConsoleIo::readLine("Email: ");
    const std::string subject = ConsoleIo::readLine("Тема: ");
    const std::string message = ConsoleIo::readLine("Повідомлення: ");
    std::cout << service_.submitSupportRequest(name, email, subject, message) << "\n";
}

void SupportConsoleApp::handleEscalateToHuman() {
    ensureOptionalUser();
    std::cout << "Складні запити (перенесення адміном, особливі умови) передаються співробітнику.\n";
    const std::string name = currentUser_
        ? currentUser_->name
        : ConsoleIo::readLine("Ім'я: ");
    const std::string email = currentUser_
        ? currentUser_->email
        : ConsoleIo::readLine("Email: ");
    const std::string message = ConsoleIo::readLine("Опишіть запит: ");
    std::cout << service_.escalateToHuman(name, email, message) << "\n";
}
