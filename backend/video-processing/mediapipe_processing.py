'''
    THIS FILE CONTAINS ALL THE PROCESSING CODE THAT IS WRITTEN
    WITH TEH HELP OF MEDIAPIPE
    INCLUDES FUNCTIONS FOR BOTH BODY ALIGNMENT AND GAZE TRACKING
'''
#LIBRARIES
import os
from mediapipe.python.solutions import face_mesh
import math
import cv2
import numpy as np
import mediapipe as mp
import yaml
from mediapipe_utilities import get_iris_center, compute_distance, minimal_angle_difference

# GAZE TRACKING
def mesh_points(image_width:int,image_height:int,landmarks):
    '''
        This function will convert the x,y coordinates from the mediapipe detections
        into their non-normalized forms as opencv requires it
    '''
    return np.array([np.multiply([p.x, p.y], [image_width, image_height]).astype(int) for p in landmarks])

def detect_facial_landmarks(rgb_frame:np.ndarray, original_frame:np.ndarray,num_faces:int=1, min_detection_confidence: float = 0.6, min_tracking_confidence: float = 0.6):
    '''
        Detects facial landmarks in the given RGB frame using the MediaPipe FaceMesh model.
    '''
    with face_mesh.FaceMesh(
        max_num_faces=1,        #detect max=1 face in the stream
        refine_landmarks=True,
        min_detection_confidence=0.6,
        min_tracking_confidence=0.6
    ) as faceMesh:
        results = faceMesh.process(rgb_frame)
        #getting width and height of the frame
        img_h, img_w = original_frame.shape[:2]
        return (img_h,img_w, results)
    
# load configuration

# Get the absolute path of the directory where the script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
file_path = os.path.join(script_dir, 'mediapipe_config.yaml')
with open(file_path, 'r') as file:
    config = yaml.safe_load(file)

# initialize MediaPipe Holistic
mp_holistic = mp.solutions.holistic
mp_drawing = mp.solutions.drawing_utils

# landmark indices for eye tracking
LEFT_EYE_LANDMARKS = [33, 133]    # left eye corners: inner and outer
RIGHT_EYE_LANDMARKS = [362, 263]  # right eye corners: inner and outer

LEFT_EYE_TOP_BOTTOM = [159, 145]   # left eye top and bottom
RIGHT_EYE_TOP_BOTTOM = [386, 374]  # right eye top and bottom

LEFT_IRIS_LANDMARKS = [469, 470, 471, 472]   # left iris landmarks
RIGHT_IRIS_LANDMARKS = [474, 475, 476, 477]  # right iris landmarks

def process_frame(frame, holistic):
    # processes a single frame for eye tracking and posture detection
    image_height, image_width, _ = frame.shape

    # convert the BGR image to RGB before processing
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    rgb_frame.flags.writeable = False

    # process the image and find pose and face landmarks
    results = holistic.process(rgb_frame)

    # convert the image color back so it can be displayed
    rgb_frame.flags.writeable = True
    frame = cv2.cvtColor(rgb_frame, cv2.COLOR_RGB2BGR)

    posture = "Unknown"
    gaze_direction = "Unknown"
    posture_color = (0, 0, 255)  # default to red
    gaze_color = (0, 0, 255)  # default to red

    # eye tracking
    if results.face_landmarks:
        face_landmarks = results.face_landmarks.landmark
        landmark_points = {}
        for idx, lm in enumerate(face_landmarks):
            x, y = int(lm.x * image_width), int(lm.y * image_height)
            landmark_points[idx] = (x, y)

        # extract necessary landmarks
        # left eye
        left_eye_inner = landmark_points[LEFT_EYE_LANDMARKS[0]]
        left_eye_outer = landmark_points[LEFT_EYE_LANDMARKS[1]]
        left_eye_top = landmark_points[LEFT_EYE_TOP_BOTTOM[0]]
        left_eye_bottom = landmark_points[LEFT_EYE_TOP_BOTTOM[1]]
        left_iris_center = get_iris_center(LEFT_IRIS_LANDMARKS, landmark_points)

        # right eye
        right_eye_inner = landmark_points[RIGHT_EYE_LANDMARKS[0]]
        right_eye_outer = landmark_points[RIGHT_EYE_LANDMARKS[1]]
        right_eye_top = landmark_points[RIGHT_EYE_TOP_BOTTOM[0]]
        right_eye_bottom = landmark_points[RIGHT_EYE_TOP_BOTTOM[1]]
        right_iris_center = get_iris_center(RIGHT_IRIS_LANDMARKS, landmark_points)

        # compute distances for left eye
        left_eye_width = compute_distance(left_eye_inner, left_eye_outer)
        left_eye_height = compute_distance(left_eye_top, left_eye_bottom)
        left_iris_left_distance = compute_distance(left_iris_center, left_eye_inner)
        left_iris_right_distance = compute_distance(left_iris_center, left_eye_outer)
        left_iris_top_distance = compute_distance(left_iris_center, left_eye_top)
        left_iris_bottom_distance = compute_distance(left_iris_center, left_eye_bottom)

        # compute distances for right eye
        right_eye_width = compute_distance(right_eye_inner, right_eye_outer)
        right_eye_height = compute_distance(right_eye_top, right_eye_bottom)
        right_iris_left_distance = compute_distance(right_iris_center, right_eye_inner)
        right_iris_right_distance = compute_distance(right_iris_center, right_eye_outer)
        right_iris_top_distance = compute_distance(right_iris_center, right_eye_top)
        right_iris_bottom_distance = compute_distance(right_iris_center, right_eye_bottom)

        # normalize distances by eye width/height
        left_horizontal_ratio = left_iris_left_distance / left_eye_width
        right_horizontal_ratio = right_iris_left_distance / right_eye_width

        left_vertical_ratio = left_iris_top_distance / left_eye_height
        right_vertical_ratio = right_iris_top_distance / right_eye_height

        # average ratios
        horizontal_ratio = (left_horizontal_ratio + right_horizontal_ratio) / 2.0
        vertical_ratio = (left_vertical_ratio + right_vertical_ratio) / 2.0

        # implement logic for gaze detection
        # case 1: face direction is sideways or up/down, but eyes are on the screen
        if config['HORIZONTAL_THRESHOLD_LEFT'] < horizontal_ratio < config['HORIZONTAL_THRESHOLD_RIGHT'] and \
           config['VERTICAL_THRESHOLD_UP'] < vertical_ratio < config['VERTICAL_THRESHOLD_DOWN']:
            gaze_direction = "Looking at Screen"
            gaze_color = (0, 255, 0)  # green color
        else:
            # case 2: face towards screen but eyes looking elsewhere
            gaze_direction = "Looking Away from Screen"
            gaze_color = (255, 0, 255)  # purple color

            # check if the iris is not significantly close to eye corners or eyelids
            if (left_iris_left_distance > left_eye_width * config['EYE_HORIZONTAL_MULTIPLIER'] and
                right_iris_left_distance > right_eye_width * config['EYE_HORIZONTAL_MULTIPLIER'] and
                left_iris_right_distance > left_eye_width * config['EYE_HORIZONTAL_MULTIPLIER'] and
                right_iris_right_distance > right_eye_width * config['EYE_HORIZONTAL_MULTIPLIER'] and
                left_iris_top_distance > left_eye_height * config['EYE_VERTICAL_MULTIPLIER'] and
                right_iris_top_distance > right_eye_height * config['EYE_VERTICAL_MULTIPLIER'] and
                left_iris_bottom_distance > left_eye_height * config['EYE_VERTICAL_MULTIPLIER'] and
                right_iris_bottom_distance > right_eye_height * config['EYE_VERTICAL_MULTIPLIER']):
                # if none of the distances are significantly small, we can consider the user is still attentive
                gaze_direction = "Looking at Screen"
                gaze_color = (0, 255, 0)  # green color

        # visualization (optional)
        # draw landmarks
        for idx in LEFT_IRIS_LANDMARKS + RIGHT_IRIS_LANDMARKS:
            (x, y) = landmark_points[idx]
            cv2.circle(frame, (x, y), 2, (0, 255, 0), -1)

        # draw eye landmarks
        for idx in LEFT_EYE_LANDMARKS + RIGHT_EYE_LANDMARKS + LEFT_EYE_TOP_BOTTOM + RIGHT_EYE_TOP_BOTTOM:
            (x, y) = landmark_points[idx]
            cv2.circle(frame, (x, y), 2, (0, 0, 255), -1)

    else:
        # no face detected
        pass  # uncomment for debugging: print("No face detected")

    # posture detection
    if results.pose_landmarks:
        landmarks = results.pose_landmarks.landmark

        # left and right shoulder landmarks
        left_shoulder = landmarks[mp_holistic.PoseLandmark.LEFT_SHOULDER]
        right_shoulder = landmarks[mp_holistic.PoseLandmark.RIGHT_SHOULDER]

        # convert normalized coordinates to pixel coordinates
        left_shoulder_coords = (int(left_shoulder.x * image_width), int(left_shoulder.y * image_height))
        right_shoulder_coords = (int(right_shoulder.x * image_width), int(right_shoulder.y * image_height))

        # calculate the angle between shoulders
        delta_x = right_shoulder_coords[0] - left_shoulder_coords[0]
        delta_y = right_shoulder_coords[1] - left_shoulder_coords[1]

        angle_rad = math.atan2(delta_y, delta_x)
        angle_deg = math.degrees(angle_rad)

        # normalize angle to range [-180, 180)
        angle_deg = (angle_deg + 180) % 360 - 180

        # calculate minimal angle difference from -180 degrees (aligned position)
        angle_difference = minimal_angle_difference(angle_deg, -180.0)

        # classify posture
        if angle_difference < config['ANGLE_THRESHOLD']:
            posture = "Aligned"
            posture_color = (0, 255, 0)  # green color
        else:
            posture = "Misaligned"
            posture_color = (0, 0, 255)  # red color

        # draw the line between shoulders
        cv2.line(frame, left_shoulder_coords, right_shoulder_coords, posture_color, 2)

        # draw pose landmarks (optional)
        mp_drawing.draw_landmarks(frame, results.pose_landmarks, mp_holistic.POSE_CONNECTIONS)

    else:
        # no pose detected
        pass  # uncomment for debugging: print("No pose detected")

    # display the classification results
    cv2.putText(frame, f"Gaze: {gaze_direction}", (30, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, gaze_color, 2)
    cv2.putText(frame, f"Posture: {posture}", (30, 70), cv2.FONT_HERSHEY_SIMPLEX, 1, posture_color, 2)

    return frame


# Functions to calculate iris center and iris position ratios
def get_iris_center(iris_landmarks, landmarks):
    x = np.mean([landmarks[i][0] for i in iris_landmarks])
    y = np.mean([landmarks[i][1] for i in iris_landmarks])
    return np.array([x, y])

def compute_iris_position_ratio(eye_landmarks, iris_center):
    # Get eye corner positions
    eye_left = np.array(eye_landmarks[0])  # Left corner of the eye
    eye_right = np.array(eye_landmarks[1])  # Right corner of the eye

    # Compute horizontal ratio
    total_distance = np.linalg.norm(eye_right - eye_left)
    iris_distance = np.linalg.norm(iris_center - eye_left)

    # Calculate the ratio of the iris position between the eye corners
    ratio = iris_distance / total_distance
    return ratio

def compute_iris_position_ratio_vertical(eye_top_landmark, eye_bottom_landmark, iris_center):
    # Get eyelid positions
    eye_top = np.array(eye_top_landmark)  # Upper eyelid point
    eye_bottom = np.array(eye_bottom_landmark)  # Lower eyelid point

    # Compute vertical ratio
    total_distance = np.linalg.norm(eye_bottom - eye_top)
    iris_distance = np.linalg.norm(iris_center - eye_top)

    # Calculate the ratio of the iris position between the eyelids
    ratio = iris_distance / total_distance
    return ratio

