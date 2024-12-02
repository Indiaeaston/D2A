const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { SpeechClient } = require('@google-cloud/speech');
const { Translate } = require('@google-cloud/translate').v2;
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Initialize Google Cloud clients with explicit credentials
const speechClient = new SpeechClient({
    keyFilename: 'C:/Users/leemo/Downloads/metal-clone-441602-f3-1a05fd2350d0.json'
});

const translateClient = new Translate({
    keyFilename: 'C:/Users/leemo/Downloads/metal-clone-441602-f3-1a05fd2350d0.json'
});

// Verify clients on startup
async function verifyClients() {
    try {
        console.log('Verifying Google Cloud clients...');
        await speechClient.initialize();
        console.log('Speech client initialized successfully');

        const [languages] = await translateClient.getLanguages();
        console.log('Translate client initialized successfully');
        console.log('Available for translation to', languages.length, 'languages');
    } catch (error) {
        console.error('Client verification failed:', error.message);
        console.error('Full error:', error);
    }
}

// Static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/test', (req, res) => {
    res.send('Server is working');
});

// Add explicit routes for JavaScript files
app.get('/main.js', (req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'main.js'));
});

app.get('/audio-processor.js', (req, res) => {
    res.type('application/javascript');
    res.sendFile(path.join(__dirname, 'public', 'audio-processor.js'));
});

const fs = require('fs');

// Create a function to save transcriptions
function saveTranscription(transcription, translation, timestamp) {
    const data = {
        timestamp,
        spanish: transcription,
        english: translation
    };

    const filePath = 'transcriptions.json';
    
    try {
        // Read existing file or create empty array if file doesn't exist
        let transcriptions = [];
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            transcriptions = JSON.parse(fileContent);
        }

        // Add new transcription
        transcriptions.push(data);

        // Write back to file
        fs.writeFileSync(filePath, JSON.stringify(transcriptions, null, 2));
        console.log('Transcription saved successfully');
    } catch (error) {
        console.error('Error saving transcription:', error);
    }
}

// WebSocket handling
wss.on('connection', (ws) => {
    console.log('New client connected');
    let sourceLanguage = 'es';
    let targetLanguage = 'en';

    let recognizeStream;

    function createRecognizeStream() {
        return speechClient
            .streamingRecognize({
                config: {
                    encoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                    languageCode: sourceLanguage === 'es' ? 'es-ES' : 'en-US',
                    enableAutomaticPunctuation: true,
                    model: 'default',
                    useEnhanced: true,
                },
                interimResults: true,
            });
    }

    ws.on('message', (data) => {
        try {
            // Check if message is language preference
            const jsonData = JSON.parse(data.toString());
            if (jsonData.type === 'language') {
                const [source, target] = jsonData.direction.split('-');
                sourceLanguage = source;
                targetLanguage = target;
                
                // Recreate stream with new language
                if (recognizeStream) {
                    recognizeStream.end();
                }
                recognizeStream = createRecognizeStream();
                setupStreamHandlers();
                console.log(`Language direction set to ${sourceLanguage} → ${targetLanguage}`);
                return;
            }
        } catch (e) {
            // If not JSON, treat as audio data
            if (recognizeStream) {
                try {
                    console.log('Sending audio chunk of size:', data.length);
                    recognizeStream.write(data);
                } catch (error) {
                    console.error('Error writing to stream:', error);
                }
            }
        }
    });

    function setupStreamHandlers() {
        recognizeStream
            .on('error', (error) => {
                console.error('Recognition Stream Error:', error);
                recognizeStream = createRecognizeStream();
                setupStreamHandlers();
            })
            .on('data', async (data) => {
                if (data.results && data.results[0]) {
                    const result = data.results[0];
                    const transcription = result.alternatives[0].transcript;
                    console.log('Transcription received:', transcription);

                    if (result.isFinal) {
                        try {
                            const [translation] = await translateClient.translate(transcription, {
                                from: sourceLanguage,
                                to: targetLanguage
                            });
                            console.log('Translation:', translation);

                            saveTranscription(
                                sourceLanguage === 'es' ? transcription : translation,
                                sourceLanguage === 'es' ? translation : transcription,
                                new Date().toISOString()
                            );

                            ws.send(JSON.stringify({
                                transcription,
                                translation,
                                isFinal: true
                            }));
                        } catch (error) {
                            console.error('Translation error:', error);
                        }
                    } else {
                        ws.send(JSON.stringify({
                            transcription,
                            isFinal: false
                        }));
                    }
                }
            });
    }

    // Initialize stream with default language
    recognizeStream = createRecognizeStream();
    setupStreamHandlers();

    ws.on('close', () => {
        console.log('Client disconnected');
        if (recognizeStream) {
            recognizeStream.end();
        }
    });
});

// Start server
const port = 4000;
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    verifyClients();
});