const { log, isAllowedOrigin } = require("./utilities");
const WebSocketServer = require("websocket").server;
const express = require("express");
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const app = express();

app.use(express.static(path.join(__dirname + '/public/')));
app.use((req, res, next) => {
  res.append('Access-Control-Allow-Origin', ['*']);
  res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.append('Access-Control-Allow-Headers', 'Content-Type');
  next();
});


const http = require("http").createServer(app);

const server = app.listen(3000, () => {
  log("Express Server has started successfully");
});

var wssServer = new WebSocketServer({
  httpServer: http,
  autoAcceptConnections: false,
});

http.listen(8080, function () {
  log("HTTP Server is listening on port 8080");
});

// Sever Setup Over

// stores all of the connection objects
let connections = [],
  userIDs = [];

wssServer.on("request", (req) => {
  if (!isAllowedOrigin(req.origin)) {
    req.reject();
    log(`Connection from ${req.origin} rejected.`);
    return;
  }
  var connection = req.accept("json", req.origin);
  log(`Connection accepted from ${connection.remoteAddress}.`);
  connections.push(connection);

  let userId = uuidv4();
  connection.clientID = userId;
  userIDs.push(userId);

  let res = {
    type: "id",
    date: Date.now(),
    id: connection.clientID,
  };
  connection.sendUTF(JSON.stringify(res));

  connection.on('message', function (message) {
    if (message.type === 'utf8') {
      log("Received Message: ", message.utf8Data);
      var sendToAll = false;
      let msg = JSON.parse(message.utf8Data);
      const client = to().id(msg.id);

      switch (msg.type) {
        case "message":
          msg.name = client.connection.username;
          msg.text = msg.text.replace(/(<([^>]+)>)/ig, "");
          break;
        case "username":
          if (!isUsernameAvailable(msg.name)) {
            return client.send({
              type: "rejectusername",
              id: msg.id,
              date: new Date(),
              name: msg.name
            });
          }
          client.connection.username = msg.name;
          client.send({
            type: "username",
            id: msg.id,
            date: Date.now(),
            name: msg.name
          });
          to().all().send({
            type: "userList",
            date: Date.now(),
            users: getUsernames()
          });
          sendToAll = true;
          break;
      }
      if (!sendToAll) {
        if (msg.target &&
          msg.target !== undefined &&
          msg.target.length > 0
        ) { to().username(msg.target).send(msg); }
        else { to().all().send(msg); }
      }
    }
  });

  connection.on('close', function (reason, description) {
    connections = connections.filter((el) => el.connected);

    to().all().send({
      type: "userList",
      date: Date.now(),
      users: getUsernames()
    });

    var logMessage = `Connection closed: ${connection.remoteAddress} ( ${reason}`;
    if (description !== null && description.length > 0) {
      logMessage += `: ${description}`;
    }
    logMessage += " )";
    log(logMessage);
  });
});

function isUsernameAvailable(name) {
  return connections.every((i) => i.username !== name);
}

function to() {
  function username(name) {
    let matches = connections.filter(item => item.username == name);
    if (matches.length == 0) { return null; }
    else { return { connection: matches[0], send: (data) => { matches[0].sendUTF(JSON.stringify(data)) } }; }
  }
  function id(id) {
    let matches = connections.filter(item => item.clientID == id);
    if (matches.length == 0) { return null; }
    else { return { connection: matches[0], send: (data) => { matches[0].sendUTF(JSON.stringify(data)) } }; }
  }
  function all() {
    return {
      connections,
      send: (data) => {
        connections.forEach(item => {
          item.sendUTF(JSON.stringify(data))
        })
      }
    };
  }
  return { username, id, all };
}
function getUsernames() {
  let names = [];
  connections.forEach(item => names.push(item.username));
  return names;
}

// app.get("/", (req, res) => {
//   res.status(200).send("Hello World!");
// })
