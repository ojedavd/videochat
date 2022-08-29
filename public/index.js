const socket = io.connect();
//"ws://localhost:5500"

let theUUID;
let peerConnection;
let localStream;
let otherUser;
let peerID;
let otherPeerID;

let form = document.getElementById("form");
let input = document.getElementById("input");
let theMessages = document.getElementById("messages");
let onlineCounter = document.querySelector("h3");

let joined = false;
let waitingOnConnection = false;
let videoOn;

const myPeer = new Peer();

socket.on("oc", (oc) => {
  onlineCounter.innerHTML = oc;
});

form.addEventListener("submit", function (e) {
  e.preventDefault();
  if (input.value && joined) {
    //if not blank
    let msg = input.value;
    socket.emit("message", msg);
    let item = document.createElement("li");
    item.innerHTML = "<span id='you'>Tú: </span>" + msg;
    messages.appendChild(item);
    input.value = ""; //clear
    theMessages.scrollTo(0, theMessages.scrollHeight);
  } else if (waitingOnConnection) {
    serverMsg("Esperando conexión");
  } else if (!joined) {
    serverMsg('Clic en "Siguiente"');
  } else {
    serverMsg("No puedes enviar un mensaje en blanco.");
  }
});

socket.on("message", function (msg, servermsg) {
  if (servermsg) {
    serverMsg(msg);
  } else {
    strangerMsg(msg);
  }
});

myPeer.on("open", (id) => {
  peerID = id;
});

socket.on("connect", () => {
  navigator.getUserMedia =
    navigator.getUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.msGetUserMedia;
  const constraints = {
    video: {
      width: {
        min: 480,
        max: 1280,
      },
      aspectRatio: 1.33333,
    },
    audio: true,
  };
  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      console.log("Got MediaStream:", stream);
      localStream = stream;
      document.getElementById("local-video").srcObject = localStream;
      if (!localStream.active) {
        videoOn = false;
        console.log("No Video!");
        serverMsg(
          "Cámara no detectada, actualice la página y verifique los permisos para utilizar la cámara"
        );
        localStream = {};
        console.log("localStream: " + localStream);
      } else {
        videoOn = true;
        console.log("Video is on");
      }
    })
    .catch((error) => {
      console.error("Error accessing media devices.", error);
      videoOn = false;
      console.log("No Video!");
      serverMsg(
        "Cámara no detectada, actualice la página y verifique los permisos para utilizar la cámara"
      );
    });
});

function joinRoom() {
  serverMsg("Conectando...");
  waitingOnConnection = true;
  joined = false;
  socket.emit("join room", peerID, videoOn);
  document.getElementById("remote-video").srcObject = undefined;
  myPeer.on("call", (call) => {
    call.answer(localStream);

    call.on("stream", (theStream) => {
      document.getElementById("remote-video").srcObject = theStream;
    });
  });
}

socket.on("user joined", (id, pid, vOn) => {
  //host
  otherPeerID = pid;
  console.log("User connected: " + id + " " + pid);
  socket.emit("send peerid", id, peerID);
  theMessages.innerHTML = "";
  try {
    connectToNewUser(pid, localStream);
  } catch (e) {
    console.log("Error connecting to User: " + e);
    serverMsg(
      "Problemas con la cámara, solo puede utilizar texto."
    );
    socket.emit(
      "message",
      "Problemas con la cámara, solo puede utilizar texto.",
      true
    );
  }
  serverMsg("Conexión establecida!");
  joined = true;
  waitingOnConnection = false;
  if (!vOn) {
    document.getElementById("vidoff").innerHTML = "El usuario no tiene video";
  }
  otherUser = id; //handshake
});
function connectToNewUser(pid, stream) {
  const call = myPeer.call(pid, stream);
  call.on("stream", (theStream) => {
    document.getElementById("remote-video").srcObject = theStream;
  });
}
socket.on("other user", (ou, vOn) => {
  theMessages.innerHTML = "";
  console.log("you joined: " + ou);
  joined = true;
  waitingOnConnection = false;
  serverMsg("Conexión establecida!");
  if (!vOn) {
    document.getElementById("vidoff").innerHTML = "El usuario no tiene video";
  }
  otherUser = ou;
});

socket.on("dc", (msg) => {
  console.log(msg);
  document.getElementById("remote-video").srcObject = undefined;
  joined = false;
  serverMsg('Usuario desconectado, clic en "Siguiente"');
  document.getElementById("vidoff").innerHTML = "";
});

socket.on("other peer", (pid) => {
  //joiner
  console.log("pid " + pid);
  otherPeerID = pid;
});

function serverMsg(msg) {
  let item = document.createElement("li");
  item.innerHTML = "<span id='server'>Server: </span>" + msg;
  messages.appendChild(item);
  theMessages.scrollTo(0, theMessages.scrollHeight);
}

function strangerMsg(msg) {
  let item = document.createElement("li");
  item.innerHTML = "<span>Usuario: </span>" + msg;
  messages.appendChild(item);
  theMessages.scrollTo(0, theMessages.scrollHeight);
}
