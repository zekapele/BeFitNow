#pragma once

#include <optional>
#include <string>
#include <vector>

#include "models/Booking.h"
#include "models/Gym.h"
#include "models/Membership.h"
#include "models/Notification.h"
#include "models/Review.h"
#include "models/ScheduleComment.h"
#include "models/Staff.h"
#include "models/SupportTicket.h"
#include "models/UserPreferences.h"
#include "models/Training.h"
#include "models/User.h"

struct OperationResult {
    bool success = false;
    int entityId = 0;
    std::string message;
};

class BeFitNowService {
public:
    BeFitNowService();

    // --- Auth ---
    std::optional<User> registerUser(const std::string& name,
                                     const std::string& email,
                                     const std::string& password,
                                     const std::string& phone = "");
    std::optional<User> login(const std::string& email, const std::string& password);
    bool adminLogin(const std::string& email, const std::string& password) const;

    // --- Gyms ---
    std::vector<Gym> getConnectedGyms() const;
    std::optional<Gym> getGymById(int gymId) const;

    // --- Trainings (user) ---
    std::vector<Training> getAllTrainings() const;
    std::vector<Training> searchTrainings(const TrainingFilter& filter) const;
    std::vector<Training> getTrainingsByGym(int gymId) const;
    std::optional<Training> getTrainingById(int trainingId) const;
    std::string getTrainingDetails(int trainingId) const;

    // --- Bookings (MVP user flow) ---
    std::vector<Training> getAvailableSlots() const;
    std::vector<std::string> getAvailableTrainers() const;
    std::string bookWorkout(int userId, int trainingId);
    std::string formatInstantConfirmation(int bookingId) const;
    std::string bookTraining(int userId, int trainingId, PaymentMethod method);
    std::string cancelBooking(int userId, int bookingId);
    std::string rescheduleBooking(int userId, int bookingId, int newTrainingId);
    std::string payOnline(int userId, int bookingId);
    std::vector<Booking> getUserBookings(int userId) const;
    std::vector<Notification> getUserNotifications(const std::string& email) const;
    std::string suggestAlternatives(int trainingId) const;
    std::vector<Training> findAlternativeSlots(int trainingId) const;

    // --- Reviews & trust signals ---
    std::vector<Review> getGymReviews(int gymId) const;
    std::vector<Review> getTrainingReviews(int trainingId) const;
    std::vector<Review> getTrainerReviews(const std::string& trainerName) const;
    double getAverageRating(ReviewTarget target, int targetId,
                            const std::string& targetName = "") const;
    std::optional<TrainerProfile> getTrainerProfile(const std::string& trainerName) const;
    std::string getGymTrustSummary(int gymId) const;

    // --- User profile & preferences ---
    std::string getUserProfileSummary(int userId) const;
    UserPreferences getUserPreferences(int userId) const;
    std::string updateNotificationPreferences(int userId, const NotificationPreferences& prefs);

    // --- Trainer (in-app, not admin web panel) ---
    std::optional<Staff> trainerLogin(const std::string& email,
                                      const std::string& password) const;
    std::vector<Training> getTrainingsForTrainer(const std::string& trainerName) const;
    std::vector<Notification> getStaffNotifications(const std::string& email) const;

    // --- Support & FAQ (MVP) ---
    std::vector<FaqEntry> getFaqEntries() const;
    std::vector<FaqEntry> searchFaq(const std::string& keyword) const;
    std::string submitSupportRequest(const std::string& name, const std::string& email,
                                     const std::string& subject, const std::string& message);
    std::string escalateToHuman(const std::string& name, const std::string& email,
                                const std::string& message);
    std::vector<SupportTicket> getSupportTickets() const;

    // --- Memberships ---
    std::vector<Membership> getAllMemberships() const;
    std::optional<Membership> getMembershipById(int id) const;
    std::optional<Membership> getMembershipForClient(int clientId) const;
    std::string createMembership(int clientId, const std::string& typeName,
                                 int totalSessions, const std::string& validUntil);
    std::string updateMembership(int membershipId, int totalSessions,
                                 const std::string& validUntil, bool active);
    std::string deleteMembership(int membershipId);

    // --- Clients ---
    std::vector<User> getAllClients() const;
    std::optional<User> getClientById(int id) const;
    std::string updateClient(int clientId, const std::string& name,
                             const std::string& phone, const std::string& email);

    // --- Admin: schedule ---
    std::string getClubSchedule(int gymId) const;
    std::string createTraining(const Training& training);
    std::string updateTraining(int trainingId, const Training& updated);
    std::string deleteTraining(int trainingId);

    // --- Admin: bookings ---
    std::vector<Booking> getAllBookings() const;
    std::vector<Booking> getBookingsForTraining(int trainingId) const;
    int getRegisteredCount(int trainingId) const;
    std::string adminCreateBooking(int clientId, int trainingId, PaymentMethod method);
    std::string adminRescheduleBooking(int bookingId, int newTrainingId);
    std::string adminDeleteBooking(int bookingId);
    std::string updateBookingPayment(int bookingId, PaymentStatus status, PaymentMethod method);
    std::string updateBookingAttendance(int bookingId, AttendanceStatus status);

    // --- Admin: staff & schedule workflow ---
    std::vector<Staff> getStaffByGym(int gymId) const;
    std::string addScheduleComment(int trainingId, int staffId, const std::string& comment);
    std::vector<ScheduleComment> getScheduleComments(int trainingId) const;
    std::string sendScheduleForConfirmation(int gymId);
    std::string confirmScheduleSlot(int trainingId, int staffId, bool confirmed,
                                    const std::string& comment);
    std::vector<ScheduleConfirmation> getScheduleConfirmations(int gymId) const;

    // --- Notifications & automation ---
    std::vector<Notification> getAllNotifications() const;
    std::string checkLowEnrollmentAlerts();
    std::string sendTrainerReminders();
    std::string sendTrainingReminder(int userId, int bookingId);
    std::string notifyFreeSpot(int trainingId);
    std::string broadcastPromotion(const std::string& message);

    // --- Statistics ---
    PaymentStats getPaymentStats() const;
    std::string getMembershipUsageReport(int clientId) const;

    // --- AI assistant ---
    std::string processAIQuery(int userId, const std::string& query);

private:
    std::vector<User> users_;
    std::vector<Gym> gyms_;
    std::vector<Training> trainings_;
    std::vector<Booking> bookings_;
    std::vector<Membership> memberships_;
    std::vector<Staff> staff_;
    std::vector<Notification> notifications_;
    std::vector<ScheduleComment> scheduleComments_;
    std::vector<ScheduleConfirmation> scheduleConfirmations_;
    std::vector<ClubSettings> clubSettings_;
    std::vector<FaqEntry> faqEntries_;
    std::vector<SupportTicket> supportTickets_;
    std::vector<Review> reviews_;
    std::vector<TrainerProfile> trainerProfiles_;
    std::vector<UserPreferences> userPreferences_;

    int nextUserId_ = 1;
    int nextReviewId_ = 1;
    int nextBookingId_ = 1;
    int nextSupportTicketId_ = 1;
    int nextMembershipId_ = 1;
    int nextNotificationId_ = 1;
    int nextCommentId_ = 1;
    int nextTrainingId_ = 10;

    void seedDemoData();
    std::string currentTimestamp() const;
    bool hasActiveBooking(int userId, int trainingId) const;
    bool isBookingOpen(const Training& training) const;
    std::optional<ClubSettings> getClubSettings(int gymId) const;
    void sendNotification(const std::string& recipientEmail, NotificationType type,
                          const std::string& message);
    bool shouldNotifyUser(int userId, NotificationType type) const;
    UserPreferences& ensureUserPreferences(int userId);
    void applyMembershipOnBook(int userId);
    void applyMembershipOnCancel(const Booking& booking);
    OperationResult internalBook(int userId, int trainingId, PaymentMethod method, bool byAdmin);
    std::string internalCancel(int bookingId, int requesterUserId, bool byAdmin);
    std::string internalReschedule(int bookingId, int newTrainingId,
                                   int requesterUserId, bool byAdmin);
    Training* findTraining(int trainingId);
    Booking* findBooking(int bookingId);
    User* findUser(int userId);
};
