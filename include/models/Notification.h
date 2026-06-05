#pragma once

#include <string>

#include "models/Enums.h"

struct Notification {
    int id = 0;
    std::string recipientEmail;
    NotificationType type = NotificationType::Reminder;
    std::string message;
    std::string sentAt;
    bool read = false;
};
