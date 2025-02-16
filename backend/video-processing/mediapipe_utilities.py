'''
    THIS FILE CONTAINS ALL THE UTILITY FUNCTIONS 
    E.G FILE READING, WRITING etc
'''

#LIBRARIES
import yaml
import numpy as np
import math


#FUNCTIONS
def read_yaml(filename:str):
    '''
        This function will return the contents
        of the yaml file when called
    '''
    with open(filename, 'r') as file:
        config = yaml.safe_load(file)
    return config

def get_iris_center(iris_landmarks, landmark_points):
    # computes the center of the iris based on iris landmarks
    x = np.mean([landmark_points[i][0] for i in iris_landmarks])
    y = np.mean([landmark_points[i][1] for i in iris_landmarks])
    return np.array([x, y])

def compute_distance(point1, point2):
    # computes Euclidean distance between two points
    return np.linalg.norm(np.array(point1) - np.array(point2))

def minimal_angle_difference(angle1, angle2):
    # computes the minimal difference between two angles, accounting for angle wrap-around
    diff = angle2 - angle1
    diff = (diff + 180) % 360 - 180
    return abs(diff)
