AgoraRTC.enableLogUpload();
// create Agora client
var client = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

var screenClient = AgoraRTC.createClient({ mode: "live", codec: "vp8" });

// //  v4.18.0 以前的监听方式
// AgoraRTC.onCameraChanged = (info) => {
//   console.log("camera changed!", info.state, info.device);
// };


// v4.18.0 及以上版本新支持的监听方式
// AgoraRTC.on("camera-changed", (info) => {
//   console.log("Camera changed!", info.state, info.device);
// });

// AgoraRTC.on("microphone-changed", (info) => {
//   console.log("Microphone changed!", info.state, info.device);
// });

// AgoraRTC.on("playback-device-changed", (info) => {
//   console.log("Playback device changed!", info.state, info.device);
// });




client.setClientRole("host");

var localTracks = {
  videoTrack: null,
  audioTrack: null
};

var localScreenTracks = {

  screenTrackA: null,
  screenTrackV: null

};






var remoteUsers = {};
// Agora client options
var options = {
  appid: null,
  channel: null,
  uid: null,
  token: null
};







var mics = []; // all microphones devices you can use
var speakers = [];// all speakers devices you can use
var cams = []; // all cameras devices you can use
var currentMic; // the microphone you are using
var currentCam; // the camera you are using
var currentSpeaker; // the speaker you are using

let volumeAnimation;

// the demo can auto join channel with params in url
$(async () => {
  $("#media-device-test").modal("show");
  $(".cam-list").delegate("a", "click", function (e) {
    switchCamera(this.text);
  });
  $(".mic-list").delegate("a", "click", function (e) {
    switchMicrophone(this.text);
  });

  if (navigator.userAgent.indexOf("Chrome") !== -1) {
    // 在Chrome浏览器中执行的代码
    $(".speaker-list").delegate("a", "click", function (e) {
      switchSpeaker(this.text);
    });
  }


  var urlParams = new URL(location.href).searchParams;
  options.appid = urlParams.get("appid");
  options.channel = urlParams.get("channel");
  options.token = urlParams.get("token");
  options.uid = urlParams.get("uid");
  await mediaDeviceTest();
  volumeAnimation = requestAnimationFrame(setVolumeWave);
});

// the demo can auto join channel with params in url
$(() => {
  var urlParams = new URL(location.href).searchParams;
  options.appid = urlParams.get("appid");
  options.channel = urlParams.get("channel");
  options.token = urlParams.get("token");
  options.uid = urlParams.get("uid");
  if (options.appid && options.channel) {
    $("#appid").val(options.appid);
    $("#token").val(options.token);
    $("#channel").val(options.channel);
    $("#join-form").submit();
    $("#uid").val(options.uid);
  }
})

// $("#join-form").submit(async function (e) {
//   e.preventDefault();
//   $("#join").attr("disabled", true);
//   try {
//     options.appid = $("#appid").val();
//     options.token = $("#token").val();
//     options.channel = $("#channel").val();
//     options.uid = Number($("#uid").val());
//     await join();
//     if (options.token) {
//       $("#success-alert-with-token").css("display", "block");
//     } else {
//       $("#success-alert a").attr("href", `index.html?appid=${options.appid}&channel=${options.channel}&token=${options.token}`);
//       $("#success-alert").css("display", "block");
//     }
//   } catch (error) {
//     console.error(error);
//   } finally {
//     $("#leave").attr("disabled", false);
//   }
// })



$("#join-form").submit(async function (e) {
  e.preventDefault();

  //check the id of submitter to decide to join a channel or do netwwork test
  let submitterId = e.originalEvent ? e.originalEvent.submitter.attributes[0].value : "join"

  options.channel = $("#channel").val();
  options.uid = Number($("#uid").val());
  options.appid = $("#appid").val();
  options.token = $("#token").val();
  if (submitterId == "join") {
    $("#join").attr("disabled", true);
    $("#device-wrapper").css("display", "flex");

    try {
      await join();
      if (options.token) {
        $("#success-alert-with-token").css("display", "block");
      } else {
        $("#success-alert a").attr("href", `index.html?appid=${options.appid}&channel=${options.channel}&token=${options.token}`);
        $("#success-alert").css("display", "block");
      }
    } catch (error) {
      console.error(error);
    } finally {
      $("#leave").attr("disabled", false);
    }
  } else if (submitterId == "startNetworkTest") {
    await goToNetworkTestPage();
  }
  // else if (screen_Button && screen_Button.id == "startScreen") {

  // }

  else {
    // ...
  }


});


$("#network-test-finish").click(function (e) {
  if (!uplinkClient || !downlinkClient) {
    return;
  }
  uplinkClient.leave();
  downlinkClient.leave();
});

$("#startScreen").click(async function (e) {

  options.channel = $("#channel").val();
  options.uid = Number($("#uid").val());
  options.appid = $("#appid").val();
  options.token = $("#token").val();

  if (checkBrowser()) {
    console.log("This is a supported browser.");
    await createScreen();
    localScreenTracks.screenTrackV.play("localScreen-player",{ fit: "contain", mirror: false })
    $("#localScreen-player-name").text(`localScreenVideo(${Number(options.uid + "666")})`);
    await screenJoin();

    await publishScreen();
  }
  else {
    console.log("This browser is not supported.");
    alert("This browser does not support screen sharing")
  }




  

})

$("#stopScreen").click(async function (e) {

  await screenLeave()

})



$("#leave").click(function (e) {
  leave();
})

$("#MutedAudio").click(function (e) {
  MutedAudio();
})

$("#unMutedAudio").click(function (e) {
  unMutedAudio();
})

$("#MutedVideo").click(function (e) {
  MutedVideo();
})

$("#unMutedVideo").click(function (e) {
  unMutedVideo();
})

$("#sendDataStream").click(function (e) {
  sendDataStream();
})

$("#startPlayTest").click(function (e) {
  startPlayTest();
})

$("#stopPlayTest").click(function (e) {
  stopPlayTest();
})


// $("#startScreen").click(function (e) {


// })



async function join() {

  // add event listener to play remote tracks when remote user publishs.


  client.on("user-published", handleUserPublished);
  client.on("user-unpublished", handleUserUnpublished);
  client.on("user-info-updated", handleUserUserInfoUpdate);

  // if (client.remoteUsers[0] && Number(client.remoteUsers[0].uid) == Number(options.uid + "666")) {
  //   client.off("user-published", handleUserPublished);
  //   client.off("user-unpublished", handleUserUnpublished);
  // }


  client.on("stream-message", handleDataStream);
  client.on("crypt-error", handleCrypt);

  await createMic();

  await createCamera();


  await joinCH()

  await publishStream()

  async function createMic() {
    return new Promise((resolve, reject) => {


      // AgoraRTC.createMicrophoneAudioTrack().then((track) => {


      AgoraRTC.createMicrophoneAudioTrack({ bypassWebAudio: true }).then((track) => {
        localTracks.audioTrack = track

        resolve(track)
      }).catch(e => {
        alert("Mic error: " + e.message)
        reject(e)

      })
    })
  }

  async function createCamera() {
    return new Promise((resolve, reject) => {


      AgoraRTC.createCameraVideoTrack({
        optimizationMode: "detail",
        encoderConfig: {
          width: 640,
          // 支持指定一个范围和参考值，具体配置参考相关 API 文档
          height: 360,
          frameRate: 15,
          bitrateMin: 400, bitrateMax: 600,
        },
      }).then((track) => {
        localTracks.videoTrack = track

        resolve()
      }).catch(e => {
        alert("Camera error: " + e.message)
        reject(e)

      })
    })
  }


 



  localTracks.videoTrack.play("local-player", { fit: "cover", mirror: true });
  $("#local-player-name").text(`localVideo(${options.uid})`);

  async function joinCH() {

    // init123(1);
    return new Promise((resolve, reject) => {

      // client.join(options.appid, options.channel, options.token || null, "123").then((uid) => {

      client.join(options.appid, options.channel, options.token || null, options.uid || null).then((uid) => {
        options.uid = uid

        console.log(options.uid + " join success")

        resolve()
      }).catch(e => {
        alert("join error: " + e.message)
        reject(e)

      })
    })
  }

  async function publishStream() {
    return new Promise((resolve, reject) => {
      // client.publish(localTracks.videoTrack).then(() => {
      client.publish(Object.values(localTracks)).then(() => {

        console.log("publish success")
        initStats();
        resolve()
      }).catch(e => {
        alert("publish error: " + e.message)
        reject(e)

      })
    })
  }


}





async function createScreen() {


  // [localScreenTracks.screenTrackA, localScreenTracks.screenTrackV] = await Promise.all([
  //   AgoraRTC.createScreenVideoTrack({
  //     optimizationMode: "detail",
  //     encoderConfig: "1080p",
  //     // encoderConfig: {
  //     //   width: 1920,
  //     //   // 支持指定一个范围和参考值，具体配置参考相关 API 文档
  //     //   height: 1080,
  //     //   frameRate: 15,
  //     //   bitrateMin: 400, bitrateMax: 600,
  //     // },
  //   }, "auto")
  // ]);

  $("#startScreen").attr("disabled", true);
  $("#stopScreen").attr("disabled", false);

  return new Promise((resolve, reject) => {

  


    AgoraRTC.createScreenVideoTrack({
      encoderConfig: {
        width: 2560,
        // 支持指定一个范围和参考值，具体配置参考相关 API 文档
        height: 1440,
        frameRate: 5
      },optimizationMode: "detail"
    }, "auto").then((screenTrack) => {
      if (screenTrack instanceof Array) {
        localScreenTracks.screenTrackV = screenTrack[0];
        localScreenTracks.screenTrackA = screenTrack[1];
        resolve()
      } else {
        localScreenTracks.screenTrackV = screenTrack;
        resolve()
      }
    }).catch(e => {
      alert("create screenTrack error: " + e.message)
      reject(e)

    });

    




    // AgoraRTC.createScreenVideoTrack({
    //   // optimizationMode: "detail",
    //   encoderConfig: "1080p_1",
    //   // encoderConfig: {
    //   //   width: 1920,
    //   //   // 支持指定一个范围和参考值，具体配置参考相关 API 文档
    //   //   height: 1080,
    //   //   frameRate: 15,
    //   //   bitrateMin: 400, bitrateMax: 600,
    //   // },
    // }, "auto").then((result) => {
    //   if (Array.isArray(result) && result.length === 1) {
    //     // 处理长度为 1 的对象数组
    //     // const [ScreenVideoTrack] = result;
    //     // localScreenTracks.screenTrackV = ScreenVideoTrack
    //     // console.log('Promise 返回值 长度为1');
    //     // console.log(ScreenVideoTrack);
    //     resolve()
    //   } else if (Array.isArray(result) && result.length === 2) {
    //     // 处理长度为 2 的对象数组
    //     const [ScreenVideoTrack, ScreenAudioTrack] = result;
    //     localScreenTracks.screenTrackA = ScreenAudioTrack
    //     localScreenTracks.screenTrackV = ScreenVideoTrack
    //     console.log('Promise 返回值 长度为2');



    //     resolve()

    //     // console.log(ScreenAudioTrack, ScreenVideoTrack);
    //   } else {
    //     // 处理其他情况
    //     // console.error('Promise 返回值不是长度为 1 或 2 的对象数组');

    //     localScreenTracks.screenTrackV = result
    //     resolve()
    //   }
    // })


    //   // then(([ScreenAudioTrack, ScreenVideoTrack]) => {
    //   //   if(ScreenAudioTrack != null){
    //   //     localScreenTracks.screenTrackA = ScreenAudioTrack
    //   //   }

    //   //   localScreenTracks.screenTrackV = ScreenVideoTrack

    //   //   resolve()
    //   // })



    //   .catch(e => {
    //     alert("create screenTrack error: " + e.message)
    //     reject(e)

    //   })

  })

  
}

// join a channel and create local tracks, we can use Promise.all to run them concurrently
// [options.uid, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
//   // join the channel
//   client.join(options.appid, options.channel, options.token || null),
//   // create local tracks, using microphone and camera
//   AgoraRTC.createMicrophoneAudioTrack(),
//   AgoraRTC.createCameraVideoTrack()
// ]);

// // play local video track
// localTracks.videoTrack.play("local-player");
// $("#local-player-name").text(`localVideo(${options.uid})`);

// // publish local tracks to channel
// await client.publish(Object.values(localTracks));
// console.log("publish success");
// }


async function goToNetworkTestPage() {
  $("#network-test").modal("show");
  await doNetworkTest();
}

async function doNetworkTest() {
  uplinkClient = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
  uplinkClient.setClientRole("host");
  downlinkClient = AgoraRTC.createClient({ mode: "live", codec: "vp8" });
  downlinkClient.setClientRole("host");

  if (!localTracks.audioTrack || !localTracks.videoTrack) {
    [localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
      // create local tracks, using microphone and camera
      AgoraRTC.createMicrophoneAudioTrack({ microphoneId: currentMic.deviceId, encoderConfig: "music_standard" }),
      AgoraRTC.createCameraVideoTrack({ cameraId: currentCam.deviceId,encoderConfig: {
        width: 640,
        // 支持指定一个范围和参考值，具体配置参考相关 API 文档
        height: 360,
        frameRate: 15,
        bitrateMin: 1000, bitrateMax: 1500,
      }})
    ]);
  }

  // join network test channel.
  let upClientUid = await uplinkClient.join(options.appid, options.channel, options.token || null, null);
  await downlinkClient.join(options.appid, options.channel, options.token || null, null);
  // publish local audio and video tracks
  await uplinkClient.publish(Object.values(localTracks));

  downlinkClient.on("user-published", async (user, mediaType) => {
    await downlinkClient.subscribe(user, mediaType);
  })

  //whether to play or not??????

  // 获取上行网络质量
  uplinkClient.on("network-quality", (quality) => {
    console.log("uplink network quality", quality.uplinkNetworkQuality);
    $("#uplink-network-quality").JSONView(JSON.stringify(quality.uplinkNetworkQuality));
    console.log("uplink audio stats", uplinkClient.getLocalAudioStats());
    $("#local-audio-stats").JSONView(JSON.stringify(uplinkClient.getLocalAudioStats()));
    console.log("uplink video stats", uplinkClient.getLocalVideoStats());
    $("#local-video-stats").JSONView(JSON.stringify(uplinkClient.getLocalVideoStats()));
  });

  // 获取下行网络质量
  downlinkClient.on("network-quality", (quality) => {
    console.log("downlink network quality", quality.downlinkNetworkQuality);
    $("#downlink-network-quality").JSONView(JSON.stringify(quality.downlinkNetworkQuality));
    console.log("downlink audio stats", downlinkClient.getRemoteAudioStats()[upClientUid]);
    $("#remote-audio-stats").JSONView(JSON.stringify(downlinkClient.getRemoteAudioStats()[upClientUid]));
    console.log("downlink video stats", downlinkClient.getRemoteVideoStats()[upClientUid]);
    $("#remote-video-stats").JSONView(JSON.stringify(downlinkClient.getRemoteVideoStats()[upClientUid]));
  });
}


async function leave() {
  for (trackName in localTracks) {
    var track = localTracks[trackName];
    if (track) {
      track.stop();
      track.close();
      localTracks[trackName] = undefined;
    }
  }

  destructStats();

  // remove remote users and player views
  remoteUsers = {};
  $("#remote-playerlist").html("");

  // leave the channel
  await client.leave();

  $("#local-player-name").text("");
  $("#join").attr("disabled", false);
  $("#leave").attr("disabled", true);
  console.log("client leaves channel success");
}


async function screenLeave() {
  for (trackName in localScreenTracks) {
    var track = localScreenTracks[trackName];
    if (track) {
      track.stop();
      track.close();
      localScreenTracks[trackName] = undefined;
    }
  }

  destructScreenStats();




  // leave the channel
  await screenClient.leave();

  $("#localScreen-player-name").text("");
  $("#startScreen").attr("disabled", false);
  $("#stopScreen").attr("disabled", true);
  console.log("ScreenClient leaves channel success");


}


async function MutedAudio() {
  localTracks.audioTrack.setMuted(true);
}

async function unMutedAudio() {
  localTracks.audioTrack.setMuted(false);
  // await client.setClientRole("host").then(() => {

  //   client.publish(Object.values(localTracks));

  // })

}

async function MutedVideo() {
  localTracks.videoTrack.setEnabled(false);
  localTracks.videoTrack.stop();



}

async function unMutedVideo() {
  localTracks.videoTrack.setEnabled(true);
  localTracks.videoTrack.play("local-player", { fit: "cover", mirror: true });
  $("#local-player-name").text(`localVideo(${options.uid})`);


  // await client.setClientRole("host").then(() => {

  //   client.publish(Object.values(localTracks));

  // })

}



async function sendDataStream() {

  function Uint8ArrayToString(fileData) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
      dataString += String.fromCharCode(fileData[i]);
    }

    return dataString
  }


  function stringToUint8Array(str) {
    var arr = [];
    for (var i = 0, j = str.length; i < j; ++i) {
      arr.push(str.charCodeAt(i));
    }

    var tmpUint8Array = new Uint8Array(arr);
    return tmpUint8Array
  }

  var before = "123";

  console.log("before_length: " + before.length)
  var after = stringToUint8Array(before)
  console.log("after: " + after);

  try {
    // 可能会引发异常的代码块
    await client.sendStreamMessage(after);
  } catch (error) {
    // 异常发生时要执行的代码块
    alert(error.message)
  }

  
  console.log(" sendStreamMessage " + Date.now())

}

// for (trackName in localTracks) {
//   var track = localTracks[trackName];
//   if(track) {
//    await track.setMuted(true)

//   }
// }

// await client.unpublish().then(() => {
//   client.setClientRole("audience")
// })

// function Uint8ArrayToString(fileData) {
//   var dataString = "";
//   for (var i = 0; i < fileData.length; i++) {
//     dataString += String.fromCharCode(fileData[i]);
//   }

//   return dataString
// }


// function stringToUint8Array(str) {
//   var arr = [];
//   for (var i = 0, j = str.length; i < j; ++i) {
//     arr.push(str.charCodeAt(i));
//   }

//   var tmpUint8Array = new Uint8Array(arr);
//   return tmpUint8Array
// }

// var before = "123";

// console.log("before_length: " + before.length)
// var after = stringToUint8Array(before)
// console.log("after: " + after);

// await client.sendStreamMessage(after);
// console.log(" sendStreamMessage " +Date.now() )











async function subscribe(user, mediaType) {
  const uid = user.uid;
  // subscribe to a remote user
  await client.subscribe(user, mediaType);
  console.log("subscribe success");
  if (mediaType === 'video') {
    const player = $(`
      <div id="player-wrapper-${uid}">
        <p class="player-name">remoteUser(${uid})</p>
        <div id="player-${uid}" class="player"></div>
      </div>
    `);
    $("#remote-playerlist").append(player);
    user.videoTrack.play(`player-${uid}`);
  }
  if (mediaType === 'audio') {
    user.audioTrack.play();
  }
}

function handleUserPublished(user, mediaType) {
  console.log(`666666 remote user published uid: ${user.uid} mediaType: ${mediaType}`)

  if (user.uid != Number(options.uid + "666")) {
    const id = user.uid;
    remoteUsers[id] = user;

    subscribe(user, mediaType);
  }
}

function handleUserUnpublished(user) {
  console.log(`666666 remote user unpublished uid: ${user.uid}`)
  const id = user.uid;
  delete remoteUsers[id];
  $(`#player-wrapper-${id}`).remove();
}

function handleUserUserInfoUpdate(uid,msg){
console.log(`666666 user-info-updated uid: ${uid} msg: ${msg}`)
}


function handleDataStream(user1, payload) {
  const id1 = client.remoteUsers

  remoteUsers[id1] = user1;

  function Uint8ArrayToString(fileData) {
    var dataString = "";
    for (var i = 0; i < fileData.length; i++) {
      dataString += String.fromCharCode(fileData[i]);
    }

    return dataString
  }

  console.log("channel: " + options.channel + " uid: " + user1, "payload: ", Uint8ArrayToString(payload));
}

function handleCrypt() {
  console.log("cryptt failed")
}


// show real-time volume while adjusting device. 
function setVolumeWave() {
  volumeAnimation = requestAnimationFrame(setVolumeWave);
  $(".progress-bar").css("width", localTracks.audioTrack.getVolumeLevel() * 100 + "%");
  $(".progress-bar").attr("aria-valuenow", localTracks.audioTrack.getVolumeLevel() * 100);
}


//测试设备
async function mediaDeviceTest() {
  // create local tracks
  [localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
    // create local tracks, using microphone and camera
    AgoraRTC.createMicrophoneAudioTrack({
      encoderConfig: "music_standard"
    }).catch(e => {
      alert("Mic error: " + e.message)
      reject(e)

    }), AgoraRTC.createCameraVideoTrack({
      optimizationMode: "detail",
      encoderConfig: {
        width: 640,
        // 支持指定一个范围和参考值，具体配置参考相关 API 文档
        height: 360,
        frameRate: 15,
        bitrateMin: 1000, bitrateMax: 1600,
      },
    }).catch(e => {
      alert("Camera error: " + e.message)
      reject(e)

    })]);








  // play local track on device detect dialog
  localTracks.videoTrack.play("pre-local-player", { fit: "cover", mirror: true });

  // localTracks.audioTrack.play();

  // get mics
  mics = await AgoraRTC.getMicrophones();
  currentMic = mics[0];
  $(".mic-input").val(currentMic.label);
  mics.forEach(mic => {
    $(".mic-list").append(`<a class="dropdown-item" href="#">${mic.label}</a>`);
  });






  if (navigator.userAgent.indexOf("Chrome") !== -1) {
    // 在Chrome浏览器中执行的代码
    // get speakers
    speakers = await AgoraRTC.getPlaybackDevices();
    currentSpeaker = speakers[0];
    $(".speaker-input").val(currentSpeaker.label);
    speakers.forEach(speaker => {
      $(".speaker-list").append(`<a class="dropdown-item" href="#">${speaker.label}</a>`);
    });

    // const dom1 = document.getElementById("chrome-specific-content");
    // dom1.style.display = "none";
    // console.log("is chrome true")
  }



  // get cameras
  cams = await AgoraRTC.getCameras();
  currentCam = cams[0];
  $(".cam-input").val(currentCam.label);
  cams.forEach(cam => {
    $(".cam-list").append(`<a class="dropdown-item" href="#">${cam.label}</a>`);
  });
}



//扬声器播放测试
async function startPlayTest() {


  // musicFile.
  // 通过在线音乐创建音频轨道。
  audioMixingTrack = await AgoraRTC.createBufferSourceAudioTrack({
    source: "HeroicAdventure.mp3",
  });
  console.log("create audio file track success");
  audioMixingTrack.play();
  audioMixingTrack.startProcessAudioBuffer({
    loop: true
  });


}


async function stopPlayTest() {

  audioMixingTrack.stopProcessAudioBuffer();
  audioMixingTrack.stop();
  audioMixingTrack.close();

}


async function checkBrowser() {

  const userAgent = navigator.userAgent;
  let browserName = '';
  let version = '';
  const os = navigator.platform;

  if (userAgent.indexOf("Chrome") > -1) {
    browserName = 'Chrome';
    version = /Chrome\/([0-9.]+)/.exec(userAgent)[1];
  }
  else if (userAgent.indexOf("Safari") > -1 && userAgent.indexOf("Version") > -1) {
    browserName = 'Safari';
    version = /Version\/([0-9.]+)/.exec(userAgent)[1];
  }
  else if (userAgent.indexOf("Edg") > -1) {
    browserName = 'Edge';
    version = /Edg\/([0-9.]+)/.exec(userAgent)[1];
  }

  // Parse version to major version
  version = parseInt(version.split('.')[0]);

  if ((browserName === 'Chrome' && version >= 72) ||
    (os.indexOf("Win") > -1 && browserName === 'Edge' && version >= 80) ||
    (os.indexOf("Mac") > -1 && browserName === 'Safari' && version >= 13)) {
    return true;
  } else {
    return false;
  }
}





async function screenJoin() {

  // init123(1);
  return new Promise((resolve, reject) => {

    // client.join(options.appid, options.channel, options.token || null, "123").then((uid) => {


    screenClient.setClientRole("host");

    options.uid = Number($("#uid").val());

    let uid_Screen = Number(options.uid + "666")

    console.log("uid_Screen: " + uid_Screen)



    screenClient.join(options.appid, options.channel, options.token || null, uid_Screen).then((uid_Screen) => {


      console.log(uid_Screen + " join success")

 

      resolve()
    }).catch(e => {
      alert("join screen client error: " + e.message)
      reject(e)

    })
  })

  
}


async function publishScreen() {

  return new Promise((resolve, reject) => {


    if (typeof localScreenTracks.screenTrackA !== 'undefined' && localScreenTracks.screenTrackA === null) {

      // if (localScreenTracks.screenTrackA == null) {
      // 对象已定义且等于 null
      screenClient.publish(localScreenTracks.screenTrackV);
      initScreen_Stats();

      resolve();
    } else {
      screenClient.publish(Object.values(localScreenTracks));
      initScreen_Stats();
      resolve();
    }

    //bind "track-ended" event, and when screensharing is stopped, there is an alert to notify the end user.
    localScreenTracks.screenTrackV.on("track-ended", async () => {

      $("#localScreen-player-name").text("");
      alert(`Screen-share track ended, stop sharing screen ` + localScreenTracks.screenTrackV.getTrackId());

      localScreenTracks.screenTrackV && localScreenTracks.screenTrackV.close();
      localScreenTracks.screenTrackV = null;

      localScreenTracks.screenTrackA && localScreenTracks.screenTrackA.close();
      localScreenTracks.screenTrackA = null;

     

      destructScreenStats();

      await screenClient.leave();

      $("#startScreen").attr("disabled", false);
      $("#stopScreen").attr("disabled", true);

    });
  })



}





















//切换摄像头
async function switchCamera(label) {
  currentCam = cams.find(cam => cam.label === label);
  $(".cam-input").val(currentCam.label);
  // switch device of local video track.
  await localTracks.videoTrack.setDevice(currentCam.deviceId);
}


//切换麦克风设备
async function switchMicrophone(label) {
  currentMic = mics.find(mic => mic.label === label);
  $(".mic-input").val(currentMic.label);
  // switch device of local audio track.
  await localTracks.audioTrack.setDevice(currentMic.deviceId);
}


//切换扬声器设备
async function switchSpeaker(label) {
  currentSpeaker = speakers.find(speaker => speaker.label === label);
  $(".speaker-input").val(currentSpeaker.label);
  // switch device of local audio track.
  // await localTracks.audioMixingTrack.setDevice(currentSpeaker.deviceId);

  console.log("start exec setPlaybackDevice")
  localTracks.audioTrack.setPlaybackDevice(currentSpeaker.deviceId)

}

// start collect and show stats information
function initStats() {
  statsInterval = setInterval(flushStats, 1000);
}

// start collect and show stats information
function initScreen_Stats() {
  statsScreen_Interval = setInterval(flushScreenStats, 1000);
}

// stop collect and show stats information
function destructStats() {
  clearInterval(statsInterval);
  $("#client-stats").html("");
  // $("#transport-stats").html("");
  $("#local-stats").html("");
}

// stop Screen collect and show stats information
function destructScreenStats() {
  clearInterval(statsScreen_Interval);
  $("#screenClient-stats").html("");
  // $("#transport-stats").html("");
  $("#localScreen-stats").html("");
}

// flush stats views
function flushStats() {
  // get the client stats message
  const clientStats = client.getRTCStats();
  const clientStatsList = [{
    description: "Number of users in channel",
    value: clientStats.UserCount,
    unit: ""
  }, {
    description: "Duration in channel",
    value: clientStats.Duration,
    unit: "s"
  }, {
    description: "Bit rate receiving",
    value: clientStats.RecvBitrate,
    unit: "bps"
  }, {
    description: "Bit rate being sent",
    value: clientStats.SendBitrate,
    unit: "bps"
  }, {
    description: "Total bytes received",
    value: clientStats.RecvBytes,
    unit: "bytes"
  }, {
    description: "Total bytes sent",
    value: clientStats.SendBytes,
    unit: "bytes"
  }, {
    description: "Outgoing available bandwidth",
    value: clientStats.OutgoingAvailableBandwidth.toFixed(3),
    unit: "kbps"
  }, {
    description: "RTT from SDK to SD-RTN access node",
    value: clientStats.RTT,
    unit: "ms"
  }];
  $("#client-stats").html(`
    ${clientStatsList.map(stat => `<p class="stats-row">${stat.description}: ${stat.value} ${stat.unit}</p>`).join("")}
  `);

  // get the local track stats message
  const localStats = {
    video: client.getLocalVideoStats(),
    audio: client.getLocalAudioStats()
  };
  const localStatsList = [{
    description: "Send audio bit rate",
    value: localStats.audio.sendBitrate,
    unit: "bps"
  }, {
    description: "Total audio bytes sent",
    value: localStats.audio.sendBytes,
    unit: "bytes"
  }, {
    description: "Total audio packets sent",
    value: localStats.audio.sendPackets,
    unit: ""
  }, {
    description: "Total audio packets loss",
    value: localStats.audio.sendPacketsLost,
    unit: ""
  }, {
    description: "Video capture resolution height",
    value: localStats.video.captureResolutionHeight,
    unit: ""
  }, {
    description: "Video capture resolution width",
    value: localStats.video.captureResolutionWidth,
    unit: ""
  }, {
    description: "Video send resolution height",
    value: localStats.video.sendResolutionHeight,
    unit: ""
  }, {
    description: "Video send resolution width",
    value: localStats.video.sendResolutionWidth,
    unit: ""
  }, {
    description: "video encode delay",
    value: Number(localStats.video.encodeDelay).toFixed(2),
    unit: "ms"
  }, {
    description: "Send video bit rate",
    value: localStats.video.sendBitrate,
    unit: "bps"
  }, {
    description: "Total video bytes sent",
    value: localStats.video.sendBytes,
    unit: "bytes"
  }, {
    description: "Total video packets sent",
    value: localStats.video.sendPackets,
    unit: ""
  }, {
    description: "Total video packets loss",
    value: localStats.video.sendPacketsLost,
    unit: ""
  }, {
    description: "Video duration",
    value: localStats.video.totalDuration,
    unit: "s"
  }, {
    description: "Total video freeze time",
    value: localStats.video.totalFreezeTime,
    unit: "s"
  }];
  $("#local-stats").html(`
    ${localStatsList.map(stat => `<p class="stats-row">${stat.description}: ${stat.value} ${stat.unit}</p>`).join("")}
  `);
  Object.keys(remoteUsers).forEach(uid => {
    // get the remote track stats message
    const remoteTracksStats = {
      video: client.getRemoteVideoStats()[uid],
      audio: client.getRemoteAudioStats()[uid]
    };
    const remoteTracksStatsList = [{
      description: "Delay of audio from sending to receiving",
      value: Number(remoteTracksStats.audio.receiveDelay).toFixed(2),
      unit: "ms"
    }, {
      description: "Delay of video from sending to receiving",
      value: Number(remoteTracksStats.video.receiveDelay).toFixed(2),
      unit: "ms"
    }, {
      description: "Total audio bytes received",
      value: remoteTracksStats.audio.receiveBytes,
      unit: "bytes"
    }, {
      description: "Total audio packets received",
      value: remoteTracksStats.audio.receivePackets,
      unit: ""
    }, {
      description: "Total audio packets loss",
      value: remoteTracksStats.audio.receivePacketsLost,
      unit: ""
    }, {
      description: "Total audio packets loss rate",
      value: Number(remoteTracksStats.audio.packetLossRate).toFixed(3),
      unit: "%"
    }, {
      description: "Video received resolution height",
      value: remoteTracksStats.video.receiveResolutionHeight,
      unit: ""
    }, {
      description: "Video received resolution width",
      value: remoteTracksStats.video.receiveResolutionWidth,
      unit: ""
    }, {
      description: "Receiving video bit rate",
      value: remoteTracksStats.video.receiveBitrate,
      unit: "bps"
    }, {
      description: "Total video bytes received",
      value: remoteTracksStats.video.receiveBytes,
      unit: "bytes"
    }, {
      description: "Total video packets received",
      value: remoteTracksStats.video.receivePackets,
      unit: ""
    }, {
      description: "Total video packets loss",
      value: remoteTracksStats.video.receivePacketsLost,
      unit: ""
    }, {
      description: "Total video packets loss rate",
      value: Number(remoteTracksStats.video.receivePacketsLost).toFixed(3),
      unit: "%"
    }, {
      description: "Video duration",
      value: remoteTracksStats.video.totalDuration,
      unit: "s"
    }, {
      description: "Total video freeze time",
      value: remoteTracksStats.video.totalFreezeTime,
      unit: "s"
    }, {
      description: "video freeze rate",
      value: Number(remoteTracksStats.video.freezeRate).toFixed(3),
      unit: "%"
    }];
    $(`#player-wrapper-${uid} .track-stats`).html(`
      ${remoteTracksStatsList.map(stat => `<p class="stats-row">${stat.description}: ${stat.value} ${stat.unit}</p>`).join("")}
    `);
  });


}



// flush Screen stats views
function flushScreenStats() {
  // get the client stats message
  const clientStats_Screen = screenClient.getRTCStats();
  const screen_ClientStatsList = [{
    description: "Number of users in channel",
    value: clientStats_Screen.UserCount,
    unit: ""
  }, {
    description: "Duration in channel",
    value: clientStats_Screen.Duration,
    unit: "s"
  }, {
    description: "Bit rate receiving",
    value: clientStats_Screen.RecvBitrate,
    unit: "bps"
  }, {
    description: "Bit rate being sent",
    value: clientStats_Screen.SendBitrate,
    unit: "bps"
  }, {
    description: "Total bytes received",
    value: clientStats_Screen.RecvBytes,
    unit: "bytes"
  }, {
    description: "Total bytes sent",
    value: clientStats_Screen.SendBytes,
    unit: "bytes"
  }, {
    description: "Outgoing available bandwidth",
    value: clientStats_Screen.OutgoingAvailableBandwidth.toFixed(3),
    unit: "kbps"
  }, {
    description: "RTT from SDK to SD-RTN access node",
    value: clientStats_Screen.RTT,
    unit: "ms"
  }];




  $("#screenClient-stats").html(`
  ${screen_ClientStatsList.map(stat => `<p class="stats-row">${stat.description}: ${stat.value} ${stat.unit}</p>`).join("")}
`);




  

  // get the local screen track stats message
  const localStats = {
    video: screenClient.getLocalVideoStats(),
    audio: screenClient.getLocalAudioStats()
  };
  const localStatsList = [{
    description: "Send audio bit rate",
    value: localStats.audio.sendBitrate,
    unit: "bps"
  }, {
    description: "Total audio bytes sent",
    value: localStats.audio.sendBytes,
    unit: "bytes"
  }, {
    description: "Total audio packets sent",
    value: localStats.audio.sendPackets,
    unit: ""
  }, {
    description: "Total audio packets loss",
    value: localStats.audio.sendPacketsLost,
    unit: ""
  }, {
    description: "Video capture resolution height",
    value: localStats.video.captureResolutionHeight,
    unit: ""
  }, {
    description: "Video capture resolution width",
    value: localStats.video.captureResolutionWidth,
    unit: ""
  }, {
    description: "Video send resolution height",
    value: localStats.video.sendResolutionHeight,
    unit: ""
  }, {
    description: "Video send resolution width",
    value: localStats.video.sendResolutionWidth,
    unit: ""
  }, {
    description: "video encode delay",
    value: Number(localStats.video.encodeDelay).toFixed(2),
    unit: "ms"
  }, {
    description: "Send video bit rate",
    value: localStats.video.sendBitrate,
    unit: "bps"
  }, {
    description: "Total video bytes sent",
    value: localStats.video.sendBytes,
    unit: "bytes"
  }, {
    description: "Total video packets sent",
    value: localStats.video.sendPackets,
    unit: ""
  }, {
    description: "Total video packets loss",
    value: localStats.video.sendPacketsLost,
    unit: ""
  }, {
    description: "Video duration",
    value: localStats.video.totalDuration,
    unit: "s"
  }, {
    description: "Total video freeze time",
    value: localStats.video.totalFreezeTime,
    unit: "s"
  }];

  $("#localScreen-stats").html(`
    ${localStatsList.map(stat => `<p class="stats-row">${stat.description}: ${stat.value} ${stat.unit}</p>`).join("")}
  `);


}








