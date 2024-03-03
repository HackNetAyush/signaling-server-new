const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors");

const app = express();

const corsOptions = {
  origin: process.env.CORS_URLS || ["https://28dbc6cc-7430-48dd-9913-90c3edb98fea-00-28l8kzbxvcs6z.pike.replit.dev","http://localhost:5501","*","http://127.0.0.1:5501","http://192.168.1.10:5501"],
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_URLS || ["https://28dbc6cc-7430-48dd-9913-90c3edb98fea-00-28l8kzbxvcs6z.pike.replit.dev","http://localhost:5501","*","http://127.0.0.1:5501","http://192.168.1.10:5501"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

function remove(arr, elementToRemove) {
  const indexToRemove = arr.indexOf(elementToRemove);

  if (indexToRemove !== -1) {
    arr.splice(indexToRemove, 1);
  } else {
    console.log(`Element ${elementToRemove} not found in the array.`);
  }
}

function debugLog(message) {
  console.log('\x1b[31m%s\x1b[0m',`[DEBUG] ${message}`);
}

const socketRooms = {};
const allRooms = [];
const availableRoomsToJoin = [];
const fullRooms = [];

function getTotalUserCount() {
  var count_fullRooms = fullRooms.length;
  var count_availableRoomsToJoin = availableRoomsToJoin.length;
  var totalUserCount = count_availableRoomsToJoin + 2*count_fullRooms;
  var msg = "Total users: " + totalUserCount+"\n"+"AvailableRoomsToJoin: "+count_availableRoomsToJoin+ "\n"+"Full Rooms: "+count_fullRooms;
  debugLog(msg);
}

io.on("connection", (socket) => {

  socket.on("checkAvailableRooms",()=>{
    socket.emit("availableRooms",availableRoomsToJoin);
  });




  socket.on("joinRoom", (room) => {
    
    if (allRooms.includes(room)){
      getTotalUserCount();
      
      
      if (fullRooms.includes(room)){
        io.to(socket.id).emit("roomFull", room);
        
      } else if(availableRoomsToJoin.includes(room)){
        remove(availableRoomsToJoin, room);
        fullRooms.push(room)
        
        socket.join(room);
        socket.to(room).emit("userJoined", socket.id);
        io.to(room).emit("lastConnected");


        socketRooms[socket.id] = socketRooms[socket.id] || new Set();
        socketRooms[socket.id].add(room);

        socket.on("messageFromClient",(msg)=>{
          socket.to(room).emit("message", [socket.id,msg]);
        });

        socket.on('sendSDP', (room, sdp) => {
          console.log("Recieved SDP")
          socket.to(room).emit('receivedSDP', { from: socket.id, sdp: sdp });
        });

        socket.on('sendICE', (room, iceCandidate) => {
          console.log("Recieved ICE")
          socket.to(room).emit('receivedICE', { from: socket.id, iceCandidate: iceCandidate });
        });

      }
      
    } else {
      allRooms.push(room);
      availableRoomsToJoin.push(room);
      getTotalUserCount();
      
      
      socket.join(room);
      socket.to(room).emit("userJoined", socket.id);
      socketRooms[socket.id] = socketRooms[socket.id] || new Set();
      socketRooms[socket.id].add(room);

      socket.on("messageFromClient",(msg)=>{
        socket.to(room).emit("message", [socket.id,msg]);
      });

    }




    socket.on("disconnect", async () => {
      const rooms = socketRooms[socket.id] || new Set();

      rooms.forEach((room) => {
        io.to(room).emit("userDisconnected", socket.id);

        if (fullRooms.includes(room)){
          remove(fullRooms, room)
          availableRoomsToJoin.push(room)
          
        } else if(availableRoomsToJoin.includes(room)){
          remove(availableRoomsToJoin, room)
          remove(allRooms, room)

        }

      });

      delete socketRooms[socket.id];

    });

  });

  socket.on("lastUserConnected",(room)=>{
    socket.to(room).emit("startSharingSDPandICE")
  })

});

app.get("/",(req,res)=>{
  res.send(`<pre>Server is UP and Running 🚀<br>Made by HackNetAyush</pre>`)
})


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
