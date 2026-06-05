#pragma once

#include <string>

enum class TrainingType {
    Yoga,
    HIIT,
    Strength,
    Pilates,
    CrossFit,
    Stretching,
    Bodybuilding,
    Functional,
    Other
};

enum class PaymentStatus { Unpaid, Paid };

enum class PaymentMethod { None, Membership, OneTime, Online, Cash };

enum class AttendanceStatus { NotVisited, Visited };

enum class BookingStatus { Confirmed, Cancelled, Rescheduled };

enum class NotificationType {
    Reminder,
    ScheduleChange,
    FreeSpot,
    Promotion,
    LowEnrollment,
    TrainerReminder,
    ScheduleConfirmation
};

enum class StaffRole { Admin, Trainer, Manager };

std::string trainingTypeToString(TrainingType type);
std::string paymentStatusToString(PaymentStatus status);
std::string paymentMethodToString(PaymentMethod method);
std::string attendanceStatusToString(AttendanceStatus status);
std::string notificationTypeToString(NotificationType type);
std::string staffRoleToString(StaffRole role);

TrainingType parseTrainingType(const std::string& value);
