import './style.css'
import './background.scss'
import '../node_modules/bootstrap/dist/css/bootstrap.min.css';
import IMessageProtocol from './IMessageProtocol';

let ws: WebSocket | null;
let userId: number;
let userName: string;
// let users : {userId:number, userName:string}[] = [];
let tableId: number;
let position: number;
let waitingMessage = document.querySelector('#waitingMessage') as HTMLParagraphElement;
let potP = document.querySelector('#pot') as HTMLParagraphElement;
let btnDiv = (document.querySelector('#action-btns') as HTMLDivElement);
let betAmount: HTMLInputElement = (document.querySelector('#bet-amount') as HTMLInputElement);
let waitingForReady = (document.querySelector("#waitingForReady") as HTMLParagraphElement)
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
    ws!.send(JSON.stringify(msg));


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
      (document.querySelector('#table') as HTMLDivElement).classList.remove('d-none');
      (document.querySelector('#main') as HTMLDivElement).classList.remove('d-none');
      (document.querySelector('#table-count') as HTMLParagraphElement).innerHTML = `<div class="display-6">Welcome to Table ${msg.tableId}</div>`;
      // if (msg.ready != null) {
      //   waitingForReady.classList.remove("d-none");
      //   waitingForReady.innerHTML = `${msg.ready}/${msg.balance} players are ready`;
      // }
      showOnlineUsers(msg.userList!, msg.position, msg.userName);
      return;
    }
    if (msg.type == 'disc') {
      (document.querySelector('#p' + msg.position) as HTMLDivElement).classList.add("d-none");
      return;
    }
    if (msg.type == 'start') {
      document.querySelectorAll('#readyUp').forEach((btn: any) => {
        btn.classList.add('d-none');
      })
      if (msg.sBlind == position) {
        bet(msg.bet! / 2, true);
        myBet = msg.bet! / 2;
      } else if (msg.bBlind == position) {
        bet(msg.bet!, true);
        myBet = msg.bet!;
      }
      // console.log((document.querySelector('#betAmount' + (msg.sBlind)) as HTMLSpanElement));
      // console.log((document.querySelector('#betAmount' + (msg.bBlind)) as HTMLSpanElement));

      (document.querySelector('#betAmount' + (msg.sBlind)) as HTMLSpanElement).innerHTML = (msg.bet! / 2).toString();
      (document.querySelector('#betAmount' + (msg.bBlind)) as HTMLSpanElement).innerHTML = (msg.bet!).toString();
      return;
    }
    if (msg.type == 'ready') {
      console.log(`Ready: ${msg.ready}/${msg.balance} players are ready`);
      waitingForReady.classList.remove("d-none");
      waitingForReady.innerHTML = `${msg.ready}/${msg.balance} players are ready`;
    }
    if (msg.type == 'upnext') {
      potP.innerHTML = `${msg.pot} Ft`
      clearBTNs();
      btnDiv.innerHTML = '';
      document.querySelectorAll('.playerPicture').forEach(pX => {
        let idPos: string = pX.parentElement!.id;
        if (Number(idPos[1]) == msg.position) {
          (pX as HTMLImageElement).style.filter = 'brightness(1)';
        } else {
          (pX as HTMLImageElement).style.filter = 'brightness(.45)';
        }
      });
      if (msg.position == position) {
        (document.querySelector('#balanceDiv') as HTMLDivElement).classList.remove("d-none");
        (document.querySelector('#balance') as HTMLParagraphElement).innerHTML = `${msg.balance} Ft`;
        btnDiv.classList.remove('d-none');
        startTimer();
        (document.querySelector('#action-btnsMainDiv') as HTMLDivElement).classList.remove('d-none');
        if (msg.runningBet! > 0) {
          // match runningBet or raise runningBet by at least 2x the blind

          const callBtn = document.createElement('button');
          callBtn.className = 'btn w-50 my-1 ms-1';
          callBtn.id = "call-btn";
          callBtn.textContent = "Call";

          callBtn.addEventListener('click', () => {
            bet(msg.runningBet! - myBet);
            myBet = msg.runningBet! - myBet;
            betAmount.classList.add('d-none');
            console.log('call');
            timerOn = false;
            clearBTNs();
          });
          (document.querySelector('#betField') as HTMLDivElement).append(callBtn);

          const raiseBtn = document.createElement('button');
          raiseBtn.className = 'btn w-100 my-1 me-2';
          raiseBtn.id = 'raise-btn';
          raiseBtn.textContent = 'Raise';

          raiseBtn.addEventListener('click', () => {
            bet(Number(betAmount.value!));
            myBet = Number(betAmount.value);
            betAmount.classList.add('d-none');
            console.log('raise');
            timerOn = false;
            clearBTNs();
          });
          btnDiv.appendChild(raiseBtn);

          betAmount.min = String(msg.runningBet);
          betAmount.value = String(msg.runningBet);

          const allinBTN = document.createElement('button');
          allinBTN.className = 'btn w-100 my-1 me-2';
          allinBTN.id = 'allin-btn';
          allinBTN.textContent = 'All In';
          btnDiv.appendChild(allinBTN);
          // TODO -- alllinBtn eventlistener -- player balance required
          // let prevCall = (document.querySelector('#call-btn') as HTMLDivElement);
          // if (prevCall != null) {
          //   prevCall.remove();
          // }



        } else {
          // set new runningBet or pass
          betAmount.min = String(msg.runningBet);
          betAmount.value = String(msg.runningBet);

          const betBtn = document.createElement('button');
          betBtn.className = 'btn w-100 my-1 me-2';
          betBtn.id = 'bet-btn';
          betBtn.textContent = 'Bet';
          btnDiv.append(betBtn);

          betBtn.addEventListener('click', () => {
            bet(Number(betAmount.value!));
            myBet = Number(betAmount.value!);
            betAmount.classList.add('d-none');
            console.log('bet');
            timerOn = false;
            clearBTNs();
          });

          const checkBtn = document.createElement('button');
          checkBtn.className = 'btn w-100 my-1 me-2';
          checkBtn.id = 'check-btn';
          checkBtn.textContent = 'Check';
          btnDiv.append(checkBtn);

          checkBtn.addEventListener('click', () => {
            timerOn = false;
            check();
            clearBTNs();
          })
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
          clearBTNs();
        });
      } else {
        (document.querySelector('#action-btnsMainDiv') as HTMLDivElement).classList.add('d-none');
        betAmount.classList.add('d-none');
        clearBTNs();
      }
    }
    if (msg.type == 'hand') {
      (document.querySelector('#cards') as HTMLDivElement).classList.remove('d-none');
      const firstCard: string = msg.hand![0];
      const secondCard: string = msg.hand![1];
      (document.querySelector('#firstCard') as HTMLImageElement).src = `src/images/${firstCard[0]}/${firstCard}.png`;
      (document.querySelector('#secondCard') as HTMLImageElement).src = `src/images/${secondCard[0]}/${secondCard}.png`;
    }

    if (msg.type == 'roundend') {
      document.querySelectorAll(".betAmount").forEach(span => {
        span.innerHTML = "0";
      });
      myBet = 0;
      let communityCards = document.querySelector('#communityCards') as HTMLDivElement;
      communityCards!.innerHTML = "";
      console.log(msg);
      msg.hand!.forEach(c => {
        let card = document.createElement('img');
        card.src = `src/images/${c[0]}/${c}.png`;
        card.style.float = 'left';
        if (msg.hand!.length == 3) {
          card.style.width = `${(100 / 3).toString()}%`;
        } else if (msg.hand!.length == 4) {
          card.style.width = `${(100 / 4).toString()}%`;
          communityCards!.style.width = '60%';
        } else {
          card.style.width = `${(100 / 5).toString()}%`;
          communityCards!.style.width = '70%';
        }
        communityCards!.append(card);
      });
      timerOn = false;
      //reset timer
      //clear buttons
      clearBTNs();
    }
  }

  ws.onclose = () => {
    disconnect();
  }
}

const clearBTNs = () => {
  btnDiv.innerHTML = "";
  (document.querySelector('#balanceDiv') as HTMLDivElement).classList.add("d-none");
  let prevCall = (document.querySelector('#call-btn') as HTMLDivElement);
  if (prevCall != null) {
    prevCall.remove();
  }
}

const fold = () => {
  const msg: IMessageProtocol = {
    type: 'fold',
    userId: userId!,
    userName: userName
  }
  ws!.send(JSON.stringify(msg));
}

const check = () => {
  const msg: IMessageProtocol = {
    type: 'check',
    userId: userId!,
    userName: userName
  }
  ws!.send(JSON.stringify(msg));
}

const bet = (amount: number, blind?: boolean) => {
  const msg: IMessageProtocol = {
    type: (blind ? 'blind' : 'bet'),
    userId: userId!,
    userName: userName,
    bet: amount
  }
  ws!.send(JSON.stringify(msg));
}

const startTimer = async () => {
  let timer = document.querySelector('#timerBar') as HTMLDivElement;
  timer.style.transition = '1s';
  let timeLeft = 120;
  timer.classList.remove('d-none');
  timerOn = true;
  let thisInterval = setInterval(() => {
    if (timerOn && timeLeft > 1) {
      timeLeft--;
      timer.innerText = `${Math.round(timeLeft / 2).toString()}s`;
      timer.style.width = `${(timeLeft / 120 * 90) + 10}%`;
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
  }, 500);
}

const disconnect = () => {
  if (ws != null) {
    console.log(ws);

    const msg: IMessageProtocol = {
      type: 'disc',
      userId: userId!,
      userName: userName,
      position: position
    }
    ws!.send(JSON.stringify(msg));
    console.log('Disconnected from server');
    ws = null;
    timerOn = false;

    (document.querySelector('#p' + (msg.userId - 1)) as HTMLDivElement).classList.add('d-none');
    (document.querySelector('#table') as HTMLDivElement).classList.add('d-none');
    (document.querySelector('#navForm') as HTMLInputElement).classList.add('d-none');
    (document.querySelector('#loginContainer') as HTMLDivElement).classList.remove('d-none');
  }
}

const ready = () => {
  const msg: IMessageProtocol = {
    type: 'ready',
    userId: userId!
  }
  ws!.send(JSON.stringify(msg));
}
const unready = () => {
  const msg: IMessageProtocol = {
    type: 'unready',
    userId: userId!
  }
  ws!.send(JSON.stringify(msg));
}

const showOnlineUsers = (userList: { position: number, userName: string }[], position: any, userName: any) => {
  document.querySelectorAll('.profile').forEach(p => {
    p.classList.add('d-none');
  });
  userList?.forEach(u => {
    let pX = (document.querySelector('#p' + (u.position)) as HTMLDivElement);
    pX.classList.remove('d-none');
    (pX.children[1] as HTMLSpanElement).innerHTML = u.userName;
    if (position == u.position) {
      (pX.children[1] as HTMLSpanElement).innerHTML = userName;
    }
  });
}

const createProfiles = () => {
  let tableContainer = document.querySelector('.table-container')
  for (let i = 0; i < 10; i++) {
    let div = document.createElement('div');
    div.id = `p${i}`;
    div.className = 'profile d-none'

    let img = document.createElement('img');
    img.className = img.alt = 'playerPicture';
    img.src = 'src/images/profilepicture.png';

    let spanName = document.createElement('span');
    spanName.className = 'displayedUName';

    let spanBet = document.createElement('span');
    spanBet.className = 'betAmount';
    spanBet.id = `betAmount${i}`;

    div.append(img);
    div.append(spanName);
    div.append(spanBet);

    tableContainer?.append(div);
  }
}
createProfiles();

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

let readyBtn = (document.querySelector('#readyUp') as HTMLButtonElement);
let unreadyBtn = (document.querySelector('#unready') as HTMLButtonElement);
readyBtn.addEventListener('click', () => {
  unreadyBtn.classList.remove("d-none");
  readyBtn.classList.add("d-none");
  ready();
});
unreadyBtn.addEventListener('click', () => {
  readyBtn.classList.remove("d-none");
  unreadyBtn.classList.add("d-none");
  unready();
});

(document.querySelector('#logout') as HTMLButtonElement).addEventListener('click', () => {
  disconnect();
});

const smallWindow = () => {
  let login = document.querySelector('#loginContainer') as HTMLDivElement;
  let waiting = document.querySelector('#waitingMessages') as HTMLDivElement;
  let main = document.querySelector('#main') as HTMLDivElement;
  let windowSizeAlert = document.querySelector('#windowSizeAlert') as HTMLDivElement;
  if ((window.innerWidth < 1700 || window.outerWidth < 1600) || (window.innerHeight < 800 || window.outerHeight < 800)) {
    if (ws != null) {
      disconnect();
    }
    waiting.classList.add('d-none');
    main.classList.add('d-none');
    windowSizeAlert.classList.remove('d-none');
    (document.querySelector('#loginContainer') as HTMLDivElement).classList.add('d-none');
  } else {
    if (ws == null) {
      login.classList.remove('d-none');
    }
    windowSizeAlert.classList.add('d-none');
  }
}
smallWindow();
window.onresize = () => {
  smallWindow()
}
window.addEventListener("fullscreenchange", () => {
  smallWindow();
})

window.onbeforeunload = function (e) {
  if (ws != null) {
    // UNCOMMENT ON RELEASE
    // akkor is disconnectel ha nemet nyomsz..
    // bandi3028: meglesz
    // e.preventDefault();
    disconnect();
  }
};