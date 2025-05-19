import './style.css'
import './background.scss'
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import IMessageProtocol from './IMessageProtocol';

let ws: WebSocket;
let userId: number;
let userName: string;
// let stream = document.querySelector('#stream');
// let users : {userId:number, userName:string}[] = [];
let tableId: number;
let position: number;
let btnDiv = (document.querySelector('#action-btns') as HTMLDivElement);
let betAmount: HTMLInputElement = (document.querySelector('#bet-amount') as HTMLInputElement);
let myBet: number = 0;
let timerOn = false;

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
      // stream!.innerHTML += `<div class="alert mb-1 p-1 alert-secondary">User ${userId} (You) has joined, @ position ${position}!</div>`;
      // let usersGroupList = (document.querySelector('#users') as HTMLDivElement);
      // msg.userList!.forEach(x => {
      //   usersGroupList.innerHTML += `<li class="list-group-item">${x.userName} ${(x.userId == userId ? '(You)' : '')} @ pos. ${x.position}</li>`
      // })

      // if (msg.position != undefined) {
      //   showOnlineUsers(msg.userList!, msg.position, msg.userName);
      // }
      return;
    }
    if (msg.type == 'join') {
      // if (userId! != msg.userId) {
      //   // stream!.innerHTML += `<div class="alert mb-1 p-1 alert-secondary">${msg.userName} (User ${msg.userId}) has joined, @ position ${msg.position}!</div>`;
      //   // (document.querySelector('#users') as HTMLDivElement).innerHTML += `<li class="list-group-item">${msg.userName} @ pos. ${msg.position}</li>`
      // } else {
      (document.querySelector('#table-count') as HTMLParagraphElement).innerHTML = `<div class="display-6">Welcome to Table ${msg.tableId}</div>`;
      // }

      if (msg.position != undefined) {
        showOnlineUsers(msg.userList!, msg.position, msg.userName);
      }

      return;
    }
    if (msg.type == 'disc') {
      // stream!.innerHTML += '<div class="alert mb-1 p-1 alert-secondary">' + msg.userName + ' (User ' + msg.userId + ') has disconnected!</div>';
      // console.log(msg.position);
      (document.querySelector('.p' + msg.position) as HTMLDivElement).classList.add("d-none");
      // console.log((document.querySelector('.p' + msg.position) as HTMLDivElement));

      return;
    }
    if (msg.type == 'ready') {
      document.querySelectorAll('#readyUp').forEach((btn: any) => {
        btn.classList.add('d-none');
      })
      // stream!.innerHTML += '<div class="alert mb-1 p-1 alert-warning">Table started by user! dealer: ' + (msg.dealer == position ? 'you' : '@ pos. ' + msg.dealer) + '</div>'
      if ((msg.userList!.length > 2 && msg.dealer! + 1 == position) || (msg.userList!.length < 3 && msg.dealer == position)) {
        // stream!.innerHTML += `<div class="alert mb-1 p-1 alert-warning">You are the small blind, you bet ${msg.bet! / 2}</div>`
        bet(msg.bet! / 2, true);
        myBet = msg.bet! / 2;
      } else if ((msg.userList!.length > 2 && msg.dealer! + 2 == position) || (msg.userList!.length < 3 && msg.dealer! + 1 == position)) {
        // stream!.innerHTML += `<div class="alert mb-1 p-1 alert-warning">You are the big blind, you bet ${msg.bet!}</div>`
        bet(msg.bet!, true);
        myBet = msg.bet!;
      }
      return;
    }
    if (msg.type == 'upnext') {
      btnDiv.classList.remove('d-none');
      btnDiv.innerHTML = '';
      if (msg.position == position) {
        startTimer();
        // stream!.innerHTML += `<div class="alert mb-1 p-1 alert-info">It's your turn, choose your action! Pot: ${msg.pot}  Running bet: ${msg.runningBet}</div>`;
        (document.querySelector('#action-btnsMainDiv') as HTMLDivElement).classList.remove('d-none');
        if (msg.runningBet! > 0) {
          // match runningBet or raise runningBet by at least 2x the blind

          // btnDiv.innerHTML += '<button class="btn btn-warning w-25 me-2" id="call-btn">Call</button>' // call current running bet
          const callBtn = document.createElement('button');
          callBtn.className = "btn btn-warning w-100 me-2";
          callBtn.id = "call-btn";
          callBtn.textContent = "Call";

          // btnDiv.innerHTML += '<button class="btn btn-secondary w-25 me-2" id="raise-btn">Raise</button>'; // raise current running bet
          const raiseBtn = document.createElement('button');
          raiseBtn.className = 'btn btn-secondary w-100 me-2';
          raiseBtn.id = 'raise-btn';
          raiseBtn.textContent = 'Raise';

          betAmount.min = String(msg.runningBet);
          betAmount.value = String(msg.runningBet);

          // (document.querySelector('#call-btn') as HTMLButtonElement).addEventListener('click', () => { bet(msg.runningBet! - myBet); console.log('call'); });
          callBtn.addEventListener('click', () => {
            bet(msg.runningBet! - myBet);
            betAmount.classList.add('d-none');
            console.log('call');
            timerOn = false;

          });

          // (document.querySelector('#raise-btn') as HTMLButtonElement).addEventListener('click', () => { bet(Number(betAmount.value!)); console.log('raise'); });
          raiseBtn.addEventListener('click', () => {
            bet(Number(betAmount.value!));
            betAmount.classList.add('d-none');
            console.log('raise');
            timerOn = false;

          });

          btnDiv.appendChild(callBtn);
          btnDiv.appendChild(raiseBtn);
        } else {
          // set new runningBet or pass
          // btnDiv.innerHTML += '<button class="btn btn-success w-25 me-2" id="bet-btn">Bet</button>' // set a starting bet (after flops only)
          const betBtn = document.createElement('button');
          betBtn.className = 'btn btn-success w-100 me-2';
          betBtn.id = 'bet-btn';
          betBtn.textContent = 'Bet';
          btnDiv.append(betBtn);

          // btnDiv.innerHTML += '<button class="btn btn-primary w-25 me-2" id="check-btn">Check</button>' // basically pass button
          const checkBtn = document.createElement('button');
          checkBtn.className = 'btn btn-primary w-100 me-2';
          checkBtn.id = 'check-btn';
          checkBtn.textContent = 'Check';
          btnDiv.append(checkBtn);
        }
        betAmount.classList.remove('d-none');
        // btnDiv.innerHTML += '<button class="btn btn-danger w-25 me-2" id="fold-btn">Fold</button>'; // surrender hand
        const foldBtn = document.createElement('button');
        foldBtn.className = 'btn btn-danger w-100 me-2';
        foldBtn.id = 'fold-btn';
        foldBtn.textContent = 'Fold';
        btnDiv.append(foldBtn);

        foldBtn.addEventListener('click', () => {
          betAmount.classList.add('d-none');
          timerOn = false;
          fold()
        });
      } else {
        (document.querySelector('#action-btnsMainDiv') as HTMLDivElement).classList.add('d-none');
        betAmount.classList.add('d-none');
      }
    }
    if (msg.type == 'hand') {
      (document.querySelector('#cards') as HTMLDivElement).classList.remove('d-none');
      // stream!.innerHTML += `<div class="alert mb-1 p-1 alert-info">Your cards are: ${msg.hand}</div>`;
      console.log(msg.hand);
    }
  }

  ws.onclose = () => {
    disconnect();
  }
}

const fold = () => {
  const msg: IMessageProtocol = {
    type: 'fold',
    userId: userId!,
    userName: userName
  }
  ws.send(JSON.stringify(msg));
}

const bet = (amount: number, blind?: boolean) => {
  const msg: IMessageProtocol = {
    type: (blind ? 'blind' : 'bet'),
    userId: userId!,
    userName: userName,
    bet: amount
  }
  ws.send(JSON.stringify(msg));
}

const startTimer = async ()=>{
  let timer = document.querySelector('#timer') as HTMLDivElement;
  let timeLeft = 60;
  timerOn = true;
  let thisInterval = setInterval(() => {
    if (timerOn && timeLeft>0) {
      timeLeft--
      timer.innerHTML = timeLeft.toString();
    }else{
      timer.innerHTML = "";
      clearInterval(thisInterval);
    }
  }, 1000);
}

const disconnect = () => {
  const msg: IMessageProtocol = {
    type: 'disc',
    userId: userId!,
    userName: userName,
    position: position
  }
  ws.send(JSON.stringify(msg));
  ws.close = () => {
    console.log('Disconnected from server');

  };
  // console.log("asd");

  // console.log(msg);
  // console.log("asd");


  (document.querySelector('.p' + (msg.userId - 1)) as HTMLDivElement).classList.add('d-none');
  // stream!.innerHTML = '';
  // (document.querySelector('#users') as HTMLDivElement).innerHTML = '';
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

const showOnlineUsers = (userList: { position: number, userName: string }[], position: any, userName: any) => {
  document.querySelectorAll('#profile').forEach(p => {
    p.classList.add('d-none');
  });
  userList?.forEach(u => {
    (document.querySelector('.p' + (u.position)) as HTMLDivElement).classList.remove('d-none');
    ((document.querySelector('.p' + (u.position)) as HTMLDivElement).lastElementChild as HTMLSpanElement).innerHTML = u.userName;
    if (position == u.position) {
      ((document.querySelector('.p' + (u.position)) as HTMLDivElement).lastElementChild as HTMLSpanElement).innerHTML = userName;
    }
  });
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
  // stream!.innerHTML = "";
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
    // akkor is disconnectel ha nemet nyomsz..
    // bandi3028: meglesz
    // e.preventDefault();
    disconnect();
  }
};

