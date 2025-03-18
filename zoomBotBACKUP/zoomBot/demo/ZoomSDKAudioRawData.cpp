//GetAudioRawData
#include "rawdata/rawdata_audio_helper_interface.h"
#include "ZoomSDKAudioRawData.h"
#include "zoom_sdk_def.h" 
#include <iostream>
#include <fstream>
#include <chrono>
#include <sstream>
#include <filesystem>
#include <websocketpp/config/asio_no_tls.hpp>
#include <websocketpp/server.hpp>
#include <thread>
#include <mutex>

using WebSocketServer = websocketpp::server<websocketpp::config::asio>;
using ConnectionHdl = websocketpp::connection_hdl;

void ZoomSDKAudioRawData::stopWebSocketServer() {
	try {
		wsServer_.stop();
		if (wsThread_.joinable()) {
			wsThread_.join();
		}
		isServerRunning_ = false;
	} catch (const std::exception& e) {
		std::cerr << "Error stopping WebSocket server: " << e.what() << std::endl;
	}
}

void ZoomSDKAudioRawData::restartWebSocketServer() {
	std::cout << "Attempting to restart WebSocket server..." << std::endl;
	
	// Stop the existing server
	stopWebSocketServer();
	
	// Clear existing connections
	{
		std::lock_guard<std::mutex> lock(connectionsMutex_);
		connections_.clear();
	}
	
	// Reinitialize the server
	initializeWebSocket();
}

void ZoomSDKAudioRawData::monitorConnections() {
	while (shouldMonitorConnections_) {
		try {
			if (!isServerRunning_) {
				std::cout << "WebSocket server is down, attempting to restart..." << std::endl;
				restartWebSocketServer();
			}
			
			// Check if the server is responsive
			bool serverResponsive = false;
			{
				std::lock_guard<std::mutex> lock(connectionsMutex_);
				serverResponsive = wsServer_.is_listening();
			}
			
			if (!serverResponsive && isServerRunning_) {
				std::cout << "WebSocket server became unresponsive" << std::endl;
				restartWebSocketServer();
			}

		} catch (const std::exception& e) {
			std::cerr << "Error in connection monitoring: " << e.what() << std::endl;
		}

		// Check every 5 seconds
		std::this_thread::sleep_for(std::chrono::seconds(5));
	}
}

void ZoomSDKAudioRawData::initializeWebSocket() {
	try {
		// Configure WebSocket server
		wsServer_.clear_access_channels(websocketpp::log::alevel::all);
		wsServer_.init_asio();
		wsServer_.set_reuse_addr(true);

		// Set up callbacks
		wsServer_.set_open_handler([this](ConnectionHdl hdl) {
			std::lock_guard<std::mutex> lock(connectionsMutex_);
			connections_.insert(hdl);
			std::cout << "New WebSocket connection established. Total connections: " 
					  << connections_.size() << std::endl;
		});

		wsServer_.set_close_handler([this](ConnectionHdl hdl) {
			std::lock_guard<std::mutex> lock(connectionsMutex_);
			connections_.erase(hdl);
			std::cout << "WebSocket connection closed. Remaining connections: " 
					  << connections_.size() << std::endl;
		});

		wsServer_.set_fail_handler([this](ConnectionHdl hdl) {
			std::cout << "WebSocket connection failed" << std::endl;
			std::lock_guard<std::mutex> lock(connectionsMutex_);
			connections_.erase(hdl);
		});

		// Start WebSocket server
		wsServer_.listen(8180);
		wsServer_.start_accept();

		// Run the WebSocket server in a separate thread
		wsThread_ = std::thread([this]() {
			try {
				isServerRunning_ = true;
				wsServer_.run();
			} catch (const std::exception& e) {
				std::cerr << "WebSocket server error: " << e.what() << std::endl;
				isServerRunning_ = false;
			}
		});
		wsThread_.detach();

		std::cout << "WebSocket server started on port 8180" << std::endl;
	} catch (const std::exception& e) {
		std::cerr << "Failed to initialize WebSocket server: " << e.what() << std::endl;
		isServerRunning_ = false;
	}
}

void ZoomSDKAudioRawData::broadcastAudioData(const std::vector<uint8_t>& buffer, bool isHost) {
	if (!isServerRunning_) {
		std::cout << "Server is not running, attempting to restart..." << std::endl;
		restartWebSocketServer();
		return;
	}

	if (connections_.empty()) return;

	std::string base64Data = websocketpp::base64_encode(buffer.data(), buffer.size());
	std::string message = "{\"source\":\"" + std::string(isHost ? "host" : "client") + 
						 "\",\"data\":\"" + base64Data + "\"}";

	std::lock_guard<std::mutex> lock(connectionsMutex_);
	std::vector<ConnectionHdl> failedConnections;

	for (auto& connection : connections_) {
		try {
			wsServer_.send(connection, message, websocketpp::frame::opcode::text);
		} catch (const std::exception& e) {
			std::cerr << "Error sending WebSocket message: " << e.what() << std::endl;
			failedConnections.push_back(connection);
		}
	}

	// Remove failed connections
	for (const auto& failed : failedConnections) {
		connections_.erase(failed);
	}
}

void ZoomSDKAudioRawData::processBuffer(std::vector<uint8_t>& buffer, const AudioRawData* data, bool isHost)
{
	// Add new data to buffer
	char* rawBuffer = const_cast<AudioRawData*>(data)->GetBuffer();
	unsigned int bufferLen = const_cast<AudioRawData*>(data)->GetBufferLen();
	
	buffer.insert(buffer.end(), 
				 reinterpret_cast<uint8_t*>(rawBuffer), 
				 reinterpret_cast<uint8_t*>(rawBuffer) + bufferLen);

	// Stream the raw audio data immediately via WebSocket
	broadcastAudioData(std::vector<uint8_t>(rawBuffer, rawBuffer + bufferLen), isHost);

	// // If we have 3 seconds worth of audio
	// if (buffer.size() >= BUFFER_SIZE_3_SEC)
	// {
	// 	// Send for processing
	// 	sendBufferForProcessing(buffer, isHost);
	// 	// Clear buffer
	// 	buffer.clear();
	// }
}

void ZoomSDKAudioRawData::sendBufferForProcessing(const std::vector<uint8_t>& buffer, bool isHost)
{
	// Generate timestamp for filename
	auto now = std::chrono::system_clock::now();
	auto timestamp = std::chrono::duration_cast<std::chrono::milliseconds>(
		now.time_since_epoch()
	).count();

	// Create filename with timestamp and path
	std::stringstream filepath;
	filepath << outputPath << "/" << (isHost ? "host_" : "client_") << timestamp << ".raw";

	// Create directory if it doesn't exist
	system(("mkdir -p " + outputPath).c_str());

	// Save buffer to file
	std::ofstream file(filepath.str(), std::ios::binary);
	if (file.is_open())
	{
		file.write(reinterpret_cast<const char*>(buffer.data()), buffer.size());
		file.close();
		std::cout << "Saved " << (isHost ? "host" : "client") 
				  << " audio segment: " << filepath.str() << std::endl;
	}
	else
	{
		std::cerr << "Failed to save audio segment: " << filepath.str() << std::endl;
	}
}

void ZoomSDKAudioRawData::onOneWayAudioRawDataReceived(AudioRawData* audioRawData, uint32_t node_id)
{
	if (node_id == hostId_)
	{
		processBuffer(hostBuffer, audioRawData, true);
	}
	else if (node_id == clientId_)
	{
		processBuffer(clientBuffer, audioRawData, false);
	}
}

void ZoomSDKAudioRawData::onMixedAudioRawDataReceived(AudioRawData* audioRawData)
{
	// We'll ignore mixed audio as we want separate streams
}

void ZoomSDKAudioRawData::onShareAudioRawDataReceived(AudioRawData* data_)
{
	// Ignore shared audio
}

void ZoomSDKAudioRawData::onOneWayInterpreterAudioRawDataReceived(AudioRawData* data_, const zchar_t* pLanguageName)
{
	// Ignore interpreter audio
}

ZoomSDKAudioRawData::ZoomSDKAudioRawData() 
	: hostId_(0)
	, clientId_(0)
	, isServerRunning_(false)
	, shouldMonitorConnections_(true) 
{
	initializeWebSocket();
	
	// Start the connection monitoring thread
	connectionMonitorThread_ = std::thread([this]() {
		monitorConnections();
	});
}
