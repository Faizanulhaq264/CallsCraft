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

-- Create Client Table
CREATE TABLE Client (
    ClientID INT PRIMARY KEY AUTO_INCREMENT,
    Name VARCHAR(255),
    UserID INT,
    FOREIGN KEY (UserID) REFERENCES User(UserID)
);

-- Create Transcript Table
CREATE TABLE Transcript (
    TranscriptID INT PRIMARY KEY AUTO_INCREMENT,
    transcriptName VARCHAR(255)
);

-- Create Call Table
CREATE TABLE meetingCall (
    CallID INT PRIMARY KEY AUTO_INCREMENT,
    StartTime DATETIME,
    EndTime DATETIME,
    ClientID INT,
    TranscriptID INT,
    UserID INT,
    FOREIGN KEY (ClientID) REFERENCES Client(ClientID),
    FOREIGN KEY (TranscriptID) REFERENCES Transcript(TranscriptID),
    FOREIGN KEY (UserID) REFERENCES User(UserID)
);

-- Create Audio Results Table
CREATE TABLE AudioResults (
    AudioResultID INT PRIMARY KEY AUTO_INCREMENT,
    CallID INT,  -- Foreign key referencing the call
    Sentiment VARCHAR(50),   -- Sentiment from the analysis
    Timestamp DATETIME,      -- Timestamp when the audio was processed
    FOREIGN KEY (CallID) REFERENCES meetingCall(CallID)
);

-- Create Video Results Table
CREATE TABLE VideoResults (
    VideoResultID INT PRIMARY KEY AUTO_INCREMENT,
    CallID INT,                -- Foreign key referencing the call
    BodyAlignment VARCHAR(50), -- "Aligned" or "Misaligned"
    GazeDirection VARCHAR(50), -- Direction of gaze (e.g., "Center", "Left", "Right")
    Emotion VARCHAR(50),      -- Facial emotion (e.g., "Happy", "Sad", etc.)
    Timestamp DATETIME,       -- Timestamp when the frame was processed
    FOREIGN KEY (CallID) REFERENCES meetingCall(CallID)
);

-- Create Aggregated Results Table
CREATE TABLE AggregatedResults (
    AggregationID INT PRIMARY KEY AUTO_INCREMENT,
    CallID INT,                     -- Foreign key referencing the call
    Timestamp DATETIME,             -- Timestamp when the aggregation was done
    AttentionEconomicsScore FLOAT,  -- Score for Attention Economics
    MoodInductionScore FLOAT,       -- Score for Mood Induction
    ValueInternalizationScore FLOAT,-- Score for Value Internalization
    CognitiveResonanceScore FLOAT,  -- Score for Cognitive Resonance
    FOREIGN KEY (CallID) REFERENCES meetingCall(CallID)
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
    FocusScore FLOAT,
    CognitiveResonanceScore FLOAT,
    CallID INT,
    FOREIGN KEY (CallID) REFERENCES meetingCall(CallID)
);

-- Create Task Table
CREATE TABLE Task (
    AccomplishmentID INT PRIMARY KEY AUTO_INCREMENT,
    Goal VARCHAR(255),
    Status BOOLEAN
);

-- Create Note Table
CREATE TABLE Note (
    NoteID INT PRIMARY KEY AUTO_INCREMENT,
    Content TEXT,
    Timestamp DATETIME,
    CallID INT,
    FOREIGN KEY (CallID) REFERENCES meetingCall(CallID)
);

-- Create User Zoom Settings Table
CREATE TABLE UserZoomSettings (
    SettingID INT PRIMARY KEY AUTO_INCREMENT,
    UserID INT UNIQUE,
    PMI TEXT,
    PMI_Password TEXT,
    ZoomID TEXT,
    ZoomAccessToken TEXT,
    FOREIGN KEY (UserID) REFERENCES User(UserID)
);

-- Establish Relationships
ALTER TABLE User ADD COLUMN CRMID INT;
ALTER TABLE User ADD FOREIGN KEY (CRMID) REFERENCES CRM(CRMID);