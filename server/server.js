const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const users = new Map(); // {userId: websocketConnection, name: userName}
const usersInfo = new Map(); // {userName: {userId, password}} // хранилище пользователей
const messages = [];

wss.on('connection', (ws) => {
    let userId = null; // Идентификатор пользователя
    let userName = null; // Имя пользователя

    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);

            switch(parsedMessage.type) {
                case 'register':
                registerUser(ws, parsedMessage.name, parsedMessage.password);
                break;
              case 'login':
                loginUser(ws, parsedMessage.name, parsedMessage.password);
                break;
                case 'message':
                if (!userId) {
                  ws.send(JSON.stringify({type: 'error', message: 'User is not logged in'}));
                    return;
                }
                    const newMessage = {
                        userId,
                        name: userName,
                        text: parsedMessage.text,
                        timestamp: new Date(),
                    };
                    messages.push(newMessage);

                    // Рассылаем сообщение всем подключенным пользователям
                    users.forEach((client) => {
                        if (client.userId !== userId) { // Отправляем всем кроме отправителя
                            client.ws.send(JSON.stringify({ type: 'message', ...newMessage }));
                        }
                    });
                    ws.send(JSON.stringify({ type: 'message', ...newMessage })); // Отправляем отправителю для подтверждения
                  break;
                default:
                ws.send(JSON.stringify({type: 'error', message: 'Unknown message type'}));
                break;
            }

        } catch (e) {
            console.error("Error parsing message", e);
            ws.send(JSON.stringify({ type: "error", message: "Error parsing message."}));
        }
    });

    ws.on('close', () => {
        console.log(`User ${userId} disconnected`);
        if (userId) {
          users.delete(userId);
        }
    });

    ws.on('error', (error) => {
        console.error("WebSocket error", error);
        if (userId) {
           users.delete(userId);
        }
    });

    function registerUser(ws, name, password) {
        if (usersInfo.has(name)) {
            ws.send(JSON.stringify({ type: 'error', message: 'Username is already taken.' }));
            return;
        }

        const newUserId = Date.now();
        usersInfo.set(name, {userId: newUserId, password});
        users.set(newUserId, {ws, userId: newUserId, name});
        userId = newUserId;
        userName = name;

        console.log(`User ${name} registered with ID: ${userId}`);
        ws.send(JSON.stringify({ type: 'register_success', userId: newUserId, name }));
        ws.send(JSON.stringify({ type: "history", messages })); // Send history on login
    }

    function loginUser(ws, name, password) {
        const userInfo = usersInfo.get(name);
        if (!userInfo || userInfo.password !== password) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid username or password.' }));
            return;
        }

        users.set(userInfo.userId, {ws, userId: userInfo.userId, name});
        userId = userInfo.userId;
        userName = name;
        
        console.log(`User ${name} logged in with ID: ${userId}`);
        ws.send(JSON.stringify({ type: 'login_success', userId, name }));
        ws.send(JSON.stringify({ type: "history", messages })); // Send history on login
    }
});


console.log("WebSocket Server started on port 8080");