/* 
    This file contains the functions to calculate the 4 scores for the user's performance in a call.
    The scores are:
    - Attention Economics
    - Mood Induction
    - Value Internalization
    - Cognitive Resonance
*/

const express = require('express');
const db = require('../db/db-configs');
const moment = require('moment');

const router = express.Router();

// Parse Gaze Direction string
const parseGazeDirection = (gazeDirectionString) => {
    // Handle the case where gaze direction is not detected
    if (!gazeDirectionString || gazeDirectionString.toLowerCase() === 'not detected') {
        return { horizontal: 'unknown', vertical: 'unknown' };
    }
    
    const parts = gazeDirectionString.split('-');
    return {
        horizontal: parts[0].toLowerCase(), // Left, Right, Center
        vertical: parts[1].toLowerCase()   // Up, Down, Center
    };
};

// Calculate Attention Economics Score
const calculateAttentionEconomicsScore = (videoResults, audioResults) => {
    let positivePoints = 0;
    let negativePoints = 0;
    let totalPoints = 0;
    
    // Process each video result
    videoResults.forEach(result => {
        totalPoints++;
        
        // Check body alignment - handle "No pose detected"
        const bodyAlignment = (result.BodyAlignment || '').toLowerCase();
        if (bodyAlignment === 'misaligned') {
            negativePoints++;
        } else if (bodyAlignment === 'no pose detected') {
            // User not visible - significant negative impact
            negativePoints += 1.5;
        }
        
        // Check face emotion
        const emotion = (result.Emotion || '').toLowerCase();
        if (emotion === 'happy' || emotion === 'surprise') {
            positivePoints++;
        } else if (emotion === 'fear') {
            negativePoints++;
        }
    });
    
    // Process each audio result
    audioResults.forEach(result => {
        totalPoints++;
        
        // Check speech emotion
        const positiveEmotions = ['admiration', 'amusement', 'curiosity', 'excitement', 'joy', 'realization', 'surprise'];
        const sentiment = (result.Sentiment || '').toLowerCase();
        
        if (positiveEmotions.includes(sentiment)) {
            positivePoints++;
        }
    });
    
    // Calculate the final score (as a percentage)
    const score = totalPoints > 0 
        ? Math.max(0, Math.min(100, 50 + ((positivePoints - negativePoints) / totalPoints) * 50))
        : 50; // Default to neutral 50% if no data points
    
    return score;
};

// Calculate Mood Induction Score
const calculateMoodInductionScore = (videoResults, audioResults) => {
    let positivePoints = 0;
    let negativePoints = 0;
    let totalPoints = 0;
    
    // Process each video result
    videoResults.forEach(result => {
        totalPoints++;
        
        // Check if user is visible
        const bodyAlignment = (result.BodyAlignment || '').toLowerCase();
        if (bodyAlignment === 'no pose detected') {
            negativePoints += 1; // User not visible - negative impact
        }
        
        // Check gaze direction
        const gazeDirection = (result.GazeDirection || '').toLowerCase();
        if (gazeDirection === 'not detected') {
            negativePoints += 0.5; // Can't detect gaze - slight negative impact
        } else {
            const gaze = parseGazeDirection(gazeDirection);
            if (gaze.horizontal !== 'center' || gaze.vertical !== 'center') {
                negativePoints += 0.5; // Partial negative for gaze away
            }
        }
        
        // Check face emotion
        const emotion = (result.Emotion || '').toLowerCase();
        if (emotion === 'happy' || emotion === 'surprise') {
            positivePoints++;
        } else if (['anger', 'disgust', 'fear', 'sad'].includes(emotion)) {
            negativePoints++;
        }
    });
    
    // Process each audio result
    audioResults.forEach(result => {
        totalPoints++;
        
        // Check speech emotion
        const positiveEmotions = ['amusement', 'desire', 'joy', 'love', 'relief', 'surprise'];
        const negativeEmotions = ['anger', 'annoyance', 'disgust', 'embarrassment', 'grief', 'nervousness', 'sadness'];
        
        const sentiment = (result.Sentiment || '').toLowerCase();
        if (positiveEmotions.includes(sentiment)) {
            positivePoints++;
        } else if (negativeEmotions.includes(sentiment)) {
            negativePoints++;
        }
    });
    
    // Calculate the final score (as a percentage)
    const score = totalPoints > 0 
        ? Math.max(0, Math.min(100, 50 + ((positivePoints - negativePoints) / totalPoints) * 50))
        : 50; // Default to neutral 50% if no data points
    
    return score;
};

// Calculate Value Internalization Score
const calculateValueInternalizationScore = (videoResults, audioResults) => {
    let positivePoints = 0;
    let negativePoints = 0;
    let totalPoints = 0;
    
    // Process each video result
    videoResults.forEach(result => {
        totalPoints++;
        
        // Check if user is visible
        const bodyAlignment = (result.BodyAlignment || '').toLowerCase();
        if (bodyAlignment === 'no pose detected') {
            negativePoints += 0.5; // User not visible - slight negative impact
        }
        
        // Check face emotion
        const emotion = (result.Emotion || '').toLowerCase();
        if (['anger', 'disgust'].includes(emotion)) {
            negativePoints++;
        }
    });
    
    // Process each audio result
    audioResults.forEach(result => {
        totalPoints++;
        
        // Check speech emotion
        const positiveEmotions = ['admiration', 'approval', 'caring', 'gratitude', 'optimism', 'pride', 'realization', 'remorse'];
        const negativeEmotions = ['anger', 'annoyance', 'confusion', 'disappointment', 'disapproval', 'embarrassment'];
        
        const sentiment = (result.Sentiment || '').toLowerCase();
        if (positiveEmotions.includes(sentiment)) {
            positivePoints++;
        } else if (negativeEmotions.includes(sentiment)) {
            negativePoints++;
        }
    });
    
    // Calculate the final score (as a percentage)
    const score = totalPoints > 0 
        ? Math.max(0, Math.min(100, 50 + ((positivePoints - negativePoints) / totalPoints) * 50))
        : 50; // Default to neutral 50% if no data points
    
    return score;
};

// Calculate Cognitive Resonance Score
const calculateCognitiveResonanceScore = (videoResults, audioResults) => {
    // This measures consistency vs variation in responses
    // Create a time-bucketed analysis (per minute)
    
    const timeWindows = {};
    const windowSize = 60 * 1000; // 1 minute in milliseconds
    
    // Process video results
    videoResults.forEach(result => {
        const timestamp = new Date(result.Timestamp).getTime();
        const windowKey = Math.floor(timestamp / windowSize);
        
        if (!timeWindows[windowKey]) {
            timeWindows[windowKey] = {
                bodyAlignmentCount: { aligned: 0, misaligned: 0, notdetected: 0 },
                gazeDirectionCount: { center: 0, away: 0, notdetected: 0 },
                faceEmotionCount: {},
                speechEmotionCount: {},
                totalPoints: 0
            };
        }
        
        // Count body alignment
        const bodyAlignment = (result.BodyAlignment || '').toLowerCase();
        if (bodyAlignment === 'no pose detected') {
            timeWindows[windowKey].bodyAlignmentCount.notdetected++;
        } else {
            timeWindows[windowKey].bodyAlignmentCount[bodyAlignment]++;
        }
        
        // Count gaze direction
        const gazeDirection = (result.GazeDirection || '').toLowerCase();
        if (gazeDirection === 'not detected') {
            timeWindows[windowKey].gazeDirectionCount.notdetected++;
        } else {
            const gaze = parseGazeDirection(gazeDirection);
            if (gaze.horizontal === 'center' && gaze.vertical === 'center') {
                timeWindows[windowKey].gazeDirectionCount.center++;
            } else {
                timeWindows[windowKey].gazeDirectionCount.away++;
            }
        }
        
        // Count face emotions
        const emotion = (result.Emotion || '').toLowerCase();
        if (emotion) {
            timeWindows[windowKey].faceEmotionCount[emotion] = 
                (timeWindows[windowKey].faceEmotionCount[emotion] || 0) + 1;
        }
        
        timeWindows[windowKey].totalPoints++;
    });
    
    // Process audio results
    audioResults.forEach(result => {
        const timestamp = new Date(result.Timestamp).getTime();
        const windowKey = Math.floor(timestamp / windowSize);
        
        if (!timeWindows[windowKey]) {
            timeWindows[windowKey] = {
                bodyAlignmentCount: { aligned: 0, misaligned: 0, notdetected: 0 },
                gazeDirectionCount: { center: 0, away: 0, notdetected: 0 },
                faceEmotionCount: {},
                speechEmotionCount: {},
                totalPoints: 0
            };
        }
        
        // Count speech emotions
        const sentiment = (result.Sentiment || '').toLowerCase();
        if (sentiment) {
            timeWindows[windowKey].speechEmotionCount[sentiment] = 
                (timeWindows[windowKey].speechEmotionCount[sentiment] || 0) + 1;
        }
        
        timeWindows[windowKey].totalPoints++;
    });
    
    // Calculate consistency score for each window
    let totalConsistencyScore = 0;
    let windowCount = 0;
    
    Object.values(timeWindows).forEach(window => {
        if (window.totalPoints === 0) return;
        
        // Calculate dominance (consistency) in each category
        const bodyAlignmentValues = Object.values(window.bodyAlignmentCount);
        const maxBodyAlignment = Math.max(...bodyAlignmentValues);
        const totalBodyAlignment = bodyAlignmentValues.reduce((sum, count) => sum + count, 0);
        const bodyAlignmentConsistency = totalBodyAlignment > 0 ? maxBodyAlignment / totalBodyAlignment : 0;
        
        const gazeDirectionValues = Object.values(window.gazeDirectionCount);
        const maxGazeDirection = Math.max(...gazeDirectionValues);
        const totalGazeDirection = gazeDirectionValues.reduce((sum, count) => sum + count, 0);
        const gazeDirectionConsistency = totalGazeDirection > 0 ? maxGazeDirection / totalGazeDirection : 0;
        
        // Get max occurrence for face emotions
        const maxFaceEmotion = Object.values(window.faceEmotionCount).reduce((max, count) => Math.max(max, count), 0);
        const totalFaceEmotions = Object.values(window.faceEmotionCount).reduce((sum, count) => sum + count, 0);
        const faceEmotionConsistency = totalFaceEmotions > 0 ? maxFaceEmotion / totalFaceEmotions : 0;
        
        // Get max occurrence for speech emotions
        const maxSpeechEmotion = Object.values(window.speechEmotionCount).reduce((max, count) => Math.max(max, count), 0);
        const totalSpeechEmotions = Object.values(window.speechEmotionCount).reduce((sum, count) => sum + count, 0);
        const speechEmotionConsistency = totalSpeechEmotions > 0 ? maxSpeechEmotion / totalSpeechEmotions : 0;
        
        // Calculate window consistency score
        const windowConsistency = (
            bodyAlignmentConsistency + 
            gazeDirectionConsistency + 
            faceEmotionConsistency + 
            speechEmotionConsistency
        ) / 4;
        
        totalConsistencyScore += windowConsistency;
        windowCount++;
    });
    
    // Final cognitive resonance score
    const score = windowCount > 0 
        ? Math.round(totalConsistencyScore / windowCount * 100)
        : 50; // Default to neutral 50% if no data points
    
    return score;
};

// API Endpoint to get scores
router.get('/get-scores', (req, res) => {
    const { callID, timestamp } = req.query;
    
    if (!callID) {
        return res.status(400).json({ message: 'CallID is required' });
    }
    
    // Format the timestamp or use a default (10 minutes ago)
    const lastTimestamp = timestamp 
        ? moment(timestamp).format('YYYY-MM-DD HH:mm:ss')
        : moment().subtract(10, 'minutes').format('YYYY-MM-DD HH:mm:ss');
    
    // Get the last known scores to use as fallbacks if no new data
    const lastScoresQuery = `
        SELECT * FROM AggregatedResults 
        WHERE CallID = ? 
        ORDER BY Timestamp DESC 
        LIMIT 1;
    `;
    
    db.query(lastScoresQuery, [callID], (err, lastScores) => {
        const lastScoreValues = lastScores && lastScores.length > 0 ? lastScores[0] : {
            AttentionEconomicsScore: 0.5,
            MoodInductionScore: 0.5,
            ValueInternalizationScore: 0.5,
            CognitiveResonanceScore: 0.5
        };
        
        // Query to get video results
        const videoQuery = `
            SELECT * FROM VideoResults 
            WHERE CallID = ? AND Timestamp > ?
            ORDER BY Timestamp DESC;
        `;
        
        // Query to get audio results
        const audioQuery = `
            SELECT * FROM AudioResults 
            WHERE CallID = ? AND Timestamp > ?
            ORDER BY Timestamp DESC;
        `;
        
        // First get video results
        db.query(videoQuery, [callID, lastTimestamp], (err, videoResults) => {
            if (err) {
                console.error('Error fetching video results:', err);
                return res.status(500).json({ message: 'Error fetching video results' });
            }
            
            // Then get audio results
            db.query(audioQuery, [callID, lastTimestamp], (err, audioResults) => {
                if (err) {
                    console.error('Error fetching audio results:', err);
                    return res.status(500).json({ message: 'Error fetching audio results' });
                }
                
                // Check if we have any new data to process
                const hasNewVideoData = videoResults && videoResults.length > 0;
                const hasNewAudioData = audioResults && audioResults.length > 0;
                
                // Calculate scores or use last known scores
                let attentionEconomicsScore, moodInductionScore, 
                    valueInternalizationScore, cognitiveResonanceScore;
                
                if (hasNewVideoData || hasNewAudioData) {
                    console.log(`Processing new data: ${hasNewVideoData ? videoResults.length : 0} video records, ${hasNewAudioData ? audioResults.length : 0} audio records`);
                    
                    // Calculate scores with available data
                    attentionEconomicsScore = calculateAttentionEconomicsScore(
                        hasNewVideoData ? videoResults : [], 
                        hasNewAudioData ? audioResults : []
                    );
                    
                    moodInductionScore = calculateMoodInductionScore(
                        hasNewVideoData ? videoResults : [], 
                        hasNewAudioData ? audioResults : []
                    );
                    
                    valueInternalizationScore = calculateValueInternalizationScore(
                        hasNewVideoData ? videoResults : [], 
                        hasNewAudioData ? audioResults : []
                    );
                    
                    cognitiveResonanceScore = calculateCognitiveResonanceScore(
                        hasNewVideoData ? videoResults : [], 
                        hasNewAudioData ? audioResults : []
                    );
                } else {
                    console.log('No new data found, using last known scores');
                    // Use last known scores
                    attentionEconomicsScore = lastScoreValues.AttentionEconomicsScore * 100;
                    moodInductionScore = lastScoreValues.MoodInductionScore * 100;
                    valueInternalizationScore = lastScoreValues.ValueInternalizationScore * 100;
                    cognitiveResonanceScore = lastScoreValues.CognitiveResonanceScore * 100;
                }
                
                // Store the calculated scores in AggregatedResults only if we have new data
                if (hasNewVideoData || hasNewAudioData) {
                    const currentTime = moment().format('YYYY-MM-DD HH:mm:ss');
                    const insertAggregatedQuery = `
                        INSERT INTO AggregatedResults 
                        (CallID, Timestamp, AttentionEconomicsScore, MoodInductionScore, ValueInternalizationScore, CognitiveResonanceScore)
                        VALUES (?, ?, ?, ?, ?, ?);
                    `;
                    
                    db.query(
                        insertAggregatedQuery, 
                        [
                            callID, 
                            currentTime, 
                            attentionEconomicsScore / 100, // Convert percentage to float (0-1)
                            moodInductionScore / 100, 
                            valueInternalizationScore / 100, 
                            cognitiveResonanceScore / 100
                        ], 
                        (err) => {
                            if (err) {
                                console.error('Error storing aggregated results:', err);
                            }
                        }
                    );
                }
                
                // Return the calculated scores to the frontend
                res.json({
                    attentionEconomics: attentionEconomicsScore,
                    moodInduction: moodInductionScore,
                    valueInternalization: valueInternalizationScore,
                    cognitiveResonance: cognitiveResonanceScore,
                    timestamp: moment().format('YYYY-MM-DD HH:mm:ss'),
                    newDataProcessed: (hasNewVideoData || hasNewAudioData)
                });
            });
        });
    });
});

module.exports = {
    router,
    calculateAttentionEconomicsScore,
    calculateMoodInductionScore,
    calculateValueInternalizationScore,
    calculateCognitiveResonanceScore
};
