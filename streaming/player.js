"use strict";

var constraints = { video: true, audio: true };

var shareBtn = document.querySelector("button#shareScreen");
var recBtn = document.querySelector("button#rec");
var stopBtn = document.querySelector("button#stop");
var downloadBtn = document.querySelector("button#download");

var videoElement = document.querySelector("video");
var downloadLink = document.querySelector("a#downloadLink");

videoElement.controls = false;

var mediaRecorder;
var chunks = [];
var count = 0;
var localStream = null;
var soundMeter = null;
var micNumber = 0;

function onShareScreen() {
  if (!navigator.mediaDevices.getDisplayMedia) {
    alert(
      "navigator.mediaDevices.getDisplayMedia not supported on your browser, use the latest version of Chrome"
    );
  } else {
    if (window.MediaRecorder == undefined) {
      alert(
        "MediaRecorder not supported on your browser, use the latest version of Firefox or Chrome"
      );
    } else {
      navigator.mediaDevices.getDisplayMedia(constraints)
        .then(function(screenStream) {
          getStreamSuccess(screenStream);
        })
        .catch(function(err) {
          console.log("navigator.getDisplayMedia error: " + err);
        });
    }
  }
}

function getStreamSuccess(stream) {
  localStream = stream;
  localStream.getTracks().forEach(function(track) {
    if (track.kind == "audio") {
      track.onended = function(event) {
        console.log("audio track.onended Audio track.readyState=" + track.readyState + ", track.muted=" + track.muted);
      };
    }
    if (track.kind == "video") {
      track.onended = function(event) {
        console.log("video track.onended Audio track.readyState=" + track.readyState + ", track.muted=" + track.muted);
      };
    }
  });

  videoElement.srcObject = localStream;
  videoElement.play();
  videoElement.muted = true;
  recBtn.disabled = false;
  shareBtn.disabled = true;

  try {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    window.audioContext = new AudioContext();
  } catch (e) {
    console.log("Web Audio API not supported.");
  }
}

function onBtnRecordClicked() {
  if (localStream == null) {
    alert("Could not get local stream from mic/camera");
  } else {
    recBtn.disabled = true;
    stopBtn.disabled = false;

    /* use the stream */
    console.log("Start recording...");
    if (typeof MediaRecorder.isTypeSupported == "function") {
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        var options = { mimeType: "video/webm;codecs=vp9" };
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=h264")) {
        var options = { mimeType: "video/webm;codecs=h264" };
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
        var options = { mimeType: "video/webm;codecs=vp8" };
      }
      console.log("Using " + options.mimeType);
      mediaRecorder = new MediaRecorder(localStream, options);
    } else {
      console.log("isTypeSupported is not supported, using default codecs for browser");
      mediaRecorder = new MediaRecorder(localStream);
    }

    mediaRecorder.ondataavailable = function(e) {
      chunks.push(e.data);
    };

    mediaRecorder.onerror = function(e) {
      console.log("mediaRecorder.onerror: " + e);
    };

    mediaRecorder.onstart = function() {
      console.log("mediaRecorder.onstart, mediaRecorder.state = " + mediaRecorder.state);

      localStream.getTracks().forEach(function(track) {
        if (track.kind == "audio") {
          console.log("onstart - Audio track.readyState=" + track.readyState + ", track.muted=" + track.muted);
        }
        if (track.kind == "video") {
          console.log("onstart - Video track.readyState=" + track.readyState + ", track.muted=" + track.muted);
        }
      });
    };

    mediaRecorder.onstop = function() {
      console.log("mediaRecorder.onstop, mediaRecorder.state = " + mediaRecorder.state);

      var blob = new Blob(chunks, { type: "video/webm" });
      chunks = [];

      var videoURL = window.URL.createObjectURL(blob);

      downloadLink.href = videoURL;
      videoElement.src = videoURL;

      var rand = Math.floor(Math.random() * 10000000);
      var name = "video_" + rand + ".webm";

      downloadLink.setAttribute("download", name);
      downloadLink.setAttribute("name", name);
      downloadLink.innerHTML = '<button id="download">Download</button>'
    };

    mediaRecorder.onwarning = function(e) {
      console.log("mediaRecorder.onwarning: " + e);
    };

    mediaRecorder.start(10);

    localStream.getTracks().forEach(function(track) {
      console.log(track.kind + ":" + JSON.stringify(track.getSettings()));
      console.log(track.getSettings());
    });
  }
}

function onBtnStopClicked() {
  mediaRecorder.stop();
  videoElement.controls = true;
  recBtn.disabled = false;
  stopBtn.disabled = true;
}

shareBtn.addEventListener("click", onShareScreen);
recBtn.addEventListener("click", onBtnRecordClicked);
stopBtn.addEventListener("click", onBtnStopClicked);
