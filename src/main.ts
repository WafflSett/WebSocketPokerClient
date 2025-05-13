import './style.css'
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import IMessageProtocol from './IMessageProtocol';

let ws : WebSocket;
let userId : number;
let userName : string;
let stream = document.querySelector('#stream');
let users : {userId:number, userName:string}[] = [];
let tableId : number;
let position : number;

const connect = ()=>{
  ws = new WebSocket('ws://localhost:8081');
  
  ws.onopen = ()=>{
    userName = (document.querySelector('#name') as HTMLInputElement).value
    console.log('Connected to server!');
    const msg : IMessageProtocol = {
      type:'init',
      userId:0,
      userName: userName,
      text:''
    }
    ws.send(JSON.stringify(msg));
  }

  ws.onmessage = (event)=>{
    // console.log(event);
    const msg : IMessageProtocol = JSON.parse(event.data);
    console.log(msg);
    if (msg.type == 'init') {
      userId = msg.userId;
      tableId = msg.tableId!;
      position = msg.position!;
      stream!.innerHTML+='<div class="alert mb-1 p-1 alert-secondary">User '+userId+' (You) has joined!</div>';
      return;
    }
    if (msg.type == 'join') {
      if (userId! != msg.userId) {
        stream!.innerHTML+='<div class="alert mb-1 p-1 alert-secondary">'+msg.userName+' (User '+msg.userId+') has joined!</div>';
      }
      return;
    }
    if (msg.type == 'text') {
      stream!.innerHTML+='<div class="alert mb-1 p-1 alert-'+(msg.userId==userId!?"primary":"info")+'">'+msg.userName+': '+msg.text+'</div>'
      return;
    }
    if (msg.type == 'disced') {
      stream!.innerHTML+='<div class="alert mb-1 p-1 alert-secondary">'+msg.userName+' (User '+msg.userId+') has disconnected!</div>'
      return;
    }
    if (msg.type == 'userlist') {
      // console.log(msg.userList);
      users = msg.userList!;
      console.log(users);
      const select = document.querySelector('#userSelect') as HTMLSelectElement;
      users.forEach(u=>{
        if (u.userId != userId) { 
          const option = document.createElement('option');
          option.value = u.userId.toString();
          option.innerText = u.userName;
          select.append(option);
        }
      })
      return;
    }
    if (msg.type == 'start') {
      stream!.innerHTML+='<div class="alert mb-1 p-1 alert-warning">Table started by user! dealer: '+(msg.dealer==position?'you':'position '+msg.dealer)+'</div>'
      return;
    }
  }

  (document.querySelector('#table') as HTMLDivElement).classList.remove('d-none');
  (document.querySelector('#logout') as HTMLDivElement).classList.remove('d-none');
  (document.querySelector('#login') as HTMLDivElement).classList.add('d-none');
}

const disconnect = ()=>{
  const msg : IMessageProtocol = {
    type:'disc',
    userId:userId!,
    userName:userName
  }
  ws.send(JSON.stringify(msg));
  ws.close = () => {
    console.log('Disconnected from server');
    
  };
  (document.querySelector('#table') as HTMLDivElement).classList.add('d-none');
  (document.querySelector('#logout') as HTMLDivElement).classList.add('d-none');
  (document.querySelector('#login') as HTMLDivElement).classList.remove('d-none');

}

const ready = ()=>{
  const msg : IMessageProtocol = {
    type:'ready',
    userId:userId!
  }
  ws.send(JSON.stringify(msg));
}

(document.querySelector('#login') as HTMLButtonElement).addEventListener('click', ()=>{
  connect();
});

(document.querySelector('#readyUp') as HTMLButtonElement).addEventListener('click', ()=>{
  ready();
});

(document.querySelector('#logout') as HTMLButtonElement).addEventListener('click', ()=>{
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
  if (ws!=null) {
    // UNCOMMENT ON RELEASE
    // e.preventDefault();
    disconnect();
  }
};

