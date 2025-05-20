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
    const msg: IMessageProtocol = JSON.parse(event.data);
    console.log(msg);
    if (msg.type == 'init') {
      userId = msg.userId;
      tableId = msg.tableId!;
      position = msg.position!;
      return;
    }
    if (msg.type == 'join') {
      // if (userId! != msg.userId) {
      // } else {
      (document.querySelector('#table-count') as HTMLParagraphElement).innerHTML = `<div class="display-6">Welcome to Table ${msg.tableId}</div>`;
      // }
      showOnlineUsers(msg.userList!, msg.position, msg.userName);

      return;
    }
    if (msg.type == 'disc') {
      (document.querySelector('.p' + msg.position) as HTMLDivElement).classList.add("d-none");
      return;
    }
    if (msg.type == 'ready') {
      document.querySelectorAll('#readyUp').forEach((btn: any) => {
        btn.classList.add('d-none');
      })
      if ((msg.userList!.length > 2 && msg.dealer! + 1 == position) || (msg.userList!.length < 3 && msg.dealer == position)) {
        bet(msg.bet! / 2, true);
        myBet = msg.bet! / 2;
        (document.querySelector('.p' + (position)) as HTMLDivElement).children[2].innerHTML = myBet.toString();
      } else if ((msg.userList!.length > 2 && msg.dealer! + 2 == position) || (msg.userList!.length < 3 && msg.dealer! + 1 == position)) {
        bet(msg.bet!, true);
        myBet = msg.bet!;
        // TODO - be kell írni
        // dealer pozíciót máshogy kell számolni
      }
      return;
    }
    if (msg.type == 'upnext') {
      btnDiv.classList.remove('d-none');
      btnDiv.innerHTML = '';
      showBets(msg.userList!);
      document.querySelectorAll('.profile').forEach(pX => {
        let idPos: string = pX.className
        if (Number(idPos[1]) == msg.position) {
          (pX as HTMLImageElement).style.filter = 'brightness(1.5)';
        } else {
          (pX as HTMLImageElement).style.filter = 'brightness(1)';
        }
      });
      if (msg.position == position) {
        startTimer();
        (document.querySelector('#action-btnsMainDiv') as HTMLDivElement).classList.remove('d-none');
        if (msg.runningBet! > 0) {
          // match runningBet or raise runningBet by at least 2x the blind

          const callBtn = document.createElement('button');
          callBtn.className = 'btn w-100 my-1 me-2';
          callBtn.id = "call-btn";
          callBtn.textContent = "Call";

          const raiseBtn = document.createElement('button');
          raiseBtn.className = 'btn w-100 my-1 me-2';
          raiseBtn.id = 'raise-btn';
          raiseBtn.textContent = 'Raise';

          betAmount.min = String(msg.runningBet);
          betAmount.value = String(msg.runningBet);

          const allinBTN = document.createElement('button');
          allinBTN.className = 'btn w-50 my-1 ms-1';
          allinBTN.id = 'allin-btn';
          allinBTN.textContent = 'All In';
          // TODO -- alllinBtn eventlistener -- player balance required
          let prevAllIn = (document.querySelector('#allin-btn') as HTMLDivElement);
          if (prevAllIn != null) {
            prevAllIn.remove();
          }
          (document.querySelector('#betField') as HTMLDivElement).append(allinBTN);

          callBtn.addEventListener('click', () => {
            bet(msg.runningBet! - myBet);
            betAmount.classList.add('d-none');
            console.log('call');
            timerOn = false;

          });

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
          const betBtn = document.createElement('button');
          betBtn.className = 'btn w-100 my-1 me-2';
          betBtn.id = 'bet-btn';
          betBtn.textContent = 'Bet';
          btnDiv.append(betBtn);

          const checkBtn = document.createElement('button');
          checkBtn.className = 'btn w-100 my-1 me-2';
          checkBtn.id = 'check-btn';
          checkBtn.textContent = 'Check';
          btnDiv.append(checkBtn);
        }
        betAmount.classList.remove('d-none');
        const foldBtn = document.createElement('button');
        foldBtn.className = 'btn w-100 my-1 me-2';
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
      const firstCard: string = msg.hand![0];
      const secondCard: string = msg.hand![1];
      (document.querySelector('#firstCard') as HTMLImageElement).src = `src/images/${firstCard[0]}/${firstCard}.png`;
      (document.querySelector('#secondCard') as HTMLImageElement).src = `src/images/${secondCard[0]}/${secondCard}.png`;
      console.log(msg.hand);
    }
  }

  ws.onclose = () => {
    disconnect();
  }
}

const showBets = (userList:{userId:number, userName:string, position:number, bet:number}[])=>{
  userList?.forEach(u => {
    let pX = (document.querySelector('.p' + (u.position)) as HTMLDivElement);
    (pX.children[2] as HTMLSpanElement).innerHTML = u.bet.toString();
    if (position == u.position) {
      (pX.children[2] as HTMLSpanElement).innerHTML = u.bet.toString();
    }
  });
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

const startTimer = async () => {
  let timer = document.querySelector('#timerBar') as HTMLDivElement;
  let timeLeft = 60;
  timer.classList.remove('d-none');
  timerOn = true;
  let thisInterval = setInterval(() => {
    if (timerOn && timeLeft > 1) {
      timeLeft--;
      timer.innerText = `${timeLeft.toString()}s`;
      timer.style.width = `${timeLeft / 60 * 100}%`;
      if (timeLeft <= 10) {
        if (timeLeft % 2 == 0) timer.style.background = "red";
        else timer.style.background = "gold";
      }
    } else {
      if (timeLeft < 2) {
        fold();
      }
      timer.innerHTML = "";
      timer.classList.add('d-none');
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
  timerOn = false;

  (document.querySelector('.p' + (msg.userId - 1)) as HTMLDivElement).classList.add('d-none');
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
    let pX = (document.querySelector('.p' + (u.position)) as HTMLDivElement);
    pX.classList.remove('d-none');
    (pX.children[1] as HTMLSpanElement).innerHTML = u.userName;
    if (position == u.position) {
      (pX.children[1] as HTMLSpanElement).innerHTML = userName;
    }
  });
}

(document.querySelector('#login') as HTMLButtonElement).addEventListener('click', (e) => {
  e.preventDefault()
  let name = (document.querySelector('#name') as HTMLInputElement);
  if (name.value == "") {
    name.classList.add('is-invalid');
  } else {
    connect();
    name.classList.remove('is-invalid');
  }
});

(document.querySelector('#readyUp') as HTMLButtonElement).addEventListener('click', () => {
  ready();
});

(document.querySelector('#logout') as HTMLButtonElement).addEventListener('click', () => {
  disconnect();
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