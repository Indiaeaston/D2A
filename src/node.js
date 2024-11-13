const express = require('express');
const app = express();

app.get('/', function(req, res){
  res.send("Hello from the root application URL!");
});

app.listen(3000, () => {
  console.log("listening on http://localhost:3000");
})
const fs = require('fs');
const { SpeechClient } = require('@google-cloud/speech');

const client = new SpeechClient();

async function transcribeFile(filePath) {
  const file = fs.readFileSync(filePath);
  const audioBytes = file.toString('base64');

  const [response] = await client.recognize({
    config: {
      encoding: 'MP3',
      sampleRateHertz: 16000, // Adjust if needed
      languageCode: 'en-US',
    },
    audio: {
      content: audioBytes,
    },
  });

  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');

  console.log(`Transcription: ${transcription}`);
}

const filePath = "C:\\Users\\leemo\\OneDrive\\Documents\\Senior Capstone\\D2A\\src\\Identity_Theft_Is_Not_A_Joke.mp3";
transcribeFile(filePath);