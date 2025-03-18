#ifndef ZOOM_SDK_AUDIO_RAW_DATA_H
#define ZOOM_SDK_AUDIO_RAW_DATA_H

//GetAudioRawData
#include "rawdata/rawdata_audio_helper_interface.h"
#include "zoom_sdk.h"
#include "zoom_sdk_raw_data_def.h"
#include <vector>
#include <string>
#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>
#include <set>
#include <mutex>
#include <thread>
#include <atomic>

USING_ZOOM_SDK_NAMESPACE

class ZoomSDKAudioRawData :
	public IZoomSDKAudioRawDataDelegate
{
private:
	static const int SAMPLE_RATE = 32000;  // Zoom uses 32kHz
	static const int BYTES_PER_SAMPLE = 2;  // 16-bit audio
	static const int CHANNELS = 1;  // Mono audio
	static const int BUFFER_SIZE_3_SEC = SAMPLE_RATE * BYTES_PER_SAMPLE * CHANNELS * 3;  // 3 seconds of audio
	
	std::vector<uint8_t> hostBuffer;
	std::vector<uint8_t> clientBuffer;
	unsigned int hostId_;
	unsigned int clientId_;

	// Update the path where raw files are saved
	std::string outputPath = "call_recordings";

	// Add WebSocket related members
	using WebSocketServer = websocketpp::server<websocketpp::config::asio>;
	using ConnectionHdl = websocketpp::connection_hdl;
	
	WebSocketServer wsServer_;
	std::set<ConnectionHdl, std::owner_less<ConnectionHdl>> connections_;
	std::mutex connectionsMutex_;
	std::thread wsThread_;

	// Add connection monitoring members
	bool isServerRunning_;
	std::thread connectionMonitorThread_;
	void monitorConnections();
	void restartWebSocketServer();
	std::atomic<bool> shouldMonitorConnections_;

	// Add helper method for safe server shutdown
	void stopWebSocketServer();

	void processBuffer(std::vector<uint8_t>& buffer, const AudioRawData* data, bool isHost);
	void sendBufferForProcessing(const std::vector<uint8_t>& buffer, bool isHost);
	void initializeWebSocket();
	void broadcastAudioData(const std::vector<uint8_t>& buffer, bool isHost);

public:
	// Only declare the constructor, don't define it here
	ZoomSDKAudioRawData();
	
	void setParticipantIds(unsigned int hostId, unsigned int clientId) {
		hostId_ = hostId;
		clientId_ = clientId;
	}
	
	virtual void onMixedAudioRawDataReceived(AudioRawData* data_);
	virtual void onOneWayAudioRawDataReceived(AudioRawData* data_, uint32_t node_id);
	virtual void onShareAudioRawDataReceived(AudioRawData* data_);
	virtual void onOneWayInterpreterAudioRawDataReceived(AudioRawData* data_, const zchar_t* pLanguageName);

	~ZoomSDKAudioRawData() {
		shouldMonitorConnections_ = false;
		stopWebSocketServer();
		if (connectionMonitorThread_.joinable()) {
			connectionMonitorThread_.join();
		}
	}
};

#endif // ZOOM_SDK_AUDIO_RAW_DATA_H