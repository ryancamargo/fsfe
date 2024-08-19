const express = require('express');
const server = require('http').createServer();
const app = express();

app.get('/', function(req, res) {
    res.sendFile('index.html', {root: __dirname});
});

server.on('request', app);
server.listen(3000, function() { console.log('server started on port 3000'); });

// use a process listener to catch the signal interrupt (CTRL+C) to close server and db connection
process.on('SIGINT', () => {
    console.log('sigint');
    
    // go through every single websocket connection, close it, and then close the server, and then shutdonw the database
    wss.clients.forEach(function each(client) {
        client.close();
    });

    server.close(() => {
        shutdownDB();
    });
});

/* Begin websocket */
const WebSocketServer = require('ws').Server;

const wss = new WebSocketServer({server: server});

wss.on('connection', function connection(ws) {
    const numClients = wss.clients.size;
    console.log('Clients connected', numClients);

    wss.broadcast(`Current visitors: ${numClients}`);

    if (ws.readyState === ws.OPEN) {
        ws.send('Welcome to my server');
    }

    // writing to the database
    db.run(`INSERT INTO visitors (count, time)
        VALUES (${numClients}, datetime('now'))
    `);

    ws.on('close', function close() {
        wss.broadcast(`Current visitors: ${numClients}`);
        console.log('A client has disconnected');
    });

});

wss.broadcast = function broadcast(data) {
    wss.clients.forEach(function each(client) {
        client.send(data);
    });
}

/* end websockets */
/* begin database */
const sqlite = require('sqlite3');
/*  it will write to memory directly ... to write to a file => './fsfe.db' */
const db = new sqlite.Database(':memory:');   

// ensure the database is setup before running any queries
db.serialize(() => { 
    // using db.run() to write SQL
    db.run(`
        CREATE TABLE visitors (
            count INTEGER,
            time TEXT
        )
    `);
});

// short hand function so that don't have to repeat SQL queries over and over
function getCounts() {
    // to get the output of every single row
    db.each("SELECT * FROM visitors", (err, row) => {
        console.log(row);
    });
}

// since this example uses memory, the database will reset whenever the server stops
// everytime we use a database we need to close it by the time the servers are all done
// we never wanna leave a database connection opened
function shutdownDB() {
    getCounts();
    console.log("Shutting down db");
    db.close();
}
