#include "meeting_service_interface.h"
#include "zoom_sdk.h"
#include "MeetingParticipantsCtrlEventListener.h"
#include <functional>

USING_ZOOM_SDK_NAMESPACE

class MeetingServiceEventListener : public ZOOM_SDK_NAMESPACE::IMeetingServiceEvent
{
	 void (*onMeetingEnds_)();
	 void (*onMeetingStarts_)();
	 std::function<void()> onInMeeting_;
	 MeetingParticipantsCtrlEventListener* participantsListener_;
public:
	MeetingServiceEventListener(void (*onMeetingStarts)(), 
							  void (*onMeetingEnds)(), 
							  std::function<void()> onInMeeting,
							  MeetingParticipantsCtrlEventListener* participantsListener);

	/// \brief Meeting status changed callback.
	/// \param status The value of meeting. For more details, see \link MeetingStatus \endlink.
	/// \param iResult Detailed reasons for special meeting status.
	///If the status is MEETING_STATUS_FAILED, the value of iResult is one of those listed in MeetingFailCode enum. 
	///If the status is MEETING_STATUS_ENDED, the value of iResult is one of those listed in MeetingEndReason.
	virtual void onMeetingStatusChanged(MeetingStatus status, int iResult = 0);

	/// \brief Meeting statistics warning notification callback.
	/// \param type The warning type of the meeting statistics. For more details, see \link StatisticsWarningType \endlink.
	virtual void onMeetingStatisticsWarningNotification(StatisticsWarningType type);

	/// \brief Meeting parameter notification callback.
	/// \param meeting_param Meeting parameter. For more details, see \link MeetingParameter \endlink.
	/// \remarks The callback will be triggered right before the meeting starts. The meeting_param will be destroyed once the function calls end.
	virtual void onMeetingParameterNotification(const MeetingParameter* meeting_param);

	/// \brief Callback event when a meeting is suspended.
	virtual void onSuspendParticipantsActivities();

	/// \brief Callback event for the AI Companion active status changed. 
	/// \param active Specify whether the AI Companion active or not.
	virtual void onAICompanionActiveChangeNotice(bool bActive);

	/// \brief Callback event for the meeting topic changed. 
   /// \param sTopic The new meeting topic.
	virtual void onMeetingTopicChanged(const zchar_t* sTopic);
};

