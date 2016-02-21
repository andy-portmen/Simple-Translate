var audio = new Audio(self.options.url);

function onerror(e) {
  self.postMessage('error');
};

function ended() {
  self.postMessage();
  audio.removeEventListener('ended', ended);
  audio.removeEventListener('error', onerror);
};

audio.addEventListener('error', onerror);
audio.addEventListener('ended', ended);

audio.volume = 1;
audio.play();