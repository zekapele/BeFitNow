#pragma once

#include <optional>

#include "models/Staff.h"
#include "services/BeFitNowService.h"

class TrainerConsoleApp {
public:
    explicit TrainerConsoleApp(BeFitNowService& service);

    void run();

private:
    BeFitNowService& service_;
    std::optional<Staff> currentTrainer_;

    void showLogin();
    void showMainMenu();
    void handleMySchedule();
    void handleNotifications();
};
