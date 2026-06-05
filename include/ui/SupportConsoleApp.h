#pragma once

#include <optional>

#include "models/User.h"
#include "services/BeFitNowService.h"

class SupportConsoleApp {
public:
    explicit SupportConsoleApp(BeFitNowService& service);

    void run();

private:
    BeFitNowService& service_;
    std::optional<User> currentUser_;

    void showMenu();
    void handleFaq();
    void handleContactSupport();
    void handleEscalateToHuman();
    void ensureOptionalUser();
};
