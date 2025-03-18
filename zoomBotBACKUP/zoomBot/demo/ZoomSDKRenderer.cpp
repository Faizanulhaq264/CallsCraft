//GetVideoRawData

#include "rawdata/rawdata_video_source_helper_interface.h"
#include "ZoomSDKRenderer.h"
#include "zoom_sdk_def.h" 
#include <iostream>


#include <fstream>
#include <cstring>
#include <string>
#include <cstdlib>
#include <cstdint>
#include <cstdio>
#include <chrono>
#include <thread>

const int ZoomSDKRenderer::FRAME_INTERVAL;      // Definition of static constant

void ZoomSDKRenderer::onRawDataFrameReceived(YUVRawDataI420* data)
{
	std::cout << "The source id of this stream is: " << data->GetSourceID() << std::endl; 
	if (!data) {
		return;
	}

	auto current_time = std::chrono::steady_clock::now();
	auto elapsed = std::chrono::duration_cast<std::chrono::seconds>(current_time - last_frame_time).count();
	
	if (elapsed >= FRAME_INTERVAL) {
		send_frame(data);
		last_frame_time = current_time;
	}
}

void ZoomSDKRenderer::onRawDataStatusChanged(RawDataStatus status)
{
	std::cout << "Raw data status changed: " << status << std::endl;
}

void ZoomSDKRenderer::onRendererBeDestroyed()
{
	std::cout << "Renderer being destroyed" << std::endl;
	if (isServerRunning_) {
		wsServer_.stop();
		if (wsThread_.joinable()) {
			wsThread_.join();
		}
		isServerRunning_ = false;
	}
}

void ZoomSDKRenderer::SaveToRawYUVFile(YUVRawDataI420* data) {
	// Method implementation if needed
}

ZoomSDKRenderer::ZoomSDKRenderer() : isServerRunning_(false) {
	// Initialize WebSocket
	init_websocket();
	last_frame_time = std::chrono::steady_clock::now();
}

ZoomSDKRenderer::~ZoomSDKRenderer() {
	if (isServerRunning_) {
		wsServer_.stop();
		if (wsThread_.joinable()) {
			wsThread_.join();
		}
	}
}

void ZoomSDKRenderer::init_websocket() {
	try {
		// Reset the server if it was previously running
		if (isServerRunning_) {
			wsServer_.stop();
			if (wsThread_.joinable()) {
				wsThread_.join();
			}
			wsServer_.reset();  // Add this line to reset the server state
		}

		// Configure WebSocket server
		wsServer_.clear_access_channels(websocketpp::log::alevel::all);
		wsServer_.init_asio();
		wsServer_.set_reuse_addr(true);

		// Set up callbacks
		wsServer_.set_open_handler([this](ConnectionHdl hdl) {
			std::lock_guard<std::mutex> lock(connectionsMutex_);
			connections_.insert(hdl);
			std::cout << "New WebSocket connection established for video. Total connections: " 
					  << connections_.size() << std::endl;
		});

		wsServer_.set_close_handler([this](ConnectionHdl hdl) {
			std::lock_guard<std::mutex> lock(connectionsMutex_);
			connections_.erase(hdl);
			std::cout << "WebSocket video connection closed. Remaining connections: " 
					  << connections_.size() << std::endl;
		});

		wsServer_.set_fail_handler([this](ConnectionHdl hdl) {
			std::cout << "WebSocket video connection failed" << std::endl;
			std::lock_guard<std::mutex> lock(connectionsMutex_);
			connections_.erase(hdl);
		});

		// Start WebSocket server
		wsServer_.listen(8080);
		wsServer_.start_accept();

		// Run the WebSocket server in a separate thread
		if (wsThread_.joinable()) {
			wsThread_.join();
		}
		
		wsThread_ = std::thread([this]() {
			try {
				isServerRunning_ = true;
				wsServer_.run();
			} catch (const std::exception& e) {
				std::cerr << "WebSocket video server error: " << e.what() << std::endl;
				isServerRunning_ = false;
			}
		});

		std::cout << "WebSocket video server started on port 8080" << std::endl;

	} catch (const std::exception& e) {
		std::cerr << "Failed to initialize WebSocket server: " << e.what() << std::endl;
		isServerRunning_ = false;
	}
}

void ZoomSDKRenderer::send_frame(YUVRawDataI420* data) {
	if (!isServerRunning_ || !data) return;

	try {
		uint32_t width = data->GetStreamWidth();
		uint32_t height = data->GetStreamHeight();
		
		std::lock_guard<std::mutex> lock(connectionsMutex_);
		for (auto& connection : connections_) {
			try {
				// Send frame dimensions
				wsServer_.send(connection, &width, sizeof(width), websocketpp::frame::opcode::binary);
				wsServer_.send(connection, &height, sizeof(height), websocketpp::frame::opcode::binary);
				
				// Send Y plane
				wsServer_.send(connection, data->GetYBuffer(), 
							 data->GetStreamWidth() * data->GetStreamHeight(), 
							 websocketpp::frame::opcode::binary);
				
				// Send U plane
				wsServer_.send(connection, data->GetUBuffer(), 
							 (data->GetStreamWidth() * data->GetStreamHeight()) / 4, 
							 websocketpp::frame::opcode::binary);
				
				// Send V plane
				wsServer_.send(connection, data->GetVBuffer(), 
							 (data->GetStreamWidth() * data->GetStreamHeight()) / 4, 
							 websocketpp::frame::opcode::binary);
			} catch (const std::exception& e) {
				std::cerr << "Error sending frame to client: " << e.what() << std::endl;
			}
		}
	} catch (const std::exception& e) {
		std::cerr << "Error in send_frame: " << e.what() << std::endl;
	}
}

