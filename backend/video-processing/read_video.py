import socket
import numpy as np
import cv2
import struct
import os
import math
from deepface import DeepFace
import mediapipe as mp
from absl import logging
logging.set_verbosity(logging.ERROR)
from mediapipe_utilities import read_yaml
from mediapipe_processing import mesh_points, detect_facial_landmarks, get_iris_center, compute_iris_position_ratio, compute_iris_position_ratio_vertical
import requests


#uitlity functions
def minimal_angle_difference(angle1, angle2):
    diff = angle2 - angle1
    diff = (diff + 180) % 360 - 180
    return abs(diff)


#main processing functions
def media_pipe_body_posture(img_frame)->tuple:
    """ 
    Function takes a image frame as input and makes gaze & body posture analysis
    reuturns the results as a tuple  
    """
    try:
        # Initialize MediaPipe Pose
        mp_pose = mp.solutions.pose
        pose = mp_pose.Pose(
            static_image_mode=True,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5)    
        mp_drawing = mp.solutions.drawing_utils
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

            print(f"\n\nAngle between shoulders: {angle_deg:.2f} degrees, Angle difference: {angle_difference:.2f} degrees\n\n")

            # Classify posture
            posture = "Aligned" if angle_difference < ANGLE_THRESHOLD else "Misaligned"
            return (posture, angle_difference)
        else:
            print("No pose detected")
            return ("No pose detected", 0.0)  # return default values when no pose is detected
            
    except Exception as e:
        print(f"Error in pose detection: {str(e)}")
        return ("Error in pose detection", 0.0)  # return error state with default angle


def media_pipe_gaze_estimation(img_frame, orig_frame):
    """  """
    # VARIABLES
    GAZE_RATIO_THRESHOLD = (0.40, 0.60)  # Horizontal gaze thresholds
    VERTICAL_GAZE_RATIO_THRESHOLD = (0.40, 0.60)  # Vertical gaze thresholds
    current_dir = os.path.dirname(os.path.realpath(__file__))  # Get the directory of the current script
    config_path = os.path.join(current_dir, "mediapipe_config.yaml")  # Join with the yaml file name
    configs = read_yaml(config_path)      # Read the config file (yaml)
    CAMERA_NUMBER = configs['camera_number']
    RIGHT_IRIS = configs['RIGHT_IRIS']
    LEFT_IRIS = configs['LEFT_IRIS']
    LEFT_EYE_LANDMARKS = configs['LEFT_EYE_LANDMARKS']
    RIGHT_EYE_LANDMARKS = configs['RIGHT_EYE_LANDMARKS']
    LEFT_EYE_TOP = configs['LEFT_EYE_TOP']
    LEFT_EYE_BOTTOM = configs['LEFT_EYE_BOTTOM']
    RIGHT_EYE_TOP = configs['RIGHT_EYE_TOP']
    RIGHT_EYE_BOTTOM = configs['RIGHT_EYE_BOTTOM']

    #make prediction
    # img_frame.flags.writeable = False   
    img_h, img_w, results = detect_facial_landmarks(img_frame, orig_frame, num_faces=1)
    # img_frame.flags.writeable = True 
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
        return (horizontal_direction , vertical_direction)
    else:
        print('No Eyes Detected')       #insert better edgecase handling
        return None


def calculate_posture_score(posture_data: dict) -> float:
    """
    calculate a normalized posture score between -1 and 1
    positive values indicate good alignment, negative values indicate misalignment
    """
    if not posture_data or 'result' not in posture_data:
        return 0.0
    
    if posture_data['result'] == 'Aligned':
        return 1.0
    else:
        # convert angle difference to a negative score
        angle_diff = posture_data.get('angle', 0)
        # normalize angle to a score between -1 and 0
        return max(-1.0, -angle_diff / 90)  # max negative score is -1

def send_to_backend(posture_data, gaze_data, emotion, metrics):
    backend_url = "http://localhost:3000/api/video-data"
    try:
        payload = {
            'posture': posture_data,
            'gaze': gaze_data,
            'emotion': emotion,
            'posture_score': calculate_posture_score(posture_data),
            'metrics': metrics
        }
        response = requests.post(backend_url, json=payload)
        if response.status_code == 200:
            print("Successfully sent video analysis to backend")
        else:
            print(f"Failed to send data to backend: {response.status_code}")
    except Exception as e:
        print(f"Error sending data to backend: {e}")

def receive_frames():
    # connect to the c++ tcp server
    client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_address = ('localhost', 8080)  # match the port in c++ code
    # client_socket.listen(1)
    print("Waiting for connection...")

    try:
        while True:
            try:
                # connect for each frame since server closes connection after sending
                client_socket.connect(server_address)
                print(f'Connection from {server_address}')
                # receive frame dimensions using struct to properly read binary data
                width_data = client_socket.recv(4)  # uint32 = 4 bytes
                height_data = client_socket.recv(4)  # uint32 = 4 bytes
                
                width = struct.unpack('I', width_data)[0]  # unpack as unsigned int
                height = struct.unpack('I', height_data)[0]
                
                # calculate buffer sizes
                y_size = width * height
                uv_size = y_size // 4
                total_size = y_size + (2 * uv_size)
                
                # receive frame data
                frame_data = b''
                while len(frame_data) < total_size:
                    chunk = client_socket.recv(total_size - len(frame_data))
                    if not chunk:
                        break
                    frame_data += chunk
                
                if len(frame_data) == total_size:
                    # extract y, u, v components
                    y = np.frombuffer(frame_data[:y_size], dtype=np.uint8).reshape(height, width)
                    u = np.frombuffer(frame_data[y_size:y_size+uv_size], dtype=np.uint8).reshape(height//2, width//2)
                    v = np.frombuffer(frame_data[y_size+uv_size:], dtype=np.uint8).reshape(height//2, width//2)
                    
                    # upscale u and v components
                    u = cv2.resize(u, (width, height))
                    v = cv2.resize(v, (width, height))
                    
                    # stack and convert to rgb
                    yuv = cv2.merge([y, u, v])
                    rgb = cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)
                    
                    #MODEL PROCESSING
                    result, angle = media_pipe_body_posture(img_frame=rgb)
                    gaze_result = media_pipe_gaze_estimation(img_frame=rgb, orig_frame=rgb)
                    emotion_result = DeepFace.analyze(rgb, actions=['emotion'], enforce_detection=False, detector_backend="ssd")
                    emotion = emotion_result[0]['dominant_emotion']
                    
                    if gaze_result:  # check if gaze detection was successful
                        h, v = gaze_result  # unpack only if not None
                        analysis_data = {
                            'posture': {'result': result, 'angle': angle},
                            'gaze': {'horizontal': h, 'vertical': v},
                            'emotion': emotion
                        }
                        
                        # calculate engagement metrics
                        metrics = process_engagement_metrics(
                            analysis_data['posture'],
                            analysis_data['gaze'],
                            analysis_data['emotion']
                        )
                        
                        # send all data to backend
                        send_to_backend(
                            analysis_data['posture'],
                            analysis_data['gaze'],
                            analysis_data['emotion'],
                            metrics
                        )
                        
                        print(f"\n\nBody posture angle: {angle}")
                        print(f"Eye gaze: {h,v}")
                        print(f"Emotion: {emotion}")
                        print(f"Metrics: {metrics}\n\n")
                        
                    else:
                        analysis_data = {
                            'posture': {'result': result, 'angle': angle},
                            'gaze': None,
                            'emotion': emotion
                        }
                        
                        # calculate metrics without gaze data
                        metrics = process_engagement_metrics(
                            analysis_data['posture'],
                            None,
                            analysis_data['emotion']
                        )
                        
                        # send data to backend
                        send_to_backend(
                            analysis_data['posture'],
                            None,
                            analysis_data['emotion'],
                            metrics
                        )
                        
                        print(f"\n\nBody posture angle: {angle}")
                        print(f"No eye gaze detected")
                        print(f"Emotion: {emotion}")
                        print(f"Metrics: {metrics}\n\n")

                    # # display frame
                    # cv2.imshow('Zoom Video', rgb)
                    # if cv2.waitKey(1) & 0xFF == ord('q'):
                    #     break
                
                # close connection and prepare for next frame
                client_socket.close()
                client_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                
            except ConnectionRefusedError:
                print("Waiting for server... Press Ctrl+C to exit")
                import time
                time.sleep(1)
                continue
            except Exception as e:
                print(f"Error: {e}")
                break
                
    finally:
        client_socket.close()
        cv2.destroyAllWindows()

def calculate_attention_economics(posture_data: dict, gaze_data: dict, emotion: str) -> float:
    """
    calculate attention economics score based on posture, gaze, and emotion
    returns a score between 0 and 1
    """
    # base score starts at 0.5 (neutral point)
    score = 0.5
    
    # emotion impact (positive emotions increase score)
    positive_emotions = {'happy', 'neutral', 'surprise'}
    if emotion.lower() in positive_emotions:
        score += 0.2  # positive boost
    
    # posture impact (misalignment decreases score)
    if posture_data and 'result' in posture_data:
        if posture_data['result'] == 'Misaligned':
            angle_diff = posture_data.get('angle', 0)
            penalty = min(0.3, angle_diff / 180)  # max penalty of 0.3
            score -= penalty
    
    return min(1.0, max(0.0, score))  # ensure score is between 0 and 1

def calculate_mood_induction(emotion: str, posture_data: dict, gaze_data: dict) -> float:
    """
    calculate mood induction score based on emotion, posture, and gaze
    returns a score between 0 and 1
    """
    # base score starts at 0.5 (neutral point)
    score = 0.5
    
    # emotion impact
    emotion_weights = {
        'happy': 0.3,
        'neutral': 0.1,
        'surprise': 0.2,
        'sad': -0.2,
        'angry': -0.3,
        'fear': -0.3,
        'disgust': -0.3
    }
    score += emotion_weights.get(emotion.lower(), 0)
    
    # posture impact
    if posture_data and 'result' in posture_data:
        if posture_data['result'] == 'Aligned':
            score += 0.2  # positive boost for good posture
        else:
            angle_diff = posture_data.get('angle', 0)
            penalty = min(0.2, angle_diff / 180)  # max penalty of 0.2
            score -= penalty
    
    # gaze impact (penalty for non-center gaze)
    if gaze_data and 'horizontal' in gaze_data and 'vertical' in gaze_data:
        h, v = gaze_data['horizontal'], gaze_data['vertical']
        if h != 'Center' or v != 'Center':
            score -= 0.2  # penalty for looking away
    
    return min(1.0, max(0.0, score))  # ensure score is between 0 and 1

def calculate_value_internalization(attention_score: float, mood_score: float, posture_data: dict) -> float:
    """
    calculate value internalization score based on attention, mood and posture
    returns a score between 0 and 1
    """
    # weights for different components
    weights = {
        'attention': 0.4,
        'mood': 0.3,
        'posture': 0.3
    }
    
    # calculate posture component
    posture_score = 0.0
    if posture_data and 'result' in posture_data:
        if posture_data['result'] == 'Aligned':
            posture_score = 1.0
        elif posture_data['result'] == 'Misaligned':
            angle_diff = posture_data.get('angle', 0)
            posture_score = max(0, 1 - (angle_diff / 90))
    
    # weighted sum of all components
    final_score = (
        weights['attention'] * attention_score +
        weights['mood'] * mood_score +
        weights['posture'] * posture_score
    )
    
    return min(1.0, max(0.0, final_score))  # ensure score is between 0 and 1

def process_engagement_metrics(posture_data: dict, gaze_data: dict, emotion: str) -> dict:
    attention_score = calculate_attention_economics(posture_data, gaze_data, emotion)
    mood_score = calculate_mood_induction(emotion, posture_data, gaze_data)
    internalization_score = calculate_value_internalization(
        attention_score, 
        mood_score, 
        posture_data
    )
    
    return {
        'attention_economics': attention_score,
        'mood_induction': mood_score,
        'value_internalization': internalization_score
    }

if __name__ == "__main__":
    receive_frames()