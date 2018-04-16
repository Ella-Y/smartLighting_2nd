/* 
    Writer: Yeji Kim, Youngsung Moon 
    Modified date: 2018-03-08

*/
//==Require==//
var nlp = require('./http.js');
var dl = require('./tcp.js');
var slot = require('./sampleslot.js');
var net = require('net');
var WebSocket = require('ws');
var http = require('http');
//var ws = new WebSocket('ws://202.31.200.143:8080');
var macaddress = require('macaddress');
//==Require End==//
let command = {};
//const wss = new WebSocket.Server({ port: 4000 });

//==Init==//
//Obtain an address
macaddress.one(function (err, mac) {
    //macAddr = mac;
    macAddr = 'b8:27:eb:7e:c3:23';
});

const IP = '202.31.200.71'; //nlp Ip
const SIP = '202.31.200.143'; //smartLighting Server
const s = 1000;
// var word = '1분 후에 등 좀 어둡게 해줘'; //Streaming을 통해 넘어온 것.

var checkConnection = 0;
var macAddr;
var reconnection = false;
var msgcheck = false;
let data = {
    'words': '',
};

//os system으로 pwm_network돌리기.

//==Init End==//

//==Data Format==//
let PD_dataFormat = {
    Target: { LightID: 1, RoomID: 1, },
    Color: { Red: 0, Green: 0, Blue: 0 },
    Bright: 100,
    Time: { Type: 'Now', Delay: 0, onTime: 'None', SensorBased: 'Motion', Duration: 0 },
    Repeat: 'None',
}
let PD = { Data: [] };

let LID = { //Light info data
    "Property": {
        "Color": "24bColor", // { "BW", "12bColor", "24bColor" }
        "Temp": "2700K:4500K:6500K",
        "Lumen": 1000,
        "BLE": "4.1", // { "2.1", "3.0", "4.1", "4.0", "NO" }
        "Sensor": "Both", // { "None", "MotionOnly", "LightOnly", "Both" }
        "VoiceControl": "Yes", // { "Yes", "No" }
        "SmartControl": "Yes" // { "Yes", "No" }
    },
    'Model': {
        'Sensor': 'OFF',
        'RoomID': 15,
        'LightID': 1,
        'MACAddr': macAddr,
        'BLE': {
            'Status': 'OFF',
            'Connect': '010-1111-1234',
        },
        "VoiceControl": "On", // { "On", "Off" }
        "SmartControl": "Sensor_Mode" // { "Sensor_Mode", "AI_Mode", "Off" }
    },
    Status: {
        Bright: 100,
        'Temp': '2700K:4500K:6500K',
        'Color': {
            'Red': 255,
            'Green': 255,
            'Blue': 255
        }
    },
    Info: {
        RoomInfo: [
            { RoomID: 15, NickName: '거실' },
            { RoomID: 14, NickName: '안방' },
            { RoomID: 16, NickName: '작은방' },
        ],
        LightInfo: [
            { LightID: 1, RoomID: 15, NickName: '큰등', MACAddr: 'b8:27:eb:7e:c3:23', },
            { LightID: 3, RoomID: 14, NickName: '안방등', MACAddr: 'a8:31:ad:7a:c2:23', },
            { LightID: 4, RoomID: 16, NickName: '작은등', MACAddr: 'c2:23:af:7f:c3:45', },
        ]
    }
}

let CCQ = {
    Format: "CCQ",
    Data: {
        Type: "Light",
        MacAddr: macAddr,
        Time: "2017-02-01T14:23:08.680Z"
    }
};
let LCQ = {
    Format: "LCQ",
    Data: {
        MACAddr: macAddr
    }
}
let LRQ = {
    Format: "LRQ",
    Data: {
        MacAddr: macAddr,
        BLEMacAddr: "12:34:56:78:98:76",
        Property: {
            Color: "24bColor", // { "BW", "12bColor", "24bColor" }
            Temp: "2700K:4500K:6500K",
            Lumen: 1000,
            BLE: "4.1", // { "2.1", "3.0", "4.1", "4.0", "NO" }
            Sensor: "Both", // { "None", "MotionOnly", "LightOnly", "Both" }
            "VoiceControl": "Yes", // { "Yes", "No" }
            "SmartControl": "Yes" // { "Yes", "No" }
        }
    }
}
let LTS = {
    Format: "LTS",
    Data: {
        Status: "Success", // { "Success", "Fail" }
        Info: {
            Bright: 0, // 0-100 (percent)
            Temp: "2700K:4500K:6500K",
            Color: {
                Red: "255",
                Green: "255",
                Blue: "255"
            },
            BLE: {
                Status: "OFF", // { "ON", "OFF" }
                Connect: "010-1234-1234" // { "None", "Phone Number" }
            },
            Sensor: "BothOn", // { "OFF", "MotionOnly", "LightOnly", "BothOn" }
            "VoiceControl": "On", // { "On", "Off" }
            "SmartControl": "Sensor_Mode" // { "Sensor_Mode", "AI_Mode", "Off" }
        }
    }
}
//==Data Format End==//

//==Function==//

var connect = function () {

    ws.on('open', function () {
        console.log("========client is connected with server.========");
        var LRQdataStr = JSON.stringify(LRQ); //LRQ 등록
        ws.send(LRQdataStr);
        console.log("LRQ message send");

        ws.on('close', reconnect);

    });

    ws.on('message', recv);

};

// 소켓 재연결 함수
var reconnect = function () {
    if (reconnection == true) {
        ws = new WebSocket('ws://' + SIP + ':4444');
        ws.on('open', function () {
            console.log("=================Reconnection=================");

            //Light Connection Request
            ws.send(JSON.stringify(LCQ));
            console.log("LCQ message send");

            ws.on('close', reconnect);
        });
        ws.on('message', recv);
    }
};

var recv = function (message) {

    var result = JSON.parse(message);
    console.log('received: %s', message);

    if (result.Format == "CCS") {	// Connection Check Request에 대한 응답
        if (result.Data.Status != "Success") {
            checkConnection = checkConnection + 1;
            console.log("Error Information : " + result.Data.Info);
            if (checkConnection == 3) {
                reconnection = true;
                return ws.terminate();
            }

        }
    }
    else if (result.Format == "LRS") // Light Register Request에 대한 응답
    {
        console.log("Response of Light Registration " + result.Data.Status);
        if (result.Data.Status != "Success")
            console.log("Error Information : " + result.Data.Info);
    }
    else if (result.Format == "LTQ")	// Light Control Request에 대한 응답
    {
        if (result.Data.RoomID == LID.Model.RoomID && LID.Model.LightID == result.Data.LightID) {		//내 MAC 주소와 같다면 처리
            console.log("LTQ message received");
            // To do: 변경된 값을 통해 Light Control
            LTQ_received(result).then(res => {
                // To do: 변경된 상태를 다시 보내줌
                // res는 LTS
                var LTSDataStr = JSON.stringify(res);
                ws.send(LTSDataStr);
                console.log("LTS message send");
            })

        }

    }
    else if (result.Format == 'SUS') {
        if (result.Data.Status === 'Success') {
            console.log('응답메세지: 성공적으로 스케쥴에 등록되었습니다.');
        } else {
            console.log('응답메세지: 스케쥴에 등록을 실패하였습니다.');
        }
    }
    else if (result.Format == "TRS")	// Thing Registration Response에 대한 응답
    {
        console.log("Response of Thing" + result.Data.ThingID + "Registration " + result.Data.Status);
        if (result.Data.Status != "Success")
            console.log("Error Information : " + result.Data.Info);
    }
    else if (result.Format == "LUS")    //Light Condition Update Request에 대한 응답
    {
        console.log("Response of Condition Update " + result.Data.Status);
        if (result.Data.Status != "Success")
            console.log("Error Information : " + result.Data.Info);
        console.log('218.js:231');
        console.log('응답메세지:완료했습니다.');

    } else if (result.Format == 'EDS') {
        if (result.Result != 'Success') {
            console.log('응답메세지:정보를 불러오는데 실패하였습니다.');
        } else {
            if (result.DataType == 'API') {
                let str = answer_api(result.APIData, command);
                console.log('응답메세지:',str);
                
            } else {
                
                answer_roomInfo(result.LightData, command)
                .then((str)=>{
                    console.log('응답메세지:',str);
                })
            }

        }
    }
    else if (result.Format == "LIQ") {
        var len = result.Data.LightInfo.length;
        var list = result.Data.LightInfo;
        let x;
        let count = 0;
        for (x = 0; x < len; x++) {
            if (list[x].MacAddr == macAddr) {
                //console.log('success');
                LID.Model.RoomID = list[x].RoomID;
                LID.Model.LightID = list[x].LightID;
                count += 1;
                break;
            }
        }
        let LIS = {
            "Format": "LIS",
            "Data": {
                "RoomID": LID.Model.RoomID,
                "LightID": LID.Model.LightID,
                "Status": "Success", // { "Success", "Fail" }
                "Info": "None" // { "None", "Conflict", "EtcProblem"}	
            }
        }
        if (x == len) {
            LIS.Status = 'Fail';
            if (count > 1)
                LIS.Info = 'Conflict'; //mac 중복
            else
                LTS.Info = 'EtcProblem';
        }

        LID.Info = result.Data;

        var LTSDataStr = JSON.stringify(LIS);
        console.log('send:', LTSDataStr);
        ws.send(LTSDataStr);
    }
};

//==== CODE ====//
connect();
//Check session every 1 minute
const interval = setInterval(function () {

    console.log(CCQ.Data.Time);
    CCQ.Data.Time = new Date();

    //Connection Check Request
    var CCQdataStr = JSON.stringify(CCQ);
    ws.send(CCQdataStr);
    //console.log(CCQ.Data.Time);
    console.log("CCQ message send");
    msgcheck = true;
    
}, 60 * s);

setTimeout(function () {
    request();
}, 3 * s);

//==== CODE ====//

function onoff(arr) {
    var client = new net.Socket();
    client.connect(12345, '127.0.0.1', function () {
        console.log('Connected with pwm_network.');
        client.write(arr.toString());
    });
    client.on('data', function (data) {
        console.log('receive:', data);
        if (data == '') {
            client.destroy();
            onoff(arr);
        }
    })
    client.on('close', function () {
        console.log('Connection closed with pwm_network');
    })
}

var promise_0ToNumber = function (nlp, z) {
    return new Promise((resolve, reject) => {
        let str = '';
        for (let o of nlp.words) {
            str += o + ' ';
        }
        if (z === 'str') {
            data.words = str.slice(0, str.length - 1);
        }
        else if (z === 'arr') { //z=='arr'
            data.words = str.slice(0, str.length - 1).split(' ');
        } else {
            reject('TypeError: z type is str or arr.');
        }

        resolve();
    });
}
function matching() {
    return new Promise((resolve, reject) => {
        let res = slot.matching(data, LID);
        resolve(res);
    });
}

module.exports.request=function request(word) {
    nlp.request(word, function (nlp) {
        let connection = dl.getConnection(IP, function (u) {
            data = JSON.parse(u);
            promise_0ToNumber(nlp, 'arr')
                .then(() => {
                    console.log('218.js_367:', data); //words intent, tags
                    return matching();
                })
                .catch((err) => { console.log(err); return; })

                .then(res => {
                    // console.log('============');
                    // console.log(res);
                    // console.log('============');
                    return getTarget(res);
                })
                .catch(err => { console.log(err); return; })

                .then((res) => {
                    command = res[1];
                    orderCheck(res[1]);
                    console.log('218.js_386',res[1]);
                })
                .catch(err => { console.log(err); return; })
        });
        promise_0ToNumber(nlp, 'str')
            .then(() => { dl.writeData(connection, data); })
    });

}
function answer_roomInfo(result, order) {
    return new Promise((resolve, reject) => {

        var response;
        var color;
        var dim;
        var check;

        if (order.CHECK[1]) {
            if (result.Color.Red == 255 && result.Color.Green == 0 && result.Color.Blue == 0)
                color = "빨간색";
            else if (result.Color.Red == 0 && result.Color.Green == 255 && result.Color.Blue == 0)
                color = "초록색";
            else if (result.Color.Red == 0 && result.Color.Green == 0 && result.Color.Blue == 255)
                color = "파란색";
            else if (result.Color.Red == 255 && result.Color.Green == 255 && result.Color.Blue == 0)
                color = "노란색";
            else if (result.Color.Red == 255 && result.Color.Green == 255 && result.Color.Blue == 255)
                color = "하얀색";

            response = color + "입니다.";
            resolve( response);
        }
        else if (order.CHECK[3]) {
            //console.log(response);
            if (result.Bright != 0) {
                response = "켜져있습니다.";
            }
            else
                response = "꺼져있습니다.";
            resolve(response);
        }
        else if (order.CHECK[0]) {
            dim = result.Bright;
            resolve( "밝기는" + dim + "입니다.");
        }
    })

}
function answer_api(result, order) {
    
    var temper;
    var weather;
    var hum;
    var pm10;
    var pm2;
    var response;

    if (order.TEMPERATURE == true) {
        temper = result.ExtAPIData.find(k => {
            if (k.DataName == '온도')
                return k;
        }).DataValue;
        response = temper.toString() + "도 입니다.";
        return response;
    }
    else if (order.WEATHER == true) {
        weather = result.ExtAPIData.find(k => {
            if (k.DataName == '날씨')
                return k;
        }).DataValue;
        temper = result.ExtAPIData.find(k => {
            if (k.DataName == '온도')
                return k;
        }).DataValue;
        hum = result.ExtAPIData.find(k => {
            if (k.DataName == '습도')
                return k;
        }).DataValue;

        response = "날씨는 " + weather + "이고 온도는 " + temper.toString() + "도, 습도는 " + hum.toString() + "% 입니다.";
        return response;
    }
    else if (order.DUST == true) {
        pm10 = result.ExtAPIData.find(k => {
            if (k.DataName == '미세먼지')
                return k;
        }).DataValue;

        pm2 = result.ExtAPIData.find(k => {
            if (k.DataName == '초미세먼지')
                return k;
        }).DataValue;

        response = "미세먼지는 " + pm10 + "이고, 초미세먼지는 " + pm2 + " 입니다.";
        return response;
    }
    else {
        response = "잘 모르겠어요.";
        return response;
    }
}

function isMine1(roomName) {
    //내 룸이면 true 아니면 false
    return (LID.Model.RoomID == LID.Info.RoomInfo.find(k => {
        if (k.NickName === roomName)
            return k;
    }).RoomID ? true : false);
}
function isMine2(lightName) {
    //내 등이면 true 아니면 false
    if (lightName == null) {
        return false;
    } else {
        return (LID.Model.LightID === LID.Info.LightInfo.find(k => {
            if (k.NickName === lightName)
                return k;
        }).LightID ? true : false);
    }
}
function make_LUQ(order) {
    return new Promise((resolve, reject) => {
        var LUQ = {};
        LUQ.Format = 'LUQ';
        LUQ.Data = {};
        LUQ.Data.Time = new Date();
        LUQ.Data.Info = {};
        LUQ.Data.Info.LightID = LID.Model.LightID;
        if (order.Intent.includes('Off') || order.Intent.includes('off')) {
            LUQ.Data.Info.Bright = 0;
        } else {
            LUQ.Data.Info.Bright = (order.BRIGHT == 100 ? 100 : 20);
        }
        LUQ.Data.Info.Temp = "2700K:4500K:6500K";
        LUQ.Data.Info.Color = {};
        if (order.Intent.includes('Dimming')) {
            LUQ.Data.Info.Color.Red = LID.Status.Color.Red;
            LUQ.Data.Info.Color.Green = LID.Status.Color.Green;
            LUQ.Data.Info.Color.Blue = LID.Status.Color.Blue;
        } else if (order.Intent === 'Light_On' || 'Set_Color') {
            LID.Status.Color.Red = order.COLOR[0];
            LID.Status.Color.Green = order.COLOR[1];
            LID.Status.Color.Blue = order.COLOR[2];
            LUQ.Data.Info.Color.Red = order.COLOR[0];
            LUQ.Data.Info.Color.Green = order.COLOR[1];
            LUQ.Data.Info.Color.Blue = order.COLOR[2];
        }
        LUQ.Data.Info.BLE = LID.Model.BLE;
        //없으면 안하는걸로 해야함
        LUQ.Data.Info.Sensor_Related='LowLight';
        //
        //LUQ.Data.Info.Sensor//
        //B-Sensor ㅅㅂ
        if (order.PIR == 'ON' && order.CDS == 'ON') {
            LUQ.Data.Info.Sensor = 'BothOn';
            //piron, cdson
        }
        else if (order.PIR == 'ON') {
            LUQ.Data.Info.Sensor = 'MotionOnly';
            //pir on,
        }
        else if (order.CDS == 'ON') {
            LUQ.Data.Info.Sensor = 'LightOnly';
            //cds on
        }
        else {
            LUQ.Data.Info.Sensor = 'None';
            //pir off, cds off
        }
        LID.Model.Sensor = LUQ.Data.Info.Sensor;
        LUQ.Data.Info.VoiceControl = LID.Model.VoiceControl;
        LUQ.Data.Info.SmartControl = LID.Model.SmartControl;
        resolve(LUQ);
    })
}
function make_SUQ(order) {
    return new Promise((resolve, reject) => {
        let SUQ = {
            Format: "SUQ",
            Data: {
                RequestLight: {
                    "RoomID": 1,
                    "LightID": 1,
                },
                TargetLight: {
                    "RoomID": 2,
                    "LightID": 1,
                },
                "Control": {
                    "Bright": 0, // 0-100 (percent)
                    "Temp": "2700K:4500K:6500K",
                    "Color": {
                        "Red": "255",
                        "Green": "255",
                        "Blue": "255"
                    },
                    "BLE": {
                        "Status": "OFF", // { "ON", "OFF" }
                        "Connect": "010-1234-1234" // { "None", "Phone Number" }
                    },
                    "Sensor": "BothOn", //, { "OFF", "MotionOnly", "LightOnly", "BothOn" }
                    "Sensor_Related" : "LowLight", // { "No", "LowLight", "DetectMotion", "Both" }
                    "VoiceControl": "On", // { "On", "Off" }
                    "SmartControl": "Sensor_Mode" // { "Sensor_Mode", "AI_Mode", "Off" }
                },
                Time: {
                    "Type": "Delay", // { "Now", "Delay", "onTime", "Duration" }
                    "Delay": 10, // unit = minutes, 0: instantly
                    "onTime": "None", // "2017/02/01-14:23:01"
                    "SensorBased": "Motion", // { "None", "Motion", "Light" }
                    "Duration": 0 // unit = minutes
                },
                "Repeat": "None" // { "None", "Daily", "Weekdays", "Weekends", "Weekly" }
            }
        }
        //console.log('makeSUQ::::::', order);
        SUQ.Data.RequestLight.RoomID = LID.Model.RoomID;
        SUQ.Data.RequestLight.LightID = LID.Model.LightID;
        if (isMine1(order.ROOM[0])) //내방
            SUQ.Data.TargetLight.RoomID = LID.Model.RoomID;
        else {
            //다른방
            SUQ.Data.TargetLight.RoomID = LID.Info.RoomInfo.find(k => {
                if (k.NickName === order.ROOM[0]) {
                    return k;
                }
            }).RoomID;
            //console.log('218.js,,,477:', SUQ.Data.TargetLight.RoomID);
        }

        if (isMine2(order.LIGHT)) //내등
            SUQ.Data.TargetLight.LightID = LID.Model.LightID;
        else { //내방안의 남의 등? 또는 남의방안의 남의등
            SUQ.Data.TargetLight.LightID = LID.Info.LightInfo.find(k => {
                if (k.NickName === order.LIGHT) {
                    return k;
                }
            }).LightID;
            //console.log('218.js,,,487:', SUQ.Data.TargetLight.LightID);
        }

        SUQ.Data.Control.Bright = order.DIMMING;
        SUQ.Data.Control.Color.Red = order.COLOR[0];
        SUQ.Data.Control.Color.Green = order.COLOR[1];
        SUQ.Data.Control.Color.Blue = order.COLOR[2];
        SUQ.Data.Control.BLE = LID.Model.BLE;
        //SUQ.Data.Info.Sensor//
        if (order.PIR == 'ON' && order.CDS == 'ON') {
            SUQ.Data.Control.Sensor = 'BothOn';
        }
        else if (order.PIR == 'ON') {
            SUQ.Data.Control.Sensor = 'MotionOnly';
        }
        else if (order.CDS == 'ON') {
            SUQ.Data.Control.Sensor = 'LightOnly';
        }
        else {
            SUQ.Data.Control.Sensor = 'None';
        }
        SUQ.Data.Control.VoiceControl = LID.Model.VoiceControl;
        SUQ.Data.Control.SmartControl = LID.Model.SmartControl;

        if (order.DURATION != null) {
            //duration이 set되어 있으면
            SUQ.Data.Time.Type = 'Delay';
            SUQ.Data.Time.Delay = order.DURATION;
            SUQ.Data.Time.Duration = 0;
            SUQ.Data.Time.onTime = 'None';
            let temp;
            switch (SUQ.Data.Control.Sensor) {
                case 'BothOn':
                    temp = 'Both'
                    break;
                case 'MotionOnly':
                    temp = 'Motion'
                    break;
                case 'LightOnly':
                    temp = 'Light';
                    break;
                case 'None':
                    temp = 'None';
                    break;
            }
            SUQ.Data.Time.SensorBased = temp;
            SUQ.Data.Repeat = 'None'; //아직은 None
        } else {//now?
            SUQ.Data.Time.Type = 'Now';
            SUQ.Data.Time.Delay = 0;
            SUQ.Data.Time.Duration = 0;
            let temp;
            switch (SUQ.Data.Control.Sensor) {
                case 'BothOn':
                    temp = 'Both'
                    break;
                case 'MotionOnly':
                    temp = 'Motion'
                    break;
                case 'LightOnly':
                    temp = 'Light';
                    break;
                case 'None':
                    temp = 'None';
                    break;
            }
            SUQ.Data.Time.SensorBased = temp;
            SUQ.Data.Repeat = 'None'; //아직은 None
        }
        resolve(SUQ);

    })
}

function orderCheck(order) {
    //    console.log('218.js_405:', order);

    if (order.Intent === 'Weather') {
        makeEDQ_weather(order)
            .then(
                EDQ => {
                    console.log('218.js_569:EDQ', EDQ);
                    ws.send(JSON.stringify(EDQ));
                }
            )
    }
    else if (order.Intent === 'Room_Info') {
        makeEDQ_room({ LightID: 1, RoomID: 15, })
            .then(EDQ => {
                console.log('218.js_577:EDQ:', EDQ);
                ws.send(JSON.stringify(EDQ));
            })
        return;
    }
    else if (order.ROOM.length === 1 && isMine1(order.ROOM[0])) {
        //내방
        if (order.LIGHT != null && isMine2(order.LIGHT) && !order.DURATION) {
            //내 등 //지금수행
            make_LUQ(order)
                .then(LUQ_Data => {
                    order.COLOR.push(LUQ_Data.Data.Info.Bright);
                    console.log('218.js_479:', LUQ_Data);
                    //console.log('218.js_480:LUQ_Data.Data.Info.Color:', LUQ_Data.Data.Info.Color);
                    //console.log('218.js,481:LID.Status', LID.Status);
                    let arr = order.COLOR;
                    //console.log('218.js,arr:', arr);
                    //console.log('218.js_479:',order.COLOR);
                    //onoff(order.COLOR);
                    ws.send(JSON.stringify(LUQ_Data));
                })
                .catch(err => { console.log(err); })

        } else {
            //SUQ는 바깥에 있음
            make_SUQ(order)
                .then((res) => {
                    console.log('218.js,559:', res);
                    //console.log('218.js,560:', res.Data.Control.Color);
                    ws.send(JSON.stringify(res));
                })
                .catch(err => { console.log(err); })
        }
    } else if (order.ROOM.length === 1) {
        //남의 방 =>무조건 SUQ
        make_SUQ(order)
            .then((res) => {
                console.log('218.js,588:', res);
                //console.log('218.js,589:', res.Data.Control.Color);
                ws.send(JSON.stringify(res));
            })
            .catch(err => { console.log(err); })

    } else if (order.ROOM.length > 1) {
        let target = [];
        for (let i = 0; i < LID.Info.RoomInfo.length; i++) {
            if (order.ROOM.includes(LID.Info.RoomInfo[i].NickName)) {
                //해당 방이 포함되어있으면
                let roomid = LID.Info.RoomInfo[i].RoomID;
                for (let k = 0; k < LID.Info.LightInfo.length; k++) {
                    if (roomid == LID.Info.LightInfo[k].RoomID) {
                        //방의 light를 찾아라
                        target.push({ RoomID: roomid, LightID: LID.Info.LightInfo[k].LightID, LightNick: LID.Info.LightInfo[k].NickName, RoomNick: LID.Info.RoomInfo[i].NickName });
                    }
                }
            }
        }
        console.log('218.js,618', target);
        for (let i = 0; i < target.length; i++) {

            if (target[i].RoomID === LID.Model.RoomID && target[i].LightID === LID.Model.LightID) {
                //내 등
                order.LIGHT = target[i].LightNick;
                order.ROOM = [target[i].RoomNick];
                make_LUQ(order)
                    .then(LUQ_Data => {
                        let arr = order.COLOR;
                        console.log('218.js_626:', LUQ_Data);
                        //console.log('218.js_479:',order.COLOR);
                        //onoff(order.COLOR);
                        ws.send(JSON.stringify(LUQ_Data));
                    })
                    .catch(err => { console.log(err); })
            }
            else {
                order.LIGHT = target[i].LightNick;
                order.ROOM = [target[i].RoomNick];
                //console.log('!!!!!!!!!!', order.LIGHT, order.ROOM);
                make_SUQ(order)
                    .then((res) => {
                        console.log('218.js,588:', res);
                        //console.log('218.js,589:',res.Data.Control.Color);
                        ws.send(JSON.stringify(res));
                    })
                    .catch(err => { console.log(err); })

            }
        }

    }

    return;


}

function process_EDS_room(EDS, check) {
    let str = '';
    if (EDS.Result === 'Fail') {
        return '방 정보를 불러오는데 실패했습니다.';
    }
    if (check[0]) //dimming
        str += '밝기는 ' + EDS.LightData.Bright + '입니다.';
    if (check[1]) //color
        str += '색은 ' + EDS.LightData.Color
    //check[2]//sensor
    //onoffcheck[3]


}
function weather_(order) {
    //사용금지
    var weather = require('./weather.js');

    let a = new Date(order.TIME);
    let b = new Date();

    if (order.TEMPERATURE) {

        if (b - a > 0) {
            weather.now()
                .then((res => {
                    console.log('지금 구미시 형곡동의 온도는', res[1], '입니다.');
                }));
        } else if (b - a < 0) {//미래
            if (b.getDate() - a.getDate() == -1) {
                //내일
                weathertomorrow()
                    .then((res => {
                        console.log('내일 구미시 형곡동의 온도는', res[1], '입니다.');
                    }))
            } else {
                console.log('현재, 내일 날씨만 알 수 있습니다.');
            }
        }
    }
    if (order.DUST) {
        if (b - a > 0) {
            weather.PM(1)
                .then((res => {
                    console.log('지금 구미시 형곡동의 미세먼지는 ', res[0], '입니다.');
                }));
        } else if (b - a < 0) {//미래
            if (b.getDate() - a.getDate() == -1) {
                //내일
                weather.PM(2)
                    .then((res => {
                        console.log('내일 구미시 형곡동의 미세먼지는 ', res[0], '입니다.');
                    }))
            } else {
                console.log('현재, 내일 날씨만 알 수 있습니다.');
            }
        }
    }
    if (order.WEATHER) {
        if (b - a > 0) {
            weather.now()
                .then((res => {
                    console.log('지금 구미시 형곡동의 습도는 ', res[0], ' 온도는 ', res[1], ' 날씨는 ', res[2], ' 입니다.');
                }));
        } else if (b - a < 0) {//미래
            if (b.getDate() - a.getDate() == -1) {
                //내일
                weather.tomorrow()
                    .then((res => {
                        console.log('내일 구미시 형곡동의 습도는 ', res[0], ' 온도는 ', res[1], ' 날씨는 ', res[2], ' 입니다.');
                    }))
            } else {
                console.log('현재, 내일 날씨만 알 수 있습니다.');
            }
        }
    }
}

function makeEDQ_room(target) {
    return new Promise((resolve, reject) => {
        var EDQ = {
            Format: 'EDQ',
            DataType: "Light", // "API", "Light"
            APIInfo: { //의미없음.
                "ExtAPIID": 1, // 1: 날씨, 2: 미세먼지
                "ExtAPILoc": "구미",
                "ExtAPITime": "내일"
            },
            LightInfo: {
                "LightID": 1, //number
                "RoomID": 1, //number
            }
        }; ``
        EDQ.LightInfo.LightID = target.LightID;
        EDQ.LightInfo.RoomID = target.RoomID;
        resolve(EDQ);
    })
}

function makeEDQ_weather(order) { //return EDQ.
    return new Promise((resolve, reject) => {
        var EDQ =
            {
                Format: 'EDQ',
                DataType: "API", // "API", "Light"
                APIInfo: {
                    "ExtAPIID": 1, // 1: 날씨, 2: 미세먼지
                    "ExtAPILoc": "구미",
                    "ExtAPITime": "내일"
                },
                LightInfo: {
                    "LightID": 1, //number
                    "RoomID": 1, //number
                }
            };

        if (order.WEATHER)
            EDQ.APIInfo.ExtAPIID = 1;
        else if (order.DUST)
            EDQ.APIInfo.ExtAPIID = 2;
        EDQ.APIInfo.ExtAPILoc = '구미';
        if (order.TIME.getDate() === new Date().getDate()
        )
            EDQ.APIInfo.ExtAPITime = '오늘';
        else
            EDQ.APIInfo.ExtAPITime = '내일';

        resolve(EDQ);
    })

}


let promise1 = function (res) {
    return new Promise((resolve, reject) => {
        for (let i = 0; i < LID.Info.RoomInfo.length; i++) {
            if (LID.Info.RoomInfo[i].NickName === res[1].ROOM[0]) {
                res[0].Data.Target.RoomID = LID.Info.RoomInfo[i].RoomID;
                //console.log('218.js_642:promise1 success!');
                resolve();

            }
        }
        reject(res[1].ROOM[0] + ' is not in LID.Info.RoomInfo');
    })
}
let promise2 = function (res) {
    return new Promise((resolve, reject) => {
        if (res[1].LIGHT == null && res[1].ALL == true) {
            //해당 ROOM의 Light 모두 켜기
            //console.log('218.js_663: you have to turn on the light in', res[1].ROOM);
            resolve();
        }
        for (let i = 0; i < LID.Info.LightInfo.length; i++) {
            if (LID.Info.LightInfo[i].NickName === res[1].LIGHT) {
                res[0].Data.Target.LightID = LID.Info.LightInfo[i].LightID;
                //console.log('218.js_656:promise2 success!');
                resolve();
            }
        }
        reject(res[1].LIGHT + ' is not in LID.Info.LightInfo');

        //resolve();
    })
}

function getTarget(res) {
    return new Promise((resolve, reject) => {
        Promise.all([promise1(res), promise2(res)])
            .then(function () {
                resolve(res);
            })
            .catch(function (err) { console.log(err); reject(); })
    })
}

function LTQ_received(LTQ) {
    return new Promise((YY, NN) => {
        //Light Control Request
        //시간은 체크 안해도됨 서버에서 어련히 알아서 하겠지
        var LTQ_promise = new Promise((resolve, reject) => {
            LID.Status.Bright = LTQ.Data.Control.Bright;
            LID.Status.Color = LTQ.Data.Control.Color;
            LID.Model.Connect = LTQ.BLE;
            LID.Model.Sensor = LTQ.Data.Sensor;
            LID.Model.VoiceControl = LTQ.Data.VoiceControl;
            LID.Model.SmartControl = LTQ.Data.VoiceControl;
            if (LTQ.Data.RoomID != LID.Model.RoomID)
                reject('LTQ_Error:RoomID is diffrent.', LTQ.Data.RoomID, LID.Model.RoomID);
            if (LTQ.Data.LightID != LID.Model.LightID)
                reject('LTQ_Error:LightID is diffrent.', LTQ.Data.LightID, LID.Model.LightID);
            // 

        });

        var LC_promise = new Promise((resolve, reject) => {
            //직접 실행
            //onoff([14, 255, 200]); //white bgr
            resolve()
        });

        var LTS_Default = function () {
            LTS.Data.Info.Bright = LID.Status.Bright;
            LTS.Data.Info.Color = LID.Status.Color;
            LTS.Data.Info.BLE = LID.Model.Connect;
            LTS.Data.Info.Sensor = LID.Model.Sensor;
            LTS.Data.Info.VoiceControl = LID.Property.VoiceControl;
            LTS.Data.Info.SmartControl = LID.Property.SmartControl;
        }
        var LTS_promise2 = function () {
            //fail
        }

        LTQ_promise.then(resolve => { return LC_promise(); })
            .catch(err => { console.error(err); return; })

            .then(res => {
                LTS_Default();
                LTS.Data.Status = 'Success';
                //LTS send code
                YY(LTS);
            })   //success
            .catch(res => {
                LTS_Default();
                LTS.Data.Status = 'Fail';
                //LTS send
                NN(LTS);
            })   //fail
    })

}
