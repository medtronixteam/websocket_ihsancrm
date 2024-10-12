const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');


const app = express();

const server = http.createServer(app);

const io = socketIo(server);

//  middleware
app.use(bodyParser.json());


app.use(express.static('public'));


app.post('/api/pending/messages', (req, res) => {
    const message = req.body.message;
    const token = req.body.token;
    if (!message) {
        return res.status(400).send({ success: false, message: 'No message provided' });
    }
   // console.log('Received message via API:', message);
    // if(localStorage.getItem('token_'+token)){
    //  let dataArray= localStorage.getItem('token_'+token, message); 
    //  dataArray=JSON.parse(dataArray);
    //  dataArray.push(JSON.parse(message));
    //  localStorage.setItem('message', JSON.stringify(dataArray));
    // }else{
    //   localStorage.setItem('message', message); 
    // }

    emitDataInChunks(message,token);

    //send data to all connected clients
    //io.emit('pending_messages', message);


    res.status(200).send({ success: true, message: 'Message broadcasted' });
});
const emitDataInChunks = (data,token) => {
  //let data=JSON.parse(message);

  const uniqueData = removeDuplicates(data);
  console.log('unique data is ', uniqueData);
    let index = 0;
    const intervalId = setInterval(() => {
      if (index < uniqueData.length) {
        const chunk = uniqueData.slice(index, index +5);
        io.emit('pending_messages_'+token, chunk);
        index += 5;
        console.log('emmited data at token  ', token);
      } else {
        clearInterval(intervalId);
      }
    }, 5000); 
  };
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
