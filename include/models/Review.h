#pragma once

#include <string>
#include <vector>

enum class ReviewTarget { Gym, Training, Trainer };

struct Review {
    int id = 0;
    ReviewTarget target = ReviewTarget::Gym;
    int targetId = 0;
    std::string targetName;
    std::string authorName;
    int rating = 5;
    std::string comment;
    std::string createdAt;
};

struct TrainerProfile {
    std::string name;
    std::string qualifications;
    std::vector<std::string> certificates;
    double averageRating = 0.0;
    int reviewCount = 0;
};
