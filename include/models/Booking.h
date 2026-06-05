#pragma once

#include <optional>
#include <string>

#include "models/Enums.h"

struct Booking {
    int id = 0;
    int userId = 0;
    int trainingId = 0;
    BookingStatus status = BookingStatus::Confirmed;
    PaymentStatus paymentStatus = PaymentStatus::Unpaid;
    PaymentMethod paymentMethod = PaymentMethod::None;
    AttendanceStatus attendanceStatus = AttendanceStatus::NotVisited;
    std::string createdAt;
    std::optional<int> rescheduledFromTrainingId;
};

struct PaymentStats {
    int membershipCount = 0;
    int oneTimeCount = 0;
    int onlineCount = 0;
    int cashCount = 0;
    double totalRevenue = 0.0;
};
