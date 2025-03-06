const { createClient } = require("@deepgram/sdk");
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar"); // For watching directory changes
const axios = require('axios'); // Add this for making HTTP requests

// Configuration
const RECORDINGS_DIR = path.join(__dirname, "../../zoomBot/recordings");
const TRANSCRIPTS_DIR = path.join(__dirname, "../call_transcripts");
console.log(RECORDINGS_DIR, '\n', TRANSCRIPTS_DIR);
const deepgram = createClient('d7ce2e3f6336e4d41ab55e54023ebdb03b74f4fd');

// Keep track of processed files
const processedFiles = new Set();

// Add a buffer to store transcriptions
let transcriptionBuffer = [];
const BUFFER_SIZE = 4; // Number of 3-second chunks to accumulate (12 seconds)

// Add timestamp to logs
function logWithTimestamp(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
}

// Transcribe a single audio file
async function transcribeAudioFile(filePath, speaker) {
    // logWithTimestamp(`Starting transcription of ${filePath} for ${speaker}`);
    try {
        const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
            fs.readFileSync(filePath),
            {
                smart_format: true,
                model: 'nova-2',
                language: 'en-US',
                encoding: 'linear16',
                sample_rate: 32000      //doesnt depend on the length of the audio
            }
        );

        if (error) throw error;
        // logWithTimestamp(`Successfully transcribed ${filePath} for ${speaker}`);
        console.log("RESULTS==> ", result.results.channels[0].alternatives[0].transcript);
        // Extract timestamp from filename (assuming format: speaker_timestamp.raw)
        const baseTimestamp = path.basename(filePath).split('_')[1].replace('.raw', '');
        
        return {
            speaker,
            timestamp: baseTimestamp,
            transcription: result.results.channels[0].alternatives[0].transcript,
            words: result.results.channels[0].alternatives[0].words
        };
    } catch (error) {
        // logWithTimestamp(`Error transcribing ${filePath}: ${error}`);
        return null;
    }
}

// Modify the analyzeEmotion function
async function analyzeEmotion(text) {
    try {
        const response = await axios.post(
            'https://riu-rd-emoroberta-api.hf.space/emoroberta',
            {
                input: text
            },
            {
                headers: {
                    'accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        );

        // Get the emotion with highest score (first in the sorted array)
        const topEmotion = response.data.predictions[0].label;
        return topEmotion;
    } catch (error) {
        console.error('Error analyzing emotion:', error);
        return null;
    }
}

// Modify writeTranscriptToFile to handle emotion analysis
async function writeTranscriptToFile(transcriptions) {
    // logWithTimestamp(`Writing transcriptions to file. Number of transcriptions: ${transcriptions.length}`);
    
    // Use a fixed filename for the current session
    const transcriptPath = path.join(TRANSCRIPTS_DIR, 'current_transcript.txt');
    
    // Sort transcriptions by timestamp
    const sortedEntries = transcriptions
        .filter(t => t && t.words && t.words.length > 0)
        .flatMap(t => 
            t.words.map(word => ({
                speaker: t.speaker,
                timestamp: new Date(word.start * 1000).toTimeString().split(' ')[0],
                text: word.word
            }))
        )
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    // logWithTimestamp(`Processed ${sortedEntries.length} words for transcription`);

    // Group words by speaker and timestamp
    let currentGroup = { speaker: null, timestamp: null, text: [] };
    const groupedEntries = [];

    sortedEntries.forEach(entry => {
        if (currentGroup.speaker === entry.speaker && 
            currentGroup.timestamp === entry.timestamp) {
            currentGroup.text.push(entry.text);
        } else {
            if (currentGroup.text.length > 0) {
                groupedEntries.push({ ...currentGroup, text: currentGroup.text.join(' ') });
            }
            currentGroup = {
                speaker: entry.speaker,
                timestamp: entry.timestamp,
                text: [entry.text]
            };
        }
    });
    
    if (currentGroup.text.length > 0) {
        groupedEntries.push({ ...currentGroup, text: currentGroup.text.join(' ') });
    }

    // Create new transcript lines
    const newTranscriptLines = groupedEntries
        .map(entry => `[${entry.timestamp}] ${entry.speaker}: ${entry.text}`);

    // Add transcriptions to buffer
    transcriptionBuffer.push(...newTranscriptLines);

    // If we have enough transcriptions, process them
    if (transcriptionBuffer.length >= BUFFER_SIZE) {
        // Get unique transcriptions by removing duplicates
        const uniqueTranscriptions = [...new Set(transcriptionBuffer)];
        
        // Combine the buffered transcriptions into one text
        const combinedText = uniqueTranscriptions
            .join(' ')
            .replace(/\[\d{2}:\d{2}:\d{2}\] (Host|Client): /g, ''); // Remove timestamps and speaker labels

        // Analyze emotion
        const emotion = await analyzeEmotion(combinedText);
        console.log('\nAnalyzed 12-second chunk:');
        console.log('Text:', combinedText);
        console.log('Emotion:', emotion);

        // Clear the buffer
        transcriptionBuffer = [];
    }

    // Continue with existing file writing logic
    try {
        let existingContent = '';
        if (fs.existsSync(transcriptPath)) {
            existingContent = fs.readFileSync(transcriptPath, 'utf8');
            if (existingContent && !existingContent.endsWith('\n')) {
                existingContent += '\n';
            }
        }

        const updatedContent = existingContent + newTranscriptLines.join('\n') + '\n';
        fs.writeFileSync(transcriptPath, updatedContent);
    } catch (error) {
        console.error('Error updating transcript file:', error);
    }
}

// Watch for new audio files and process them
function watchAudioFiles() {
    // logWithTimestamp(`Starting to watch directory: ${RECORDINGS_DIR}`);
    
    const watcher = chokidar.watch(RECORDINGS_DIR, {
        ignored: /(^|[\/\\])\../,
        persistent: true
    });

    let pendingTranscriptions = new Map(); // Keep track of related host/client files

    watcher.on('add', async (filePath) => {
        if (processedFiles.has(filePath)) return;
        
        // logWithTimestamp(`New file detected: ${filePath}`);
        processedFiles.add(filePath);

        const fileName = path.basename(filePath);
        const timestamp = fileName.split('_')[1].replace('.raw', '');
        const speaker = fileName.startsWith('host') ? 'Host' : 'Client';

        // logWithTimestamp(`Processing ${speaker} file with timestamp ${timestamp}`);

        // Store the transcription promise
        const transcriptionPromise = transcribeAudioFile(filePath, speaker);
        pendingTranscriptions.set(timestamp, {
            ...(pendingTranscriptions.get(timestamp) || {}),
            [speaker.toLowerCase()]: transcriptionPromise
        });

        // Check if we have both host and client files for this timestamp
        const currentPair = pendingTranscriptions.get(timestamp);
        // logWithTimestamp(`Current pair for timestamp ${timestamp}: Host=${!!currentPair.host}, Client=${!!currentPair.client}`);

        try {
            // If we have both files, wait for both transcriptions
            if (currentPair.host && currentPair.client) {
                // logWithTimestamp(`Processing pair of files for timestamp ${timestamp}`);
                const [hostTranscription, clientTranscription] = await Promise.all([
                    currentPair.host,
                    currentPair.client
                ]);
                writeTranscriptToFile([hostTranscription, clientTranscription]);
            } else {
                // Process single file after a short delay to allow for pairs to form
                setTimeout(async () => {
                    if (!pendingTranscriptions.has(timestamp)) return; // Already processed as a pair
                    
                    const transcription = await transcriptionPromise;
                    // logWithTimestamp(`Writing single transcription for ${speaker}`);
                    writeTranscriptToFile([transcription]);
                    pendingTranscriptions.delete(timestamp);
                }, 5000); // 5 second delay to allow for pairs
            }
        } catch (error) {
            // logWithTimestamp(`Error processing transcription: ${error}`);
        }
    });

    watcher.on('ready', () => {
        // logWithTimestamp('Initial scan complete. Ready for changes');
    });

    watcher.on('error', error => {
        // logWithTimestamp(`Watcher error: ${error}`);
    });
}

// Initialize the system
function initialize() {
    // logWithTimestamp('Initializing audio transcription service...');
    
    // Ensure directories exist
    [RECORDINGS_DIR, TRANSCRIPTS_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            // logWithTimestamp(`Creating directory: ${dir}`);
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    // Start watching for new audio files
    watchAudioFiles();
    // logWithTimestamp(`Audio transcription service initialized and watching: ${RECORDINGS_DIR}`);
}

initialize();
