const WebSocket = require('ws');
const express = require('express');
const router = express.Router();

class MetricsAggregator {
    constructor() {
        this.videoMetrics = new Map();  // Store video analysis data
        this.transcriptSentiments = new Map();  // Store transcript sentiments
        this.processedTimestamps = new Set();  // Track processed timestamps
    }

    // Receive video analysis data
    addVideoMetrics(timestamp, data) {
        this.videoMetrics.set(timestamp, data);
        // Schedule processing after 12 seconds
        setTimeout(() => this.processMetrics(timestamp), 12000);
    }

    // Receive transcript sentiment data
    addTranscriptSentiment(timestamp, sentiment) {
        this.transcriptSentiments.set(timestamp, sentiment);
    }

    // Process combined metrics
    processMetrics(timestamp) {
        if (this.processedTimestamps.has(timestamp)) return;

        const videoData = this.videoMetrics.get(timestamp);
        const sentimentData = this.transcriptSentiments.get(timestamp);

        if (!videoData || !sentimentData) {
            console.log('Incomplete data for timestamp:', timestamp);
            return;
        }

        // Calculate combined metrics
        const combinedMetrics = {
            attention_economics: this.calculateAttentionEconomics(videoData, sentimentData),
            mood_induction: this.calculateMoodInduction(videoData, sentimentData),
            value_internalization: this.calculateValueInternalization(videoData, sentimentData)
        };

        // Mark timestamp as processed
        this.processedTimestamps.add(timestamp);

        // Clean up old data
        this.videoMetrics.delete(timestamp);
        this.transcriptSentiments.delete(timestamp);

        // Broadcast results
        this.broadcastMetrics(timestamp, combinedMetrics);
    }

    calculateAttentionEconomics(videoData, sentimentData) {
        // Base score starts at 0.5 (neutral point)
        let score = 0.5;
        
        // Posture impact
        if (videoData.posture.result === 'Misaligned') {
            const angle_diff = videoData.posture.angle;
            const penalty = Math.min(0.3, angle_diff / 180);
            score -= penalty;
        }

        // Gaze impact
        if (videoData.gaze.horizontal !== 'Center' || videoData.gaze.vertical !== 'Center') {
            score -= 0.2;
        }

        // Sentiment impact
        if (sentimentData.sentiment === 'positive') score += 0.2;
        else if (sentimentData.sentiment === 'negative') score -= 0.2;

        return Math.min(1.0, Math.max(0.0, score));
    }

    calculateMoodInduction(videoData, sentimentData) {
        let score = 0.5;

        // Emotion impact from video
        const emotionWeights = {
            'happy': 0.3,
            'neutral': 0.1,
            'surprise': 0.2,
            'sad': -0.2,
            'angry': -0.3,
            'fear': -0.3,
            'disgust': -0.3
        };
        score += emotionWeights[videoData.emotion.toLowerCase()] || 0;

        // Sentiment impact
        if (sentimentData.sentiment === 'positive') score += 0.2;
        else if (sentimentData.sentiment === 'negative') score -= 0.2;

        return Math.min(1.0, Math.max(0.0, score));
    }

    calculateValueInternalization(videoData, sentimentData) {
        const attentionScore = this.calculateAttentionEconomics(videoData, sentimentData);
        const moodScore = this.calculateMoodInduction(videoData, sentimentData);
        
        // Weights for different components
        const weights = {
            attention: 0.4,
            mood: 0.3,
            posture: 0.3
        };

        // Calculate posture component
        let postureScore = 0.0;
        if (videoData.posture.result === 'Aligned') {
            postureScore = 1.0;
        } else {
            const angle_diff = videoData.posture.angle;
            postureScore = Math.max(0, 1 - (angle_diff / 90));
        }

        return Math.min(1.0, Math.max(0.0,
            weights.attention * attentionScore +
            weights.mood * moodScore +
            weights.posture * postureScore
        ));
    }

    broadcastMetrics(timestamp, metrics) {
        // Implement WebSocket broadcast here
        console.log(`Metrics for ${timestamp}:`, metrics);
    }
}

// Create singleton instance
const aggregator = new MetricsAggregator();

// Express routes for receiving data
router.post('/video-analysis', (req, res) => {
    const { timestamp, data } = req.body;
    aggregator.addVideoMetrics(timestamp, data);
    res.json({ success: true });
});

router.post('/transcript-sentiment', (req, res) => {
    const { timestamp, sentiment } = req.body;
    aggregator.addTranscriptSentiment(timestamp, sentiment);
    res.json({ success: true });
});

module.exports = { router, aggregator }; 