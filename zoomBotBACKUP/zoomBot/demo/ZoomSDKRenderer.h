//GetVideoRawData

#include "rawdata/rawdata_video_source_helper_interface.h"
#include "rawdata/rawdata_renderer_interface.h"
#include "zoom_sdk.h"
#include "zoom_sdk_raw_data_def.h"
#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>
#include <set>
#include <mutex>
#include <chrono>
#include <thread>

USING_ZOOM_SDK_NAMESPACE

class ZoomSDKRenderer :
	public IZoomSDKRendererDelegate
{
private:
	using WebSocketServer = websocketpp::server<websocketpp::config::asio>;
	using ConnectionHdl = websocketpp::connection_hdl;
	
	// Add custom comparison for weak_ptr connections
	struct connection_compare {
		bool operator()(const ConnectionHdl& a, const ConnectionHdl& b) const {
			return a.owner_before(b);
		}
	};
	
	WebSocketServer wsServer_;
	std::thread wsThread_;
	std::set<ConnectionHdl, connection_compare> connections_;  // Updated set definition
	std::mutex connectionsMutex_;
	bool isServerRunning_;
	std::chrono::steady_clock::time_point last_frame_time;
	static const int FRAME_INTERVAL = 3; // seconds between frames

	void init_websocket();
	void send_frame(YUVRawDataI420* data);

public:
	ZoomSDKRenderer();  // Declaration only
	virtual ~ZoomSDKRenderer();  // Declaration only

	virtual void onRawDataFrameReceived(YUVRawDataI420* data);
	virtual void onRawDataStatusChanged(RawDataStatus	status);

	virtual void onRendererBeDestroyed();

	virtual void SaveToRawYUVFile(YUVRawDataI420* data);
};