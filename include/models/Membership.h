#pragma once

#include <string>

struct Membership {
    int id = 0;
    int clientId = 0;
    std::string typeName;
    int totalSessions = 0;
    int bookedSessions = 0;
    int returnedSessions = 0;
    std::string validUntil;
    bool active = true;

    int remainingSessions() const {
        return totalSessions - bookedSessions + returnedSessions;
    }
};
