#pragma once

#include <optional>

#include "models/User.h"
#include "services/BeFitNowService.h"

class AIAssistantApp {
public:
    explicit AIAssistantApp(BeFitNowService& service);

    void run();

private:
    BeFitNowService& service_;
    std::optional<User> currentUser_;

    void ensureLoggedIn();
};
