let websocket;
let audioContext;
let workletNode;

const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusElement = document.getElementById('status');
const transcriptionElement = document.getElementById('transcription');
const translationElement = document.getElementById('translation');

async function startRecording() {
    try {
        // Connect WebSocket
        websocket = new WebSocket('ws://localhost:4000');
        
        websocket.onopen = () => {
            // Send language preference to server
            websocket.send(JSON.stringify({
                type: 'language',
                direction: languageDirection.value
            }));
            console.log('WebSocket opened');
            updateStatus('Connected and ready to record');
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received data from server:', data);
            
            if (data.error) {
                updateStatus(`Error: ${data.error}`);
                return;
            }
            
            // Update transcription
            if (data.transcription) {
                console.log('Displaying transcription:', data.transcription);
                transcriptionElement.textContent = data.transcription;
                transcriptionElement.style.backgroundColor = data.isFinal ? '#f5f5f5' : '#e8f5e9';
            }
            
            // Update translation if available
            if (data.translation) {
                console.log('Displaying translation:', data.translation);
                translationElement.textContent = data.translation;
            }
        };

        // Get audio stream with specific constraints
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 1,
                sampleRate: 16000,
                sampleSize: 16,
                volume: 1.0
            }
        });
        
        console.log('Audio stream created:', stream.getAudioTracks()[0].getSettings());
        updateStatus('Recording...');
        
        audioContext = new AudioContext({
            sampleRate: 16000,
            latencyHint: 'interactive'
        });
        
        const source = audioContext.createMediaStreamSource(stream);
        console.log('Audio context sample rate:', audioContext.sampleRate);

        // Load the audio worklet
        await audioContext.audioWorklet.addModule('audio-processor.js');
        workletNode = new AudioWorkletNode(audioContext, 'audio-processor');
        
        workletNode.port.onmessage = (event) => {
            if (websocket.readyState === WebSocket.OPEN) {
                console.log('Sending audio data of size:', event.data.byteLength);
                websocket.send(event.data);
            }
        };

        // Connect the audio nodes
        source.connect(workletNode);
        workletNode.connect(audioContext.destination);

        startBtn.disabled = true;
        stopBtn.disabled = false;

    } catch (error) {
        console.error('Error:', error);
        updateStatus('Error: ' + error.message);
    }
}

function stopRecording() {
    if (workletNode) {
        workletNode.disconnect();
        audioContext.close();
    }
    if (websocket) {
        websocket.close();
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
    updateStatus('Stopped recording');
}

function updateStatus(message) {
    statusElement.textContent = message;
    console.log('Status:', message);
}

startBtn.onclick = startRecording;
stopBtn.onclick = stopRecording;

document.addEventListener('DOMContentLoaded', () => {
    const enButton = document.getElementById('enButton');
    const esButton = document.getElementById('esButton');

    function setLanguage(lang) {
        if (lang === 'en') {
            // English content
            document.getElementById('source-language-text').textContent = "To use the Real-Time Translation feature, you can either type text into the input box or click the \"Speak\" button to provide a voice input. Once you're ready, click the \"Translate\" button to see the translation.";
            document.getElementById('translated-text').textContent = "Your translation will appear here...";
            document.getElementById('how-it-works-title').textContent = "How MedTrans Works";
            document.getElementById('how-it-works-description').textContent = "MedTrans provides real-time spoken translation between English and Spanish. It helps healthcare providers and patients communicate clearly, ensuring better healthcare outcomes and smoother interactions.";
            document.getElementById("how-to-begin-title").textContent = "How To Begin";
            document.getElementById('about-title').textContent = "About";
            document.getElementById('about-description').textContent = "MedTrans provides fast and accurate real-time translation services, helping individuals and healthcare entities break language barriers effortlessly.";
            document.getElementById('service-title').textContent = "Service";
            document.getElementById('service-description').textContent = "Real-time text and voice translation.";
            document.getElementById('contact-title').textContent = "Contract";
            document.getElementById('contact-description').textContent = "For inquiries or technical support please reach out to us at MedTrans.org or at 1-800-788-9878";

            // Update button styles
            enButton.classList.add('lang-btn-active');
            esButton.classList.remove('lang-btn-active');
        } else {
            // Spanish content
            document.getElementById("startBtn").textContent = "Empezar";
            document.getElementById("get-started-btn").textContent = "Empezar";
            document.getElementById("stopBtn").textContent = "Parar";
            document.getElementById("home").textContent = "Hogar";
            document.getElementById("trans").textContent = "Translator";
            document.getElementById("services").textContent = "Servicios";
            document.getElementById("about").textContent = "Sobre";
            document.getElementById("contact").textContent = "Contacto";

            document.getElementById('how-it-works-title').textContent = "Cómo funciona MedTrans";
            document.getElementById('how-it-works-description').textContent = "MedTrans ofrece traducción en tiempo real entre inglés y español. Ayuda a los proveedores de atención médica y a los pacientes a comunicarse claramente, lo que garantiza mejores resultados en la atención médica y una interacción más fluida.";
            document.getElementById("how-to-begin-title").textContent = "Cómo empezar";
            document.getElementById("source-language-text").textContent = "Para usar la función de traducción en tiempo real, primero seleccione su tipo de traducción: Español a inglés o inglés a español. Luego presione Iniciar grabación y hable en su micrófono. Cuando termine de hablar, presione Detener grabación y vea su traducción en vivo."
            document.getElementById("translator").textContent = "Traducción de voz en tiempo real";
            document.getElementById('about-title').textContent = "Acerca de";
            document.getElementById('about-description').textContent = "MedTrans proporciona servicios de traducción en tiempo real rápidos y precisos, ayudando a las personas y entidades de atención médica a romper barreras idiomáticas sin esfuerzo.";
            document.getElementById('service-title').textContent = "Servicio";
            document.getElementById('service-description').textContent = "Traducción en tiempo real de voz.";
            document.getElementById('contact-title').textContent = "Contrato";
            document.getElementById('contact-description').textContent = "Para consultas o soporte técnico, comuníquese con nosotros en MedTrans.org o al 1-800-788-9878";

            // Update button styles
            esButton.classList.add('lang-btn-active');
            enButton.classList.remove('lang-btn-active');
        }
    }

    // Add click event listeners
    enButton.addEventListener('click', () => setLanguage('en'));
    esButton.addEventListener('click', () => setLanguage('es'));

    // Set initial language
    setLanguage('en');
});