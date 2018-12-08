const socket = io.connect("http://10.10.1.53:4001");
console.log(socket);
const peerConnections = {};

const {desktopCapturer} = require('electron')

desktopCapturer.getSources({types: ['window', 'screen']}, (error, sources) => {
  if (error) throw error
  for (let i = 0; i < sources.length; ++i) {
      console.log(sources[i].name);
    if (sources[i].name === 'Screen 1') {
        console.log("Come");
      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: sources[i].id,
            minWidth: 1280,
            maxWidth: 1280,
            minHeight: 720,
            maxHeight: 720
          }
        }
      })
      .then((stream) => handleStream(stream))
      .catch((e) => handleError(e))
      return
    }
  }
})

function handleStream (stream) {
  const video = document.querySelector('video')
  video.srcObject = stream;
  socket.emit('broadcaster');
 // video.onloadedmetadata = (e) => video.play()
}

function handleError (e) {
  console.log(e)
}


//creat broadcasters sdp and emit
socket.on('watcher', function (id) {
  const peerConnection = new RTCPeerConnection(null);
  peerConnections[id] = peerConnection;
  peerConnection.addStream(document.querySelector('video').srcObject);
  peerConnection.createOffer()
      .then(sdp => peerConnection.setLocalDescription(sdp))
      .then(function () {
          socket.emit('offer', id, peerConnection.localDescription);
      });
  peerConnection.onicecandidate = function (event) {
      if (event.candidate) {
          socket.emit('candidate', id, event.candidate);
      }
  };
});
//get clients sdp
socket.on('answer', function (id, description) {
  peerConnections[id].setRemoteDescription(description);
});

socket.on('candidate', function (id, candidate) {
  peerConnections[id].addIceCandidate(new RTCIceCandidate(candidate));
});

socket.on('bye', function (id) {
  peerConnections[id] && peerConnections[id].close();
  delete peerConnections[id];
});