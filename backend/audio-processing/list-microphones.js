const { exec } = require('child_process');

function listMicrophones() {
    if (process.platform === 'linux') {
        // Use arecord to list audio devices on Linux
        exec('arecord -l', (error, stdout, stderr) => {
            if (error) {
                console.error('Error listing microphones:', error.message);
                return;
            }

            console.log('\nAvailable Audio Capture Devices:');
            console.log('--------------------');
            console.log(stdout);
            
            console.log('\nTo use a specific device in transcription.js, use the format:');
            console.log('hw:<card number>,<device number>');
            console.log('Example: hw:1,0');
        });
    } else if (process.platform === 'darwin') {
        // macOS
        exec('system_profiler SPAudioDataType', (error, stdout, stderr) => {
            if (error) {
                console.error('Error listing microphones:', error.message);
                return;
            }
            console.log('\nAvailable Audio Devices:');
            console.log('--------------------');
            console.log(stdout);
        });
    } else if (process.platform === 'win32') {
        console.log('On Windows, you can view audio devices in Sound Settings.');
        console.log('Open Windows Settings -> System -> Sound -> Input');
    }
}

// Run the function
listMicrophones(); 