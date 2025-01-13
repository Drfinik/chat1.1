const socket = new WebSocket('ws://localhost:8080');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const chatContainer = document.querySelector(".chat-container");
const userRecipient = document.getElementById("user-recipient");

let userId = null;
let userName = null;

socket.addEventListener('open', () => {
    console.log("Connected to WebSocket");
});

socket.addEventListener('message', (event) => {
    try {
        const message = JSON.parse(event.data);

        switch (message.type) {
            case "register_success":
            case "login_success":
                loginForm.classList.add('hidden');
                registerForm.classList.add('hidden');
                chatContainer.classList.remove('hidden');
                userId = message.userId;
                userName = message.name;
                console.log("Login success: ", userName);
                break;
            case 'message':
                displayMessage(message);
                break;
            case 'history':
                message.messages.forEach(message => displayMessage(message));
                break;
            case 'error':
                console.error("Error message:", message.message);
                break;
            case "userList":
                updateUserList(message.users);
                break;
            default:
                console.log("Received unknown message:", message);
                break;
        }
    } catch (e) {
        console.error("Error parsing message", e);
    }
});

sendButton.addEventListener('click', () => {
    const messageText = messageInput.value;
    if (messageText.trim()) {
         const recipient = userRecipient.value;
          socket.send(JSON.stringify({ type: 'message', text: messageText, recipient: recipient }));
        messageInput.value = '';
    }
});

function displayMessage(message) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message-item');
    const recipientText = message.recipient === "all" ? "" : ` (Private to user ${message.recipient})`;
    messageDiv.innerHTML = `<span class="user-id">${message.name}:</span> ${message.text}  ${recipientText}<span class="timestamp">${new Date(message.timestamp).toLocaleTimeString()}</span>`;
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function updateUserList(users) {
  userRecipient.innerHTML = '<option value="all">Все</option>';
  users.forEach(user => {
      if (user.userId !== userId) {
          const option = document.createElement('option');
          option.value = user.userId;
          option.textContent = user.name;
          userRecipient.appendChild(option);
      }
    })
}

// LOGIN
loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const loginName = document.getElementById('loginName').value;
    const loginPassword = document.getElementById('loginPassword').value;

    socket.send(JSON.stringify({ type: 'login', name: loginName, password: loginPassword }));
});

// REGISTRATION
registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const registerName = document.getElementById('registerName').value;
    const registerPassword = document.getElementById('registerPassword').value;

    socket.send(JSON.stringify({ type: 'register', name: registerName, password: registerPassword }));
});