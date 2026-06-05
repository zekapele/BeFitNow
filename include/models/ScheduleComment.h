#pragma once

#include <string>

struct ScheduleComment {
    int id = 0;
    int trainingId = 0;
    int staffId = 0;
    std::string comment;
    std::string createdAt;
};

struct ScheduleConfirmation {
    int trainingId = 0;
    int staffId = 0;
    bool confirmed = false;
    std::string comment;
    std::string respondedAt;
};

struct ClubSettings {
    int gymId = 0;
    int minParticipantsDefault = 3;
    int bookingDeadlineHoursDefault = 2;
    int trainerReminderHoursBefore = 1;
};
