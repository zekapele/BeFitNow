#pragma once

#include <string>

struct Gym {
    int id = 0;
    std::string name;
    std::string address;
    std::string description;
    bool connected = true;
};
