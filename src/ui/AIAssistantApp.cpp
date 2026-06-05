#include "ui/AIAssistantApp.h"

#include <iostream>

#include "ui/ConsoleIo.h"

AIAssistantApp::AIAssistantApp(BeFitNowService& service) : service_(service) {}

void AIAssistantApp::run() {
    std::cout << "\n========================================\n";
    std::cout << "    BeFitNow — Чатбот у застосунку\n";
    std::cout << "========================================\n";
    std::cout << "Швидкий запис без очікування менеджера.\n";
    std::cout << "MVP: слоти, пошук, тренер, запис, скасування,\n";
    std::cout << "перенесення, нагадування, FAQ, підтримка.\n";
    std::cout << "Оплата — не в MVP. Напишіть \"допомога\".\n\n";

    ensureLoggedIn();
    if (!currentUser_) return;

    while (true) {
        const std::string query = ConsoleIo::readLine("\nВи: ");
        if (query == "вихід" || query == "exit" || query == "0") {
            std::cout << "AI: До побачення!\n";
            return;
        }
        std::cout << "AI: " << service_.processAIQuery(currentUser_->id, query) << "\n";
    }
}

void AIAssistantApp::ensureLoggedIn() {
    std::cout << "Для роботи AI потрібен вхід.\n";
    std::cout << "1. Вхід  2. Реєстрація  0. Назад\n";
    switch (ConsoleIo::readInt("Оберіть: ")) {
        case 1: {
            const auto user = service_.login(
                ConsoleIo::readLine("Email: "),
                ConsoleIo::readLine("Пароль: "));
            if (user) {
                currentUser_ = user;
                std::cout << "Вітаємо, " << user->name << "!\n";
            } else {
                std::cout << "Невірні дані.\n";
            }
            break;
        }
        case 2: {
            const auto user = service_.registerUser(
                ConsoleIo::readLine("Ім'я: "),
                ConsoleIo::readLine("Email: "),
                ConsoleIo::readLine("Пароль: "),
                ConsoleIo::readLine("Телефон: "));
            if (user) {
                currentUser_ = user;
                std::cout << "Реєстрація успішна!\n";
            }
            break;
        }
        default: break;
    }
}
