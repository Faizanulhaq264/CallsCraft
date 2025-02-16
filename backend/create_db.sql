-- Create Database
CREATE DATABASE IF NOT EXISTS callsCraft;
USE callsCraft;

-- Create User Table
CREATE TABLE User (
    UserID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(255),
    Email VARCHAR(255) UNIQUE,
    Password VARCHAR(255)
);

-- Create Call Table
CREATE TABLE Call (
    meetingID INT PRIMARY KEY AUTO_INCREMENT,
    StartTime DATETIME,
    EndTime DATETIME,
    ClientID INT,
    TranscriptID INT,
    FOREIGN KEY (ClientID) REFERENCES Client(ClientID),
    FOREIGN KEY (TranscriptID) REFERENCES Transcript(TranscriptID)
);

-- Create CRM Table
CREATE TABLE CRM (
    CRMID INT PRIMARY KEY AUTO_INCREMENT,
    CRMName VARCHAR(255)
);

-- Create Analytics Table
CREATE TABLE Analytics (
    AnalyticsID INT PRIMARY KEY AUTO_INCREMENT,
    BodyAlignment FLOAT,
    GazeDirection FLOAT,
    Emotion FLOAT,
    SpeechEmotion FLOAT,
    Pitch FLOAT,
    VoicePace FLOAT,
    FocusScore FLOAT,
    CognitiveResonanceScore FLOAT
);

-- Create Client Table
CREATE TABLE Client (
    ClientID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(255),
    Email VARCHAR(255)
);

-- Create Task Table
CREATE TABLE Task (
    AccomplishmentID INT PRIMARY KEY AUTO_INCREMENT,
    Goal VARCHAR(255),
    Status BOOLEAN
);

-- Create Transcript Table
CREATE TABLE Transcript (
    TranscriptID INT PRIMARY KEY AUTO_INCREMENT,
    Content TEXT,
    Summary TEXT
);

-- Create Note Table
CREATE TABLE Note (
    NoteID INT PRIMARY KEY AUTO_INCREMENT,
    Content TEXT,
    Timestamp DATETIME,
    meetingID INT,
    FOREIGN KEY (CallID) REFERENCES Call(CallID)
);

-- Create User Zoom Settings Table
CREATE TABLE UserZoomSettings (
    SettingID INT PRIMARY KEY AUTO_INCREMENT,
    UserID INT UNIQUE,
    PMI VARCHAR(255),
    PMI_Password VARCHAR(255),
    ZoomID VARCHAR(255),
    ZoomAccessToken VARCHAR(255),
    FOREIGN KEY (UserID) REFERENCES User(UserID)
);

-- Establish Relationships
ALTER TABLE User ADD COLUMN CRMID INT;
ALTER TABLE User ADD FOREIGN KEY (CRMID) REFERENCES CRM(CRMID);

ALTER TABLE Call ADD COLUMN UserID INT;
ALTER TABLE Call ADD FOREIGN KEY (UserID) REFERENCES User(UserID);

ALTER TABLE Analytics ADD COLUMN CallID INT;
ALTER TABLE Analytics ADD FOREIGN KEY (CallID) REFERENCES Call(CallID);
