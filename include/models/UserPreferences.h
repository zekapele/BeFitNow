#pragma once

struct NotificationPreferences {
    bool reminders = true;
    bool scheduleChanges = true;
    bool freeSpots = true;
    bool promotions = false;
};

struct UserPreferences {
    int userId = 0;
    NotificationPreferences notifications;
};
