#include "MeetingParticipantsCtrlEventListener.h"
#include <iostream>

using namespace std;

MeetingParticipantsCtrlEventListener::MeetingParticipantsCtrlEventListener(void(*onIsHost)(), void(*onIsCoHost)())
{
	onIsHost_ = onIsHost;
	onIsCoHost_ = onIsCoHost;
	initialRolesSet_ = false;
	originalHostId_ = 0;
	originalClientId_ = 0;
}

/// \brief Callback event of notification of users who are in the meeting.
	/// \param lstUserID List of the user ID. 
	/// \param strUserList List of user in json format. This function is currently invalid, hereby only for reservations.
void MeetingParticipantsCtrlEventListener::onUserJoin(IList<unsigned int>* lstUserID, const zchar_t* strUserList)
{
	if (lstUserID == NULL) return;

	for (int i = 0; i < lstUserID->GetCount(); i++) {
		unsigned int userId = lstUserID->GetItem(i);
		
		// Get the meeting service interface
		IMeetingService* meetingService = nullptr;
		ZOOM_SDK_NAMESPACE::SDKError err = ZOOM_SDK_NAMESPACE::CreateMeetingService(&meetingService);
		if (err != SDKERR_SUCCESS || meetingService == NULL) continue;

		// Get the participants controller
		IMeetingParticipantsController* participantsCtrl = meetingService->GetMeetingParticipantsController();
		if (participantsCtrl == NULL) continue;

		// Get user information
		IUserInfo* userInfo = participantsCtrl->GetUserByUserID(userId);
		if (userInfo == NULL) continue;

		// Store participant info
		participants[userId] = userInfo->IsHost();

		// Get and print user name
		const zchar_t* userName = userInfo->GetUserName();
		
		std::cout << "User joined:" << std::endl
				  << "  ID: " << userId << std::endl
				  << "  Name: " << (userName ? userName : "Unknown") << std::endl
				  << "  Role: " << (userInfo->IsHost() ? "Host" : "Client") << std::endl
				  << "----------------------------------------" << std::endl;
	}
}

/// \brief Callback event of notification of user who leaves the meeting.
/// \param lstUserID List of the user ID who leaves the meeting.
/// \param strUserList List of the user in json format. This function is currently invalid, hereby only for reservations.
void MeetingParticipantsCtrlEventListener::onUserLeft(IList<unsigned int>* lstUserID, const zchar_t* strUserList)
{
	if (lstUserID == NULL) return;

	for (int i = 0; i < lstUserID->GetCount(); i++) {
		unsigned int userId = lstUserID->GetItem(i);
		
		// Get user info before removing from map
		IMeetingService* meetingService = nullptr;
		ZOOM_SDK_NAMESPACE::SDKError err = ZOOM_SDK_NAMESPACE::CreateMeetingService(&meetingService);
		if (err == SDKERR_SUCCESS && meetingService) {
			IMeetingParticipantsController* participantsCtrl = meetingService->GetMeetingParticipantsController();
			if (participantsCtrl) {
				IUserInfo* userInfo = participantsCtrl->GetUserByUserID(userId);
				if (userInfo) {
					const zchar_t* userName = userInfo->GetUserName();
					std::cout << "User left:" << std::endl
							 << "  ID: " << userId << std::endl
							 << "  Name: " << (userName ? userName : "Unknown") << std::endl
							 << "----------------------------------------" << std::endl;
				}
			}
		}
		
		participants.erase(userId);
	}
}

/// \brief Callback event of notification of the new host. 
/// \param userId Specify the ID of the new host. 
void MeetingParticipantsCtrlEventListener::onHostChangeNotification(unsigned int userId)
{
	// We don't update the participants map anymore since we're using original roles
	std::cout << "Host role changed to user ID: " << userId 
			  << " (Original Host ID: " << originalHostId_ << ")" << std::endl;
	if (onIsHost_) onIsHost_();
}

/// \brief Callback event of changing the state of the hand.
/// \param bLow TRUE indicates to put down the hand, FALSE indicates to raise the hand. 
/// \param userid Specify the user ID whose status changes.
void MeetingParticipantsCtrlEventListener::onLowOrRaiseHandStatusChanged(bool bLow, unsigned int userid) {}

/// \brief Callback event of changing the screen name. 
/// \param userId list Specify the users ID whose status changes.
void MeetingParticipantsCtrlEventListener::onUserNamesChanged(IList<unsigned int>* lstUserID) {}

/// \brief Callback event of changing the co-host.
/// \param userId Specify the user ID whose status changes. 
/// \param isCoHost TRUE indicates that the specified user is co-host.
void MeetingParticipantsCtrlEventListener::onCoHostChangeNotification(unsigned int userId, bool isCoHost) {
	if (onIsCoHost_)onIsCoHost_();
}
/// \brief Callback event of invalid host key.
void MeetingParticipantsCtrlEventListener::onInvalidReclaimHostkey() {}

/// \brief Callback event of the host calls the lower all hands interface, the host/cohost/panelist will receive this callback.
void MeetingParticipantsCtrlEventListener::onAllHandsLowered() {}

/// \brief Callback event that the status of local recording changes.
/// \param userId Specify the user ID whose status changes. 
/// \param status Value of recording status. For more details, see \link RecordingStatus \endlink enum.
void MeetingParticipantsCtrlEventListener::onLocalRecordingStatusChanged(unsigned int user_id, RecordingStatus status) {}

/// \brief Callback event that lets participants rename themself.
/// \param bAllow True allow. If false, participants may not rename themselves.
void MeetingParticipantsCtrlEventListener::onAllowParticipantsRenameNotification(bool bAllow) {}

/// \brief Callback event that lets participants unmute themself.
/// \param bAllow True allow. If false, participants may not rename themselves.
void MeetingParticipantsCtrlEventListener::onAllowParticipantsUnmuteSelfNotification(bool bAllow) {}

/// \brief Callback event that lets participants start a video.
/// \param bAllow True allow. If false, disallow.
void MeetingParticipantsCtrlEventListener::onAllowParticipantsStartVideoNotification(bool bAllow) {}

/// \brief Callback event that lets participants share a new whiteboard.
/// \param bAllow True allow. If false, participants may not share new whiteboard.
void MeetingParticipantsCtrlEventListener::onAllowParticipantsShareWhiteBoardNotification(bool bAllow) {}


/// \brief Callback event that the request local recording privilege changes.
/// \param status Value of request local recording privilege status. For more details, see \link LocalRecordingRequestPrivilegeStatus \endlink enum.
void MeetingParticipantsCtrlEventListener::onRequestLocalRecordingPrivilegeChanged(LocalRecordingRequestPrivilegeStatus status) {}

void MeetingParticipantsCtrlEventListener::onAllowParticipantsRequestCloudRecording(bool bAllow) {}

/// \brief Callback event that the user avatar path is updated in the meeting.
/// \param userID Specify the user ID whose avatar updated. 
void MeetingParticipantsCtrlEventListener::onInMeetingUserAvatarPathUpdated(unsigned int userID) {}

void MeetingParticipantsCtrlEventListener::onParticipantProfilePictureStatusChange(bool bHidden) {}

void MeetingParticipantsCtrlEventListener::onFocusModeStateChanged(bool bEnabled)
{
}

void MeetingParticipantsCtrlEventListener::onFocusModeShareTypeChanged(FocusModeShareType type)
{
}

void MeetingParticipantsCtrlEventListener::scanExistingParticipants() 
{
	// Get the meeting service interface
	IMeetingService* meetingService = nullptr;
	ZOOM_SDK_NAMESPACE::SDKError err = ZOOM_SDK_NAMESPACE::CreateMeetingService(&meetingService);
	if (err != SDKERR_SUCCESS || meetingService == NULL) return;

	// Get the participants controller
	IMeetingParticipantsController* participantsCtrl = meetingService->GetMeetingParticipantsController();
	if (participantsCtrl == NULL) return;

	// Get the list of all participants
	IList<unsigned int>* participantsList = participantsCtrl->GetParticipantsList();
	if (participantsList == NULL) return;

	std::cout << "\n=== Current Meeting Participants (excluding bot) ===\n" << std::endl;

	int actualParticipantCount = 0;
	
	// Only set the original roles if not already set
	if (!initialRolesSet_) {
		// First find the host
		for (int i = 0; i < participantsList->GetCount(); i++) {
			unsigned int userId = participantsList->GetItem(i);
			IUserInfo* userInfo = participantsCtrl->GetUserByUserID(userId);
			
			if (userInfo && !userInfo->IsMySelf() && userInfo->IsHost()) {
				originalHostId_ = userId;
				break;  // Found the host, exit loop
			}
		}

		// Then find the client (first non-host, non-bot participant)
		for (int i = 0; i < participantsList->GetCount(); i++) {
			unsigned int userId = participantsList->GetItem(i);
			IUserInfo* userInfo = participantsCtrl->GetUserByUserID(userId);
			
			if (userInfo && !userInfo->IsMySelf() && !userInfo->IsHost()) {
				originalClientId_ = userId;
				break;  // Found the client, exit loop
			}
		}

		initialRolesSet_ = true;
		std::cout << "Original roles stored - Host ID: " << originalHostId_ 
				  << ", Client ID: " << originalClientId_ << std::endl;
	}

	// Display current participants
	for (int i = 0; i < participantsList->GetCount(); i++) {
		unsigned int userId = participantsList->GetItem(i);
		IUserInfo* userInfo = participantsCtrl->GetUserByUserID(userId);
		
		if (userInfo && !userInfo->IsMySelf()) {
			// Store participant info using original roles
			participants[userId] = (userId == originalHostId_);

			// Get and print user info
			const zchar_t* userName = userInfo->GetUserName();
			
			actualParticipantCount++;
			std::cout << "Participant " << actualParticipantCount << ":" << std::endl
					  << "  ID: " << userId << std::endl
					  << "  Name: " << (userName ? userName : "Unknown") << std::endl
					  << "  Original Role: " << (userId == originalHostId_ ? "Host" : "Client") << std::endl
					  << "  Current Role: " << (userInfo->IsHost() ? "Host" : "Client") << std::endl
					  << "----------------------------------------" << std::endl;
		}
	}

	if (actualParticipantCount == 0) {
		std::cout << "No other participants found in the meeting." << std::endl;
	}
}

