'''
    THIS FILE CONTAINS CODE THAT HELPS WITH
    TRACKING REAL TIME EYE GAZE AND CLASSIFYING GAZE DIRECTION
'''
import numpy as np
import cv2 as cv
import os
from mediapipe_utilities import read_yaml
from mediapipe_processing import mesh_points, detect_facial_landmarks

# VARIABLES
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

cap = cv.VideoCapture(CAMERA_NUMBER)

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

# Real-time feed processing
while cap.isOpened():
    ret, frame = cap.read()

    # Convert the image from BGR to RGB (for MediaPipe)
    rgb_frame = cv.cvtColor(frame, cv.COLOR_BGR2RGB)
    rgb_frame.flags.writeable = False      
    img_h, img_w, results = detect_facial_landmarks(rgb_frame, frame, num_faces=1)
    rgb_frame.flags.writeable = True      

    # Ensure at least one face was detected
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

        # Print ratios for calibration
        print(f"Average Ratio: {average_ratio:.2f}, Average Vertical Ratio: {average_vertical_ratio:.2f}")

        # Define thresholds (Adjust these based on calibration)
        GAZE_RATIO_THRESHOLD = (0.40, 0.60)  # Horizontal gaze thresholds
        VERTICAL_GAZE_RATIO_THRESHOLD = (0.40, 0.60)  # Vertical gaze thresholds

        # Horizontal gaze classification
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

        # Combine gaze directions
        gaze_direction = f"{vertical_direction}-{horizontal_direction}"

        # Set color based on gaze
        if horizontal_direction == "Center" and vertical_direction == "Center":
            color = (0, 255, 0)  # Green
        else:
            color = (0, 0, 255)  # Red

        # Display the result
        cv.putText(frame, f"Gaze: {gaze_direction}", (30, 30),
                   cv.FONT_HERSHEY_SIMPLEX, 1, color, 2)

        # Draw iris polylines on the image
        cv.polylines(frame, [np.array(left_iris_landmarks, dtype=np.int32)], True, (0, 255, 0), 1, cv.LINE_AA)
        cv.polylines(frame, [np.array(right_iris_landmarks, dtype=np.int32)], True, (0, 255, 0), 1, cv.LINE_AA)

        # Show the frame
        cv.imshow('image', frame)

        # Wait for a key press to exit
        if cv.waitKey(10) & 0xFF == ord('q'):
            break
    else:
        cv.imshow('image', frame)

        # Wait for a key press to exit
        if cv.waitKey(10) & 0xFF == ord('q'):
            break
        print('NO FACE DETECTED...')
cap.release()
cv.destroyAllWindows()
