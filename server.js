const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io').listen(server);


var players = [];
const connections = [];
var playerConnections = [];
var current_turn = 0;
let timeOut;
var turn = 1;
const MAX_WAITING = 40000;

// create route
app.use('/', express.static('assets'))

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/assets/index.html');
});

function next_turn() {
    console.log("player length", players.length);
    //console.log("The next turn", current_turn++);
    turn = (current_turn++) % players.length;
    console.log("Function Turn passed", turn);

    playerConnections[turn].emit('your turn');
    console.log("next turn triggered ", turn);
    triggerTimeout();
}

function triggerTimeout() {
    timeOut = setTimeout(() => {
        if(playerConnections == 2)
            playerConnections[turn].emit("nudge");
    }, MAX_WAITING);
}

function resetTimeOut() {
    if (typeof timeOut === 'object') {
        console.log("timeout reset");
        clearTimeout(timeOut);
    }
}

io.on("connection", function (socket) {

    connections.push(socket);
    console.log("Connected: %s sockets connected", connections.length);

    socket.on('pass turn', function () {
        console.log("Turn passed");
        if (playerConnections[turn] == socket) {
            console.log("Really Turn passed");
            resetTimeOut();
            next_turn();
        }

    });

    socket.on("check turn", function () {
        console.log(playerConnections[turn] == socket);
        socket.emit("turn type", playerConnections[turn] == socket);
    });

    // socket.on("player capacity", function () {
    //     socket.emit("capacity",players.length);
    // });

    socket.on("finish", function(){
        player = (socket.username == players[1]) ? 0 : 1;
        playerConnections[player].emit('exit');

        playerConnections.splice(players.indexOf(socket.username), 1);
        players.splice(players.indexOf(socket.username), 1);
        
       
    });

    // Disconnect
    socket.on("disconnect", function (data) {
       

        playerConnections.splice(players.indexOf(socket.username), 1);
        players.splice(players.indexOf(socket.username), 1);
        console.log(players.length);
        //updateUsernames();
        connections.splice(connections.indexOf(socket), 1);

      

        console.log("Disconnected players: %s sockets connected", playerConnections.length);
        console.log("Disconnected: %s sockets connected", connections.length);
    });

    // Send message
    socket.on("send message", function (data) {
        console.log(data);
        io.sockets.emit("new message", { msg: data, user: socket.username });
    });

    // Player capacity
    socket.on("player capacity", function (callback) {
        if (players.length == 2)
            callback(true);
        else
            callback(false);
        // socket.emit("capacity", players.length);
    });

    // New user
    socket.on("new user", function (data, callback) {

        callback(true);
        socket.username = data;
        players.push(socket.username);
        playerConnections.push(socket);
        updateUsernames();
        console.log(players);
        // console.log(playerConnections);
        console.log("Connected p0layes: %s sockets connected", playerConnections.length);
    });

    // Update opponent's board
    socket.on("update opponent", function (data) {
        id = data.id;

        player = (socket.username == players[1]) ? 0 : 1;

        playerConnections[player].emit("update board", { id: data.id, opacity: data.opacity });

    });

    socket.on("guess", function (data) {
        player = (socket.username == players[1]) ? 0 : 1;
        win = false;
        console.log("Server: " + data);
        playerConnections[player].emit("compare", data, function (callback) {
            console.log("Callback: " + callback);
            if (!callback){
                playerConnections[player].emit("win or lose", true);
                player = (player == 1) ? 0 : 1;
                playerConnections[player].emit("win or lose", false);

            }
            else{
                playerConnections[player].emit("win or lose", false);
                player = (player == 1) ? 0 : 1;
                playerConnections[player].emit("win or lose", true);
            }
        
            playerConnections = [];
            players= [];
                
            //     win = true;
        });

        // if (win)
        //     callback(true);
        // else
        //     callback(false);

    });

    function updateUsernames() {
        io.sockets.emit("get users", players);
    }

    function resetGame(){

    }

});

server.listen(process.env.PORT || 3000);
console.log("Server running....");
