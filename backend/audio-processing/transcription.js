const { createClient, LiveTranscriptionEvents } = require("@deepgram/sdk");
const Microphone = require('node-microphone');

const live = async () => {
  // Move API key to environment variables for security
  const deepgramApiKey = "d7ce2e3f6336e4d41ab55e54023ebdb03b74f4fd";

  // Initialize the Deepgram SDK
  const deepgram = createClient(deepgramApiKey);

  try {
    // Initialize microphone
    const mic = new Microphone({
      device: 'default',  // Try using 'default' instead of hw:0,0
      rate: 16000,
      channels: 1,
      debug: true
    });

    console.log('Initializing connection to Deepgram...');
    const connection = deepgram.listen.live({
      smart_format: true,
      model: 'nova-2',
      language: 'en-US',
      encoding: 'linear16',
      sample_rate: 16000,
      interim_results: true,
    });

    // Listen for the connection to open
    connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('Deepgram connection opened');
      console.log('Starting microphone recording...');

      let micStream;
      try {
        micStream = mic.startRecording();
        console.log('Microphone recording started');

        micStream.on('data', (data) => {
          try {
            if (connection.getReadyState() === 1) {
              connection.send(data);
              process.stdout.write('.'); // Visual indicator that data is being sent
            }
          } catch (err) {
            console.error('Error sending data:', err);
          }
        });

        micStream.on('error', (error) => {
          console.error('Microphone stream error:', error);
        });

      } catch (err) {
        console.error('Failed to start recording:', err);
      }
    });

    // Listen for any transcripts received from Deepgram
    connection.on(LiveTranscriptionEvents.Transcript, (data) => {
      if (data.channel.alternatives[0]?.transcript) {
        console.log('\nTranscript:', data.channel.alternatives[0].transcript);
      }
    });

    connection.on(LiveTranscriptionEvents.Error, (error) => {
      console.error('\nDeepgram error:', error);
    });

    connection.on(LiveTranscriptionEvents.Close, () => {
      console.log('\nConnection closed, attempting to reconnect...');
      try {
        mic.stopRecording();
      } catch (err) {
        console.error('Error stopping recording:', err);
      }
      
      setTimeout(() => {
        console.log('Reconnecting...');
        live();
      }, 1000);
    });

    // Enable graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nStopping...');
      try {
        mic.stopRecording();
        // Use the correct method to close the connection
        if (connection.getReadyState() === 1) {
          await connection.finish();
        }
      } catch (err) {
        console.error('Error during shutdown:', err);
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('Setup error:', error);
  }
};

// Start the transcription
console.log('Starting transcription service...');
live();
