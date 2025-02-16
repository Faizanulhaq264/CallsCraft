import os
import cv2
import math
import socket
import numpy as np
import mediapipe as mp
from absl import logging
logging.set_verbosity(logging.ERROR)
from mediapipe_utilities import read_yaml
from mediapipe_processing import mesh_points, detect_facial_landmarks, get_iris_center, compute_iris_position_ratio, compute_iris_position_ratio_vertical


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
    # img_frame.flags.writeable = False     #uncommeent later
    results = pose.process(img_frame)       #make inference
    # img_frame.flags.writeable = True     #uncommeent later
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark

        #LOGIC FOR DETERMINING POSTURE
        image_height, image_width, _ = img_frame.shape

        # Left and right shoulder landmarks
        left_shoulder = landmarks[11]   # Left shoulder index
        right_shoulder = landmarks[12]  # Right shoulder index

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

        # Calculate minimal angle difference from -180 degrees (aligned position)
        angle_difference = minimal_angle_difference(angle_deg, -180.0)

        # Print angle for debugging
        print(f"\n\nAngle between shoulders: {angle_deg:.2f} degrees, Angle difference: {angle_difference:.2f} degrees\n\n")

        # Classify posture
        if angle_difference < ANGLE_THRESHOLD:
            posture = "Aligned"
            # color = (0, 255, 0)  # Green color        #uncomment if u need to draw the outputs sometime
        else:
            posture = "Misaligned"
            # color = (0, 0, 255)  # Red color          #uncomment if u need to draw the outputs sometime
    else:
        print("No pose detected")
        #add better edge case handling here
    return (posture,angle_difference)


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


def receive_frame():
    server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server_socket.bind(('127.0.1.1', 8080))
    server_socket.listen(1)
    print("Waiting for connection...")

    while True:
        client_socket, addr = server_socket.accept()
        print(f"Connection from {addr}")

        frame_data = b''
        while True:
            data = client_socket.recv(4096)
            if not data:
                break
            frame_data += data

        # Assuming the frame is 720p YUV420
        width = 480
        height = 640
        y_size = width * height
        uv_size = y_size // 4

        y = np.frombuffer(frame_data[0:y_size], dtype=np.uint8).reshape((height, width))
        u = np.frombuffer(frame_data[y_size:y_size + uv_size], dtype=np.uint8).reshape((height // 2, width // 2))
        v = np.frombuffer(frame_data[y_size + uv_size:], dtype=np.uint8).reshape((height // 2, width // 2))

        # Upsample U and V to the same size as Y
        u = cv2.resize(u, (width, height), interpolation=cv2.INTER_LINEAR)
        v = cv2.resize(v, (width, height), interpolation=cv2.INTER_LINEAR)

        # Merge Y, U, and V channels into one image
        yuv = cv2.merge((y, u, v))

        # Convert YUV to BGR for display
        rgb = cv2.cvtColor(yuv, cv2.COLOR_YUV2RGB)

        # Display the frame
        result,angle = media_pipe_body_posture(img_frame=rgb)
        h,v = media_pipe_gaze_estimation(img_frame=rgb , orig_frame=rgb)

        print("\n\n\nThe body posture angle is:", angle, f'\n The eye gaze estimation is: {h,v}\n\n\n')
        cv2.imshow('Received Frame', y)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

        client_socket.close()

    server_socket.close()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    receive_frame()