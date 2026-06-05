#pragma once

#include <string>

#include "models/Enums.h"

struct Staff {
    int id = 0;
    int gymId = 0;
    std::string name;
    std::string email;
    StaffRole role = StaffRole::Trainer;
};
