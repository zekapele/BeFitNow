#pragma once

#include <string>

struct FaqEntry {
    std::string question;
    std::string answer;
};

struct SupportTicket {
    int id = 0;
    std::string userName;
    std::string userEmail;
    std::string subject;
    std::string message;
    bool escalatedToHuman = false;
    std::string status;
    std::string createdAt;
};
