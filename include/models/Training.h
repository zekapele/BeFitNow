#pragma once

#include <optional>
#include <string>

#include "models/Enums.h"

struct Training {
    int id = 0;
    int gymId = 0;
    std::string title;
    std::string trainer;
    std::string description;
    std::string dateTime;
    TrainingType type = TrainingType::Other;
    int durationMinutes = 60;
    int maxParticipants = 20;
    int currentParticipants = 0;
    int minParticipants = 3;
    int bookingDeadlineHours = 2;
    double price = 0.0;

    int freeSpots() const {
        return maxParticipants - currentParticipants;
    }
};

struct TrainingFilter {
    std::optional<std::string> trainer;
    std::optional<TrainingType> type;
    std::optional<int> gymId;
    std::optional<std::string> keyword;
};
