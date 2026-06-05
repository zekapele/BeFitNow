#pragma once

#include "services/BeFitNowService.h"

class AdminConsoleApp {
public:
    explicit AdminConsoleApp(BeFitNowService& service);

    void run();

private:
    BeFitNowService& service_;
    bool authenticated_ = false;

    void showLogin();
    void showMainMenu();

    void handleSchedule();
    void handleCreateTraining();
    void handleEditTraining();
    void handleDeleteTraining();
    void handleBookings();
    void handleAdminCreateBooking();
    void handleAdminRescheduleBooking();
    void handleAdminDeleteBooking();
    void handleUpdatePaymentStatus();
    void handleUpdateAttendance();
    void handleClients();
    void handleMemberships();
    void handleCreateMembership();
    void handleMembershipReport();
    void handleNotifications();
    void handleLowEnrollmentCheck();
    void handleTrainerReminders();
    void handleSendScheduleConfirmation();
    void handleScheduleComments();
    void handlePaymentStats();
    void handlePromotions();
};
