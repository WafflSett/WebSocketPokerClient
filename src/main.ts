import './style.css'
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import IMessageProtocol from './IMessageProtocol';

let ws: WebSocket;
let userId: number;
let userName: string;
let stream = document.querySelector('#stream');
// let users : {userId:number, userName:string}[] = [];
let tableId: number;
let position: number;

const connect = () => {
  ws = new WebSocket('ws://localhost:8081');

  ws.onopen = () => {
    userName = (document.querySelector('#name') as HTMLInputElement).value;

    console.log('Connected to server!');
    const msg: IMessageProtocol = {
      type: 'init',
      userId: 0,
      userName: userName,
      text: ''
    }
    ws.send(JSON.stringify(msg));


    (document.querySelector('#table') as HTMLDivElement).classList.remove('d-none');
    (document.querySelector('#navForm') as HTMLInputElement).classList.remove('d-none');
    (document.querySelector('#username') as HTMLInputElement).innerHTML = userName;
    (document.querySelector('#loginContainer') as HTMLDivElement).classList.add('d-none');
  }

  ws.onmessage = (event) => {
    // console.log(event);
    const msg: IMessageProtocol = JSON.parse(event.data);
    console.log(msg);
    if (msg.type == 'init') {
      userId = msg.userId;
      tableId = msg.tableId!;
      position = msg.position!;
      stream!.innerHTML += `<div class="alert mb-1 p-1 alert-secondary">User ${userId} (You) has joined, @ position ${position}!</div>`;
      let usersGroupList = (document.querySelector('#users') as HTMLDivElement);
      msg.userList!.forEach(x => {
        usersGroupList.innerHTML += `<li class="list-group-item">${x.userName} ${(x.userId == userId ? '(You)' : '')} @ pos. ${x.position}</li>`
      })
      return;
    }
    if (msg.type == 'join') {
      if (userId! != msg.userId) {
        stream!.innerHTML += `<div class="alert mb-1 p-1 alert-secondary">${msg.userName} (User ${msg.userId}) has joined, @ position ${msg.position}!</div>`;
        (document.querySelector('#users') as HTMLDivElement).innerHTML += `<li class="list-group-item">${msg.userName} @ pos. ${msg.position}</li>`
      } else {
        (document.querySelector('#table-count') as HTMLParagraphElement).innerHTML = `<div class="display-6">Welcome to Table ${msg.tableId}</div>`;
      }
      return;
    }
    if (msg.type == 'disc') {
      stream!.innerHTML += '<div class="alert mb-1 p-1 alert-secondary">' + msg.userName + ' (User ' + msg.userId + ') has disconnected!</div>'
      return;
    }
    if (msg.type == 'ready') {
      stream!.innerHTML += '<div class="alert mb-1 p-1 alert-warning">Table started by user! dealer: ' + (msg.dealer == position ? 'you' : '@ pos. ' + msg.dealer) + '</div>'
      if ((msg.userList!.length > 2 && msg.dealer! + 1 == position) || (msg.userList!.length < 3 && msg.dealer == position)) {
        stream!.innerHTML += `<div class="alert mb-1 p-1 alert-warning">You are the small blind, you bet 500</div>`
      } else if ((msg.userList!.length > 2 && msg.dealer! + 2 == position) || (msg.userList!.length < 3 && msg.dealer! + 1 == position)) {
        stream!.innerHTML += `<div class="alert mb-1 p-1 alert-warning">You are the big blind, you bet 1000</div>`
      }
      return;
    }
    if (msg.type == 'upnext') {
      if (msg.position == position) {
        stream!.innerHTML += `<div class="alert mb-1 p-1 alert-info">It's your turn, choose your action!</div>`
      }
    }
  }
  ws.onclose = () => {
    disconnect();
  }


}

const disconnect = () => {
  const msg: IMessageProtocol = {
    type: 'disc',
    userId: userId!,
    userName: userName
  }
  ws.send(JSON.stringify(msg));
  ws.close = () => {
    console.log('Disconnected from server');

  };
  (document.querySelector('#table') as HTMLDivElement).classList.add('d-none');
  (document.querySelector('#navForm') as HTMLInputElement).classList.add('d-none');
  (document.querySelector('#loginContainer') as HTMLDivElement).classList.remove('d-none');
}


const ready = () => {
  const msg: IMessageProtocol = {
    type: 'ready',
    userId: userId!
  }
  ws.send(JSON.stringify(msg));
}

(document.querySelector('#login') as HTMLButtonElement).addEventListener('click', (e) => {
  e.preventDefault()
  if ((document.querySelector('#name') as HTMLInputElement).value == "") {
    (document.querySelector('#name') as HTMLInputElement).classList.add('is-invalid');
  } else {
    connect();
    (document.querySelector('#name') as HTMLInputElement).classList.remove('is-invalid');
  }
});

(document.querySelector('#readyUp') as HTMLButtonElement).addEventListener('click', () => {
  ready();
});

(document.querySelector('#logout') as HTMLButtonElement).addEventListener('click', () => {
  disconnect();
  stream!.innerHTML = "";
});

// const send = ()=>{
//   const msg : IMessageProtocol = {
//     type:'text',
//     userId:userId!,
//     userName:userName,
//     text:(document.querySelector('#message') as HTMLInputElement).value
//   }
//   ws.send(JSON.stringify(msg));
// }
// (document.querySelector('#send') as HTMLButtonElement).addEventListener('click', (e)=>{
//   e.preventDefault();
//   let text = (document.querySelector('#message') as HTMLInputElement);
//   if (text.value != "") {
//     send();
//   }
//   text.value = "";
// });

window.onbeforeunload = function (e) {
  if (ws != null) {
    // UNCOMMENT ON RELEASE
    // // frontend hiba, amikor uncommentelve van
    // e.preventDefault();
    disconnect();
  }
};

