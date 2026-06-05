#pragma once

#include <optional>

#include "models/Training.h"
#include "models/User.h"
#include "services/BeFitNowService.h"

class UserConsoleApp {
public:
    explicit UserConsoleApp(BeFitNowService& service);

    void run();

private:
    BeFitNowService& service_;
    std::optional<User> currentUser_;

    void showAuthMenu();
    void showMainMenu();

    void handleRegister();
    void handleLogin();
    void handleViewSlots();
    void handleSearchTrainings();
    void handleSelectTrainer();
    void handleTrainingDetails();
    void handleBookWorkout();
    void handleMyBookings();
    void handleCancelBooking();
    void handleRescheduleBooking();
    void handleNotifications();
    void handleProfile();
    void handleNotificationSettings();
    void handleGymReviews();

    void printTrainingBrief(const Training& training) const;
};
