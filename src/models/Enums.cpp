#include "models/Enums.h"

#include <algorithm>
#include <cctype>

std::string trainingTypeToString(TrainingType type) {
    switch (type) {
        case TrainingType::Yoga: return "Йога";
        case TrainingType::HIIT: return "HIIT";
        case TrainingType::Strength: return "Силове";
        case TrainingType::Pilates: return "Пілатес";
        case TrainingType::CrossFit: return "CrossFit";
        case TrainingType::Stretching: return "Стретчинг";
        case TrainingType::Bodybuilding: return "Бодібілдинг";
        case TrainingType::Functional: return "Функціональне";
        case TrainingType::Other: return "Інше";
    }
    return "Інше";
}

std::string paymentStatusToString(PaymentStatus status) {
    return status == PaymentStatus::Paid ? "Оплачено" : "Не оплачено";
}

std::string paymentMethodToString(PaymentMethod method) {
    switch (method) {
        case PaymentMethod::Membership: return "Абонемент";
        case PaymentMethod::OneTime: return "Разово";
        case PaymentMethod::Online: return "Онлайн";
        case PaymentMethod::Cash: return "Готівка";
        case PaymentMethod::None: return "—";
    }
    return "—";
}

std::string attendanceStatusToString(AttendanceStatus status) {
    return status == AttendanceStatus::Visited ? "Відвідано" : "Не відвідано";
}

std::string notificationTypeToString(NotificationType type) {
    switch (type) {
        case NotificationType::Reminder: return "Нагадування";
        case NotificationType::ScheduleChange: return "Зміна розкладу";
        case NotificationType::FreeSpot: return "Вільне місце";
        case NotificationType::Promotion: return "Акція";
        case NotificationType::LowEnrollment: return "Мало записів";
        case NotificationType::TrainerReminder: return "Нагадування тренеру";
        case NotificationType::ScheduleConfirmation: return "Підтвердження розкладу";
    }
    return "Сповіщення";
}

std::string staffRoleToString(StaffRole role) {
    switch (role) {
        case StaffRole::Admin: return "Адміністратор";
        case StaffRole::Trainer: return "Тренер";
        case StaffRole::Manager: return "Менеджер";
    }
    return "Персонал";
}

TrainingType parseTrainingType(const std::string& value) {
    std::string lower = value;
    std::transform(lower.begin(), lower.end(), lower.begin(),
        [](unsigned char c) { return static_cast<char>(std::tolower(c)); });

    if (lower.find("йог") != std::string::npos) return TrainingType::Yoga;
    if (lower.find("hiit") != std::string::npos) return TrainingType::HIIT;
    if (lower.find("силов") != std::string::npos) return TrainingType::Strength;
    if (lower.find("пілатес") != std::string::npos) return TrainingType::Pilates;
    if (lower.find("crossfit") != std::string::npos || lower.find("крос") != std::string::npos) {
        return TrainingType::CrossFit;
    }
    if (lower.find("стретч") != std::string::npos) return TrainingType::Stretching;
    if (lower.find("боді") != std::string::npos) return TrainingType::Bodybuilding;
    if (lower.find("функц") != std::string::npos) return TrainingType::Functional;
    return TrainingType::Other;
}
