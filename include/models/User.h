#pragma once

#include <optional>
#include <string>

struct User {
    int id = 0;
    std::string name;
    std::string email;
    std::string password;
    std::string phone;
    std::optional<int> membershipId;
};
