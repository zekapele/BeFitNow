#include "ui/LauncherApp.h"

#include <iostream>

#include "ui/AIAssistantApp.h"
#include "ui/ConsoleIo.h"
#include "ui/SupportConsoleApp.h"
#include "ui/UserConsoleApp.h"

LauncherApp::LauncherApp(BeFitNowService& service) : service_(service) {}

void LauncherApp::run() {
    std::cout << "\nBeFitNow — запис на тренування (24/7)\n";

    while (true) {
        std::cout << "\n╔══════════════════════════════════════╗\n";
        std::cout << "║            BeFitNow                  ║\n";
        std::cout << "╚══════════════════════════════════════╝\n";
        std::cout << "1. Запис на тренування\n";
        std::cout << "2. Чатбот\n";
        std::cout << "3. FAQ та підтримка\n";
        std::cout << "0. Вихід\n";

        switch (ConsoleIo::readInt("Оберіть: ")) {
            case 1: UserConsoleApp(service_).run(); break;
            case 2: AIAssistantApp(service_).run(); break;
            case 3: SupportConsoleApp(service_).run(); break;
            case 0:
                std::cout << "До побачення!\n";
                return;
            default:
                std::cout << "Невірний вибір.\n";
        }
    }
}
