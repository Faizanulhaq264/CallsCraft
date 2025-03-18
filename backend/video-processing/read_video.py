import socket
import numpy as np
import cv2
import struct
import os
import math
import json
from deepface import DeepFace
import mediapipe as mp
from absl import logging
logging.set_verbosity(logging.ERROR)
from mediapipe_utilities import read_yaml
from mediapipe_processing import mesh_points, detect_facial_landmarks, get_iris_center, compute_iris_position_ratio, compute_iris_position_ratio_vertical
import asyncio
import websockets
import time
import mysql.connector
from mysql.connector import Error
from datetime import datetime
import subprocess

# Database connection configuration
def get_db_config():
    """
    Extract database configuration from the .env file in the backend directory
    """
    try:
        # Get the path to the backend directory (parent of video-processing)
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # Path to the .env file
        env_file = os.path.join(backend_dir, ".env")
        # print("Reading database configuration from:", env_file)
        # Parse the .env file
        env_vars = {}
        if os.path.exists(env_file):
            with open(env_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('//') and not line.startswith('#'):
                        if '=' in line:
                            key, value = line.split('=', 1)
                            env_vars[key] = value.strip('"\'')
        
        # Extract database configuration
        return {
            'host': env_vars.get('DB_HOST', 'localhost'),
            'port': int(env_vars.get('DB_PORT', 3306)),
            'user': env_vars.get('DB_USER', 'root'),
            'password': env_vars.get('DB_PASSWORD', ''),
            'database': env_vars.get('DB_NAME', 'callsCraft')
        }
    except Exception as e:
        print(f"Error reading database config from .env: {e}")
        # Return default values if failed to read config
        return {
            'host': 'localhost',
            'port': 3306,
            'user': 'root',
            'password': '',
            'database': 'callsCraft'
        }

# Global database connection
db_conn = None
call_id = None  # Will store the current call ID

def connect_to_db():
    """
    Establish a connection to the MySQL database
    """
    global db_conn
    try:
        config = get_db_config()
        db_conn = mysql.connector.connect(**config)
        print("Connected to MySQL database!")
        return True
    except Error as e:
        print(f"Error connecting to MySQL database: {e}")
        return False

def get_active_call_id():
    """
    Get the most recent active call ID from the database
    """
    global db_conn, call_id
    
    if not db_conn or not db_conn.is_connected():
        if not connect_to_db():
            return None
    
    try:
        cursor = db_conn.cursor()
        # Get the most recent active call
        query = """
        SELECT CallID FROM meetingCall 
        WHERE EndTime IS NULL
        ORDER BY StartTime DESC LIMIT 1
        """
        cursor.execute(query)
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            call_id = result[0]
            print(f"Processing frames for active call ID: {call_id}")
            return call_id
        else:
            print("No active calls found in database")
            return None
    except Error as e:
        print(f"Database error retrieving active call: {e}")
        return None

def store_video_results(body_alignment, gaze_h, gaze_v, emotion):
    """
    Store video analysis results in the database
    """
    global db_conn, call_id
    
    # Format gaze direction as a combined string
    if gaze_h and gaze_v:
        gaze_direction = f"{gaze_h}-{gaze_v}"
    else:
        gaze_direction = "Not detected"
    
    # If we don't have an active call ID, try to get one
    if call_id is None:
        call_id = get_active_call_id()
        if call_id is None:
            print("Cannot store results: No active call ID")
            return False
    
    # Ensure database connection is active
    if not db_conn or not db_conn.is_connected():
        if not connect_to_db():
            return False
    
    try:
        cursor = db_conn.cursor()
        
        # Insert video analysis results
        query = """
        INSERT INTO VideoResults 
        (CallID, BodyAlignment, GazeDirection, Emotion, Timestamp) 
        VALUES (%s, %s, %s, %s, %s)
        """
        current_time = datetime.now()
        cursor.execute(query, (call_id, body_alignment, gaze_direction, emotion, current_time))
        
        db_conn.commit()
        cursor.close()
        return True
    except Error as e:
        print(f"Database error storing video results: {e}")
        return False

# Original utility functions
def minimal_angle_difference(angle1, angle2):
    diff = angle2 - angle1
    diff = (diff + 180) % 360 - 180
    return abs(diff)

# Main processing functions remain unchanged
def media_pipe_body_posture(img_frame)->tuple:
    # ... existing implementation ...
    try:
        # Initialize MediaPipe Pose
        mp_pose = mp.solutions.pose
        pose = mp_pose.Pose(
            static_image_mode=True,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5)    
        
        ANGLE_THRESHOLD = 5 
        
        results = pose.process(img_frame)
        
        if results.pose_landmarks:
            landmarks = results.pose_landmarks.landmark

            #LOGIC FOR DETERMINING POSTURE
            image_height, image_width, _ = img_frame.shape

            # Left and right shoulder landmarks
            left_shoulder = landmarks[11]
            right_shoulder = landmarks[12]

            # Convert normalized coordinates to pixel coordinates
            left_shoulder_coords = (int(left_shoulder.x * image_width), int(left_shoulder.y * image_height))
            right_shoulder_coords = (int(right_shoulder.x * image_width), int(right_shoulder.y * image_height))

            # Calculate the angle between shoulders
            delta_x = right_shoulder_coords[0] - left_shoulder_coords[0]
            delta_y = right_shoulder_coords[1] - left_shoulder_coords[1]

            angle_rad = math.atan2(delta_y, delta_x)
            angle_deg = math.degrees(angle_rad)

            # Normalize angle to range [-180, 180)
            angle_deg = (angle_deg + 180) % 360 - 180

            # Calculate minimal angle difference from -180 degrees
            angle_difference = minimal_angle_difference(angle_deg, -180.0)

            # Classify posture
            posture = "Aligned" if angle_difference < ANGLE_THRESHOLD else "Misaligned"
            return (posture, angle_difference)
        else:
            print("No pose detected")
            return ("No pose detected", 0.0)
            
    except Exception as e:
        print(f"Error in pose detection: {str(e)}")
        return ("Error in pose detection", 0.0)

def media_pipe_gaze_estimation(img_frame, orig_frame):
    # ... existing implementation ...
    # VARIABLES
    GAZE_RATIO_THRESHOLD = (0.40, 0.60)  # Horizontal gaze thresholds
    VERTICAL_GAZE_RATIO_THRESHOLD = (0.40, 0.60)  # Vertical gaze thresholds
    current_dir = os.path.dirname(os.path.realpath(__file__))  # Get the directory of the current script
    config_path = os.path.join(current_dir, "mediapipe_config.yaml")  # Join with the yaml file name
    configs = read_yaml(config_path)      # Read the config file (yaml)
    
    RIGHT_IRIS = configs['RIGHT_IRIS']
    LEFT_IRIS = configs['LEFT_IRIS']
    LEFT_EYE_LANDMARKS = configs['LEFT_EYE_LANDMARKS']
    RIGHT_EYE_LANDMARKS = configs['RIGHT_EYE_LANDMARKS']
    LEFT_EYE_TOP = configs['LEFT_EYE_TOP']
    LEFT_EYE_BOTTOM = configs['LEFT_EYE_BOTTOM']
    RIGHT_EYE_TOP = configs['RIGHT_EYE_TOP']
    RIGHT_EYE_BOTTOM = configs['RIGHT_EYE_BOTTOM']

    #make prediction
    img_h, img_w, results = detect_facial_landmarks(img_frame, orig_frame, num_faces=1)
    
    if results.multi_face_landmarks:
        face_one = results.multi_face_landmarks[0]  # Single face for now
        points_for_mesh = mesh_points(image_width=img_w, image_height=img_h, landmarks=face_one.landmark)

        # Extract iris and eye landmarks
        left_iris_landmarks = [points_for_mesh[i] for i in LEFT_IRIS]
        right_iris_landmarks = [points_for_mesh[i] for i in RIGHT_IRIS]

        left_eye_landmarks = [points_for_mesh[i] for i in LEFT_EYE_LANDMARKS]
        right_eye_landmarks = [points_for_mesh[i] for i in RIGHT_EYE_LANDMARKS]

        # Extract eyelid landmarks
        left_eye_top = points_for_mesh[LEFT_EYE_TOP[0]]
        left_eye_bottom = points_for_mesh[LEFT_EYE_BOTTOM[0]]
        right_eye_top = points_for_mesh[RIGHT_EYE_TOP[0]]
        right_eye_bottom = points_for_mesh[RIGHT_EYE_BOTTOM[0]]

        # Get iris centers
        left_iris_center = get_iris_center(LEFT_IRIS, points_for_mesh)
        right_iris_center = get_iris_center(RIGHT_IRIS, points_for_mesh)

        # Compute iris position ratios
        left_ratio = compute_iris_position_ratio([left_eye_landmarks[0], left_eye_landmarks[1]], left_iris_center)
        right_ratio = compute_iris_position_ratio([right_eye_landmarks[0], right_eye_landmarks[1]], right_iris_center)

        # Compute vertical iris position ratios
        left_vertical_ratio = compute_iris_position_ratio_vertical(left_eye_top, left_eye_bottom, left_iris_center)
        right_vertical_ratio = compute_iris_position_ratio_vertical(right_eye_top, right_eye_bottom, right_iris_center)

        # Average ratios for both eyes
        average_ratio = (left_ratio + right_ratio) / 2
        average_vertical_ratio = (left_vertical_ratio + right_vertical_ratio) / 2

        if GAZE_RATIO_THRESHOLD[0] < average_ratio < GAZE_RATIO_THRESHOLD[1]:
            horizontal_direction = "Center"
        elif average_ratio <= GAZE_RATIO_THRESHOLD[0]:
            horizontal_direction = "Right"
        else:
            horizontal_direction = "Left"

        # Vertical gaze classification
        if VERTICAL_GAZE_RATIO_THRESHOLD[0] < average_vertical_ratio < VERTICAL_GAZE_RATIO_THRESHOLD[1]:
            vertical_direction = "Center"
        elif average_vertical_ratio <= VERTICAL_GAZE_RATIO_THRESHOLD[0]:
            vertical_direction = "Up"
        else:
            vertical_direction = "Down"
        return (horizontal_direction, vertical_direction)
    else:
        print('No Eyes Detected')
        return None

# Modified process_frame function to store results in database
async def process_frame(frame_data, width, height):
    try:
        # Extract y, u, v components
        y_size = width * height
        uv_size = y_size // 4
        
        y = np.frombuffer(frame_data[:y_size], dtype=np.uint8).reshape(height, width)
        u = np.frombuffer(frame_data[y_size:y_size+uv_size], dtype=np.uint8).reshape(height//2, width//2)
        v = np.frombuffer(frame_data[y_size+uv_size:], dtype=np.uint8).reshape(height//2, width//2)
        
        # Upscale u and v components
        u = cv2.resize(u, (width, height))
        v = cv2.resize(v, (width, height))
        
        # Stack and convert to rgb
        yuv = cv2.merge([y, u, v])
        rgb = cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)
        
        # Process frame
        result, angle = media_pipe_body_posture(img_frame=rgb)
        gaze_result = media_pipe_gaze_estimation(img_frame=rgb, orig_frame=rgb)
        emotion_result = DeepFace.analyze(rgb, actions=['emotion'], enforce_detection=False, detector_backend="ssd")
        emotion = emotion_result[0]['dominant_emotion']
        
        # Store results in database
        gaze_h, gaze_v = gaze_result if gaze_result else (None, None)
        store_success = store_video_results(result, gaze_h, gaze_v, emotion)
        
        # Print results
        print("\n=== Frame Analysis Results ===")
        print(f"Body posture: {result} (angle: {angle:.2f})")
        if gaze_result:
            h, v = gaze_result
            print(f"Eye gaze: {h}, {v}")
        else:
            print("Eye gaze: Not detected")
        print(f"Emotion: {emotion}")
        print(f"Stored to database: {'Success' if store_success else 'Failed'}")
        print("============================\n")
        
    except Exception as e:
        print(f"Error processing frame: {e}")

async def connect_to_video_server():
    print("Connecting to video server on port 8080...")
    uri = "ws://localhost:8080"
    
    # Connect to database first
    if not connect_to_db():
        print("Warning: Database connection failed. Will continue without storing results.")
    
    # Try to get active call ID
    get_active_call_id()
    
    while True:  # Keep trying to reconnect
        try:
            async with websockets.connect(uri) as websocket:
                print("Connected to video server!")
                
                while True:
                    try:
                        # Receive frame dimensions
                        width_data = await websocket.recv()
                        height_data = await websocket.recv()
                        
                        width = struct.unpack('I', width_data)[0]
                        height = struct.unpack('I', height_data)[0]
                        
                        print(f"Receiving frame with dimensions: {width}x{height}")
                        
                        # Calculate buffer sizes
                        y_size = width * height
                        uv_size = y_size // 4
                        total_size = y_size + (2 * uv_size)
                        
                        # Receive frame data
                        frame_data = b''
                        while len(frame_data) < total_size:
                            chunk = await websocket.recv()
                            frame_data += chunk
                        
                        # Process the frame
                        await process_frame(frame_data, width, height)
                        
                    except websockets.exceptions.ConnectionClosed:
                        print("Connection to video server lost")
                        break
                    except Exception as e:
                        print(f"Error receiving frame: {e}")
                        break
                        
        except Exception as e:
            print(f"Failed to connect to video server: {e}")
            print("Retrying in 5 seconds...")
            await asyncio.sleep(5)
            
if __name__ == "__main__":
    print("Starting video processing client...")
    try:
        # Ensure we have necessary python packages
        import importlib
        if importlib.util.find_spec("mysql") is None:
            print("Installing required MySQL connector...")
            subprocess.check_call(["pip", "install", "mysql-connector-python"])
            print("MySQL connector installed.")
        
        asyncio.run(connect_to_video_server())
    except KeyboardInterrupt:
        print("\nClient stopped by user")
        if db_conn and db_conn.is_connected():
            db_conn.close()
            print("Database connection closed.")
    except Exception as e:
        print(f"Client error: {e}")
        if db_conn and db_conn.is_connected():
            db_conn.close()