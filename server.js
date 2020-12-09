const { addUser, removeUser, getUser, getUsersInRoom } = require("./Users.js");

const {
  getAccount,
  createAccount,
  verifyAccountCreds,
  searchAccounts,
  searchMyFriends,
  addFriend,
} = require("./accounts.js");
const {
  createRoom,
  addMember,
  searchRoom,
  searchRoomMembers,
  searchMyRooms,
} = require("./rooms.js");

const express = require("express"),
  app = express(),
  bodyParser = require("body-parser");

// support parsing of application/json type post data
app.use(bodyParser.json());

//support parsing of application/x-www-form-urlencoded post data
app.use(bodyParser.urlencoded({ extended: true }));
const socketio = require("socket.io");

const http = require("http");

// const app = express();

const server = http.createServer(app);

var cors = require("cors");

app.use(cors()); // Use this after the variable declaration

//const io = socketio(server);
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
  },
});

const router = require("./router");
const { callbackify } = require("util");

const PORT = process.env.PORT || 5000;

app.listen(5001, () => {
  console.log("Server Listening on port 5001 hey lets go");
});

io.on("connection", (socket) => {
  socket.on("join", ({ name, room }) => {
    const user = addUser({ id: socket.id, name, room });

    socket.join(user.room);

    socket.emit("welcomeMessage", {
      user: "admin",
      text: `${user.name}, welcome to room ${user.room}.`,
    });

    socket.broadcast.to(user.room).emit("joinMessage", {
      user: "admin",
      text: `${user.name} has joined!`,
    });

    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });

    //callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit("message", { user: user.name, text: message });

    callback();
  });

  socket.on("change", (data) => {
    // const user = getUser(socket.id);
    console.log("trigger change video");

    socket.broadcast.to(data.room).emit("changeVideo", data.video);
  });

  socket.on("pause", (room) => {
    console.log(room);
    socket.broadcast.to(room).emit("pauseVideo", "pause video");
  });

  socket.on("play", (room) => {
    console.log(room);
    socket.broadcast.to(room).emit("playVideo", "play video");
  });

  socket.on("seek", (data) => {
    console.log("the room is ", data.room);
    console.log(data);

    console.log(data.seek);
    socket.broadcast.to(data.room).emit("seekVideo", data.seek);
  });

  socket.on("disconnect", () => {
    const user = removeUser(socket.id);

    if (user) {
      io.to(user.room).emit("message", {
        user: "admin",
        text: `${user.name} has left`,
      });
    }
  });
});

app.post("/create-account", function (req, res) {
  createAccount(req.body);
  res.send("success");
});

app.get("/sign-in", function (req, res) {
  console.log(req.query.username);
  const acct = verifyAccountCreds(req.query.username);
  console.log(acct);
  if (acct) {
    if (acct.password == req.query.password) {
      console.log("success");
      res.send(acct);
    } else {
      console.log("fail");
      res.send("fail");
    }
  } else {
    console.log("fail");
    res.send("fail");
  }
});

app.get("/search-users", function (req, res) {
  console.log(req.query.query);
  const accts = searchAccounts(req.query.query);
  console.log(accts);
  res.send(accts);
});

app.get("/search-room", function (req, res) {
  console.log(req.query.name);
  const room = searchRoom(req.query.name);
  res.send(room);
});

app.get("/search-roomMembers", function (req, res) {
  members = [];
  const roomMembers = searchRoomMembers(req.query.roomId);
  for (i = 0; i < roomMembers.length; i++) {
    const acct = getAccount(roomMembers[i].userId);
    members.push(acct);
  }
  console.log(members);
  res.send(members);
});

app.get("/search-myRooms", function (req, res) {
  const myRooms = searchMyRooms(req.query.userId);
  res.send(myRooms);
});

app.get("/search-myFriends", function (req, res) {
  const myFriends = searchMyFriends(req.query.userId);
  res.send(myFriends);
});

app.post("/create-room", function (req, res) {
  createRoom(req.body);
  res.send(req.body);
});

app.post("/add-member", function (req, res) {
  addMember(req.body.userId, req.body.roomId);
  res.send("sucess");
});

app.post("/add-friend", function (req, res) {
  addFriend(req.body.currUserId, req.body.userId);
  res.send("success");
});

app.use(router);
server.listen(PORT, () =>
  console.log("server has started on port! hey lets go: " + PORT)
);
