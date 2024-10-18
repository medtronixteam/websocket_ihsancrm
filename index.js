const express = require('express');
const http = require('http');
const axios = require('axios');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Map to store active intervals per token
const activeIntervals = {};

// Helper to get file path
const getFilePath = (token) => path.join(__dirname, `${token}.json`);

// Function to save data to JSON file
const saveToFile = (token, data) => {
  const filePath = getFilePath(token);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Function to load data from JSON file
const loadFromFile = (token) => {
  const filePath = getFilePath(token);
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath);
    return JSON.parse(fileContent);
  }
  return [];
};

// API to handle incoming messages
app.post('/api/pending/messages', (req, res) => {
  const message = req.body.message;
  const token = req.body.token;

  if (!message) {
    return res.status(400).send({ success: false, message: 'No message provided' });
  }

  // Load existing messages from the file
  let existingMessages = loadFromFile(token);

  // Append new messages and remove duplicates
  existingMessages = existingMessages.concat(message);
  const uniqueMessages = removeDuplicates(existingMessages);

  // Save the updated messages back to the file
  saveToFile(token, uniqueMessages);

  // Ensure only one interval is running per token
  if (!activeIntervals[token]) {
    io.emit('messages_info', uniqueMessages.length + " messages are in queue. ");
    emitDataInChunks(uniqueMessages, token);
  }



  res.status(200).send({ success: true, message: 'Message broadcasted' });
});

// Function to call external API
const callAPi = (token) => {
  const FormData = require('form-data');
  let data = new FormData();
  data.append('bot_token', token);

  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://webai.ihsancrm.com/api/sms/nj/socket',
    headers: {},
    data: data
  };

  axios.request(config)
    .then((response) => {
      io.emit('messages_info', " API called successfully ");
      console.log('API called successfully');
    })
    .catch((error) => {
      console.log('API call failed:', error);
    });
};

const emitDataInChunks = (data, token) => {
  const chunkSize = 5; // Size of the chunk
  activeIntervals[token] = setInterval(() => {
    if (data.length > 0) {
      const chunk = data.slice(0, chunkSize); // Get the first 5 messages
      io.emit('pending_messages_' + token, chunk);
      console.log('Emitted data for token:', token, chunk);

      // Remove emitted messages from data
      data.splice(0, chunkSize);
      io.emit('messages_info', "Emitted index"+chunk);
      console.log('Remaining messages:', data.length);
    } else {
      io.emit('messages_info', "Message loop has finished. Restarting again.");
    //  callAPi(token); // Optionally call an API after sending all messages
      clearInterval(activeIntervals[token]); // Clear the interval
      delete activeIntervals[token]; // Remove from activeIntervals map
    }
  }, 3000); // 3000ms interval for sending chunks
};


// Remove duplicate messages based on {id:}
const removeDuplicates = (array) => {
  const seen = new Set();
  return array.filter(item => {
    const duplicate = seen.has(item.id);
    seen.add(item.id);
    return !duplicate;
  });
};

// Listen for new connections on socket.io
io.on('connection', (socket) => {
  console.log('A user connected');

  // Handle user disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
