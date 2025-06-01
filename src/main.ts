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
let myBalance: number;

const connect = () => {
  ws = new WebSocket('https://h6pxmxukad.eu-central-1.awsapprunner.com:8080');

  ws.onopen = () => {
    userName = (document.querySelector('#name') as HTMLInputElement).value;

    console.log('Connected to server!');
    const msg: IMessageProtocol = {
      type: 'init',
      userId: -1,
      userName: userName
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
      myBalance = msg.balance!;

      (document.querySelector('#table') as HTMLDivElement).classList.remove('d-none');
      (document.querySelector('#main') as HTMLDivElement).classList.remove('d-none');
      (document.querySelector('#table-count') as HTMLParagraphElement).innerHTML = `<div class="display-6">Welcome to Table ${msg.tableId}</div>`;
      return;
    }
    if (msg.type == 'join') {
      if (msg.inProgress == true) {
        console.log("match already in progress, please wait");
      }
      showOnlineUsers(msg.userList!);
      return;
    }
    if (msg.type == 'disc') {
      (document.querySelector('#p' + msg.position) as HTMLDivElement).classList.add("d-none");
      return;
    }
    if (msg.type == 'start') {
      (document.querySelector('#balanceDiv') as HTMLDivElement).classList.remove("d-none");
      document.querySelectorAll('.ready-btns').forEach((btn: any) => {
        btn.classList.add('d-none');
      })
      waitingForReady.classList.add("d-none");
      if (msg.sBlind == position) {
        bet(msg.bet! / 2, true);
        myBet = msg.bet! / 2;
        updateBalance();

      } else if (msg.bBlind == position) {
        bet(msg.bet!, true);
        myBet = msg.bet!;
        updateBalance();

      }
      (document.querySelector('#betAmount' + (msg.sBlind)) as HTMLSpanElement).innerHTML = (msg.bet! / 2).toString();
      (document.querySelector('#betAmount' + (msg.bBlind)) as HTMLSpanElement).innerHTML = (msg.bet!).toString();
      return;
    }
    if (msg.type == 'blind') {
      displayBets(msg.userList!);
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
          if (Number(idPos[1]) == position) {
            (pX as HTMLImageElement).style.filter = 'sepia(100%) saturate(300%) brightness(80%) hue-rotate(180deg)';
          } else {
            (pX as HTMLImageElement).style.filter = 'brightness(1)';
          }
        } else {
          if (Number(idPos[1]) == position) {
            (pX as HTMLImageElement).style.filter = 'sepia(100%) saturate(300%) brightness(45%) hue-rotate(180deg)';
          } else {
            (pX as HTMLImageElement).style.filter = 'brightness(.45)';
          }
        }
      });
      displayBets(msg.userList!);
      if (msg.position == position) {
        (document.querySelector('#balance') as HTMLParagraphElement).innerHTML = `${myBalance} Ft`;
        btnDiv.classList.remove('d-none');
        startTimer();
        (document.querySelector('#action-btnsMainDiv') as HTMLDivElement).classList.remove('d-none');
        if (msg.runningBet! > 0) {
          // match runningBet or raise runningBet by at least 2x the blind
          const callBtn = document.createElement('button');
          callBtn.className = 'btn w-100 my-1 ms-1';
          callBtn.id = "call-btn";
          callBtn.textContent = "Call";

          callBtn.addEventListener('click', () => {
            if (myBalance<=0 || myBalance-(msg.runningBet! - myBet)>=0) {
              bet(msg.runningBet! - myBet);
              myBet = msg.runningBet! - myBet;
              console.log('call');
              timerOn = false;
              updateBalance();
              clearBTNs();
            }
          });
          btnDiv.appendChild(callBtn);

          const raiseBtn = document.createElement('button');
          raiseBtn.className = 'btn w-50 my-1 me-2';
          raiseBtn.id = 'raise-btn';
          raiseBtn.textContent = 'Raise';

          raiseBtn.addEventListener('click', () => {
            if (myBalance>0 && Number(betAmount.value!) > msg.runningBet! && myBalance-Number(betAmount.value!)>=0) {
              bet(Number(betAmount.value!));
              myBet = Number(betAmount.value);
              console.log('raise');
              timerOn = false;
              updateBalance();
              clearBTNs();
            }
          });
          if (myBalance<=0) {
            raiseBtn.classList.add('disabledbtn');
          }
          (document.querySelector('#betField') as HTMLDivElement).append(raiseBtn);

          betAmount.min = String(msg.runningBet);
          betAmount.value = String(msg.runningBet);

        } else {
          // set new runningBet or pass
          betAmount.min = String(msg.runningBet);
          betAmount.value = String(msg.runningBet);

          const betBtn = document.createElement('button');
          betBtn.className = 'btn w-50 my-1 me-2';
          betBtn.id = 'bet-btn';
          betBtn.textContent = 'Bet';

          betBtn.addEventListener('click', () => {
            if (myBalance>0 && Number(betAmount.value!) > 0 && myBalance-Number(betAmount.value!)>=0) {
              bet(Number(betAmount.value!));
              myBet = Number(betAmount.value!);
              console.log('bet');
              timerOn = false;
              updateBalance();
              clearBTNs();
            }
          });
          if (myBalance<=0) {
            betBtn.classList.add('disabledbtn');
          }
          (document.querySelector('#betField') as HTMLDivElement).append(betBtn);

          const checkBtn = document.createElement('button');
          checkBtn.className = 'btn w-100 my-1 me-2';
          checkBtn.id = 'check-btn';
          checkBtn.textContent = 'Check';

          checkBtn.addEventListener('click', () => {
            timerOn = false;
            check();
            clearBTNs();
          })
          btnDiv.append(checkBtn);
        }

        const allinBTN = document.createElement('button');
        allinBTN.className = 'btn w-100 my-1 me-2';
        allinBTN.id = 'allin-btn';
        allinBTN.textContent = 'All In';
        allinBTN.addEventListener('click', () => {
          if (myBalance>0) {
            allIn();
            myBalance = 0;
            timerOn = false;
            (document.querySelector('#balance') as HTMLDivElement).innerHTML = "0 Ft";
            clearBTNs();
          }
        })
        if (myBalance<=0) {
          allinBTN.classList.add('disabledbtn');
        }
        btnDiv.appendChild(allinBTN);

        betAmount.classList.remove('d-none');
        const foldBtn = document.createElement('button');
        foldBtn.className = 'btn w-100 my-1 me-2';
        foldBtn.id = 'fold-btn';
        foldBtn.textContent = 'Fold';
        btnDiv.append(foldBtn);

        foldBtn.addEventListener('click', () => {
          timerOn = false;
          fold()
          clearBTNs();
        });
      } else {
        btnDiv.classList.add('d-none');
        // betAmount.classList.add('d-none');
        clearBTNs();
      }
      return;
    }
    if (msg.type == 'hand') {
      (document.querySelector('#cards') as HTMLDivElement).classList.remove('d-none');
      const firstCard: string = msg.hand![0];
      const secondCard: string = msg.hand![1];
      (document.querySelector('#firstCard') as HTMLImageElement).src = `src/images/${firstCard[0]}/${firstCard}.png`;
      (document.querySelector('#secondCard') as HTMLImageElement).src = `src/images/${secondCard[0]}/${secondCard}.png`;
      return;
    }
    if (msg.type == 'roundend') {
      document.querySelectorAll(".betAmount").forEach(span => {
        span.innerHTML = "0";
      });
      myBet = 0;
      let communityCards = document.querySelector('#communityCards') as HTMLDivElement;
      communityCards!.innerHTML = "";
      // console.log(msg);
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
      clearBTNs();
      return;
    }
    if (msg.type == 'win') {
      console.log(`CONGRATS! user (${msg.userName}) at ${msg.position} position won the game`);
      if (msg.position == position) {
        myBalance += msg.pot!;
      }
      (document.querySelector('#balance') as HTMLDivElement).innerHTML = `${myBalance} Ft`;
      sdProfileCreater(msg);
      setTimeout(() => {
        (document.querySelector('#showdownWindow') as HTMLDivElement).classList.add("d-none");
        console.log("asd");
        reset();
        showOnlineUsers(msg.userList!);
        // (document.querySelector('#alert') as HTMLDivElement).innerHTML = `alert for debugging: ${msg.userName}@${msg.position} won the game!`;
      }, 7500);
    }
  }

  ws.onclose = () => {
    disconnect();
  }
}

const updateBalance = () => {
  myBalance -= myBet;
  (document.querySelector('#balance') as HTMLParagraphElement).innerHTML = `${myBalance} Ft`;
}

const clearBTNs = () => {
  btnDiv.innerHTML = "";
  betAmount.classList.add('d-none');
  // (document.querySelector('#balanceDiv') as HTMLDivElement).classList.add("d-none");
  let prevRaise = (document.querySelector('#raise-btn') as HTMLDivElement);
  if (prevRaise != null) {
    prevRaise.remove();
  }
  prevRaise = (document.querySelector('#bet-btn') as HTMLDivElement);
  if (prevRaise != null) {
    prevRaise.remove();
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

const allIn = () => {
  const msg: IMessageProtocol = {
    type: 'allin',
    userId: userId!
  }
  ws!.send(JSON.stringify(msg));
}

const startTimer = async () => {
  timerOn = false;
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
    userId = -1;
    userName = "";
    myBalance = 0;
    (document.querySelector('#balanceDiv') as HTMLDivElement).classList.add("d-none");
    (document.querySelector('#table') as HTMLDivElement).classList.add('d-none');
    (document.querySelector('#navForm') as HTMLInputElement).classList.add('d-none');
    (document.querySelector('#loginContainer') as HTMLDivElement).classList.remove('d-none');
    reset();
  }
}

const ready = () => {
  const msg: IMessageProtocol = {
    type: 'ready',
    userId: userId!
  }
  ws!.send(JSON.stringify(msg));
}

const showOnlineUsers = (userList: { position: number, userName: string }[]) => {
  document.querySelectorAll('.profile').forEach(p => {
    p.classList.add('d-none');
  });
  userList?.forEach(u => {
    let pX = (document.querySelector('#p' + (u.position)) as HTMLDivElement);
    pX.classList.remove('d-none');
    (pX.children[1] as HTMLSpanElement).innerHTML = u.userName;
    if (position == u.position) {
      pX.classList.add('heyitsme');
    }
  });
}

const displayBets = (userlist: { position: number, userName: string, bet: number }[]) => {
  userlist.forEach(user => {
    (document.querySelector(`#betAmount${user.position}`) as HTMLSpanElement).innerHTML = user.bet.toString();
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

const sdProfileCreater = (msg:any) => {
  let pot = msg.pot;
  let userList = msg.userList;
  (document.querySelector('#showdownWindow') as HTMLDivElement).classList.remove("d-none");
  let sdProfiles = (document.querySelector('#sdProfiles') as HTMLDivElement);
  sdProfiles.innerHTML = "";
  userList.forEach((user: any) => {
    sdProfiles.innerHTML +=
      `
      <div class="col-4">
        <div class="sdProfile pb-3 ps-2" id="sdP${user.position}" ${msg.position == user.position ? 'style="background-color: rgba(50, 32, 216, 0.781);"' : ''}>
          <div class="row">

            <div class="col-4 d-flex align-items-center">
              <span class="display-6">${user.userName}</span>
            </div>

            <div class="col-4">
              <div class="w-100 pt-3 d-flex align-items-center" id="cards">
                <img id="firstCard" src="src/images/${user.hand[0][0]}/${user.hand[0]}.png" class="w-50 h-50" style="float: left; transform: rotate(-20deg); transform: translate(10%);" alt="">
                <img id="secondCard" src="src/images/${user.hand[1][0]}/${user.hand[1]}.png" class="w-50 h-50" style="transform: rotate(20deg) translate(-10%);" alt="">
              </div>
            </div>

            <div class="col-4 d-flex align-items-center">
              <div class="${msg.position == user.position ? '' : 'd-none'} my-auto h-50">
                <p style="font-size: 1.5rem; margin-bottom: 0;">Winner</p>
                <p>+${pot}</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;
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
  ready();
});

const reset = () => {
  timerOn = false;
  clearBTNs();
  (document.querySelector('#balanceDiv') as HTMLDivElement).classList.add("d-none");
  readyBtn.classList.remove('d-none');
  betAmount.classList.add('d-none');
  (document.querySelector('#cards') as HTMLDivElement).classList.add('d-none');
  (document.querySelector('#firstCard') as HTMLImageElement).src = "";
  (document.querySelector('#secondCard') as HTMLImageElement).src = "";
  (document.querySelector('.table-container') as HTMLDivElement).innerHTML = `<img src="src/images/table.png" class="table-image" alt="table"><p id="pot"></p><div id="communityCards"></div>`;
  potP = document.querySelector('#pot') as HTMLParagraphElement;
  createProfiles();
}

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

window.onbeforeunload = function () {
  if (ws != null) {
    disconnect();
  }
};