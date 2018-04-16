/* 
    Writer: Yeji Kim
    Modified date: 2018-02-23
    Version: 0.1
*/
var ROOM = []; //RoomInfo NickName
var LIGHT = [];

const MAPCOLOR = {
    'WHITE': ['하얀', '흰색', '하얗게', '하얀색', '흰', 'white'],
    'BLACK': ['검은색', 'black'],
    'RED': ['빨간색', '빨간', '붉은', '붉', 'red'],
    'BLUE': ['파란색', '파란', '푸른', '파랗게', '파랗', 'blue'],
    'GREEN': ['초록색', '초록', 'green'],
    //'PINK': ['분홍색', '핑크', '분홍', '핑크색', 'pink'],
    //'PURPLE': ['자주', '보라', '보라색', 'purple'],
    'YELLOW': ['노란색', '노란', '노르스름한', '노랗게', 'yellow'],
    //'ORANGE': ['주황색', '주황', '주홍', '오렌지', '오랜지', '오렌지색', 'orange']
};

const COLOR = {
    'WHITE': [255, 255, 255], 'BLACK': [0, 0, 0], 'RED': [255, 0, 0], 'BLUE': [0, 0, 255], 'GREEN': [0, 255, 0], 'PINK': [243, 0, 142], 'PURPLE': [220, 40, 222], 'YELLOW': [255, 255, 0], 'ORANGE': [255, 127, 39]
};

const STATUS = {
    COLOR: ['24bColor', 'BW', '12bColor'],
    SENSOR: ["None", "MotionOnly", "LightOnly", "Both"],
}

const DEVICE = {
    ON: 'ON',
    OFF: 'OFF',
};

let LID;
function mappingColor(color_name) {
    let color_array;
    console.log('mappingColor:', color_name);
    for (let cl in MAPCOLOR) {
        if (MAPCOLOR[cl].indexOf(color_name) === -1)
            continue;
        else {
            color_array = COLOR[cl];
        }
    }
    return color_array;
}

function defaultCheck(data) {
    return new Promise((resolve, reject) => {
        //sensor
        if (LID.Property.Sensor === STATUS.SENSOR[0]) {
            if (data.PIR === DEVICE.ON || data.CDS === DEVICE.ON)
                reject("센서가 부착되어 있지 않은 모델입니다.");
        } else if (LID.Property.Sensor === STATUS.SENSOR[1]) { //PIR
            if (data.CDS === DEVICE.ON)
                reject('조도센서가 부착되어 있지 않은 모델입니다.');
        } else if (LID.Property.Sensor === STATUS.SENSOR[2]) { //CDS
            if (data.PIR === DEVICE.ON)
                reject('모션센서가 부착되어 있지 않은 모델입니다.');
        }

        if (ROOM.indexOf(data.ROOM[0]) === -1) {
            console.log(ROOM);
            console.log(data.ROOM);
            reject('room0:존재하지 않는 방입니다.');
        }
        if (ROOM.indexOf(data.ROOM[1]) === -1 && data.ROOM.length === 2) {
            reject('room1:존재하지 않는 방입니다.');
        }
        resolve();
    })
}


let LUQ =//Light Control Response
    {
        Format: "LUQ",
        Data: {
            Target: { LightID: 1, RoomID: 1, },
            Time: "2017-02-01T14:23.680Z",
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
                VoiceControl: "Yes", // { "Yes", "No" }
                SmartControl: "Yes" // { "Yes", "No" }
            }
        }
    }


var cluster = require('cluster');
// var addon=require('./addon.node');


var dimmingUp = {
    setDefault(order) {
        if (!order.LIGHT) {
            for (var k = 0; k < LID.Info.LightInfo.length; k++) {
                if (LID.Info.LightInfo[k].LightID === LID.Model.LightID)
                    order.LIGHT = LID.Info.LightInfo[k].NickName;
            }
        }
        if (order.ROOM.length == 0) {
            for (var k = 0; k < LID.Info.RoomInfo.length; k++) {
                if (LID.Info.RoomInfo[k].RoomID === LID.Model.RoomID)
                    order.ROOM.push(LID.Info.RoomInfo[k].NickName);
            }
        }
        if (!order.COLOR)
            order.COLOR = [LID.Status.Color.Red, LID.Status.Color.Green, LID.Status.Color.Blue];
        if (!order.PIR) {
            order.PIR = DEVICE.OFF;
        }
        if (!order.CDS) {
            order.CDS = DEVICE.OFF;
        }

        if (!order.DIMMING)
            order.DIMMING = LID.Status.Bright + 20;

        if (!order.ALL)
            order.ALL = false;
        if (!order.WEATHER)
            order.WEATHER = false;
        if (!order.DUST)
            order.DUST = false;
        if (!order.TEMPERATURE)
            order.TEMPERATURE = false;
        if (!order.CHECK)
            order.CHECK = [false, false, false, false];
        resolve();
    },
    checkModel(order) {
        return new Promise((resolve, reject) => {
            defaultCheck(order)
                .then(result => { resolve(); })
                .catch(err_msg => { reject(err_msg); })
        });
    },
    findContradiction(order) {
        return new Promise((resolve, reject) => {
            //이미 올릴수 있는 최대입니다.
            if (LID.Status.Bright >= 100) {
                LID.Status.Bright = 100;
                reject('밝기가 이미 최대입니다.');
            }
            resolve();
        });
    }
}
var weather = {
    setDefault(order) {
        return new Promise((resolve, reject) => {
            if (!order.LIGHT) {
                for (var k = 0; k < LID.Info.LightInfo.length; k++) {
                    if (LID.Info.LightInfo[k].LightID === LID.Model.LightID)
                        order.LIGHT = LID.Info.LightInfo[k].NickName;
                }
            }
            if (order.ROOM.length == 0) {
                for (var k = 0; k < LID.Info.RoomInfo.length; k++) {
                    if (LID.Info.RoomInfo[k].RoomID === LID.Model.RoomID)
                        order.ROOM.push(LID.Info.RoomInfo[k].NickName);
                }
            }

            if (!order.COLOR)
                order.COLOR = [LID.Status.Color.Red, LID.Status.Color.Green, LID.Status.Color.Blue];

            if (!order.PIR) {
                order.PIR = DEVICE.OFF;
            }

            if (!order.CDS) {
                order.CDS = DEVICE.OFF;
            }

            if (!order.DIMMING)
                order.DIMMING = LID.Status.Bright;

            if (!order.ALL)
                order.ALL = false;
            if (!order.WEATHER)
                order.WEATHER = false;
            if (!order.DUST)
                order.DUST = false;
            if (!order.TEMPERATURE)
                order.TEMPERATURE = false;
            if (!order.CHECK)
                order.CHECK = [false, false, false, false];
            resolve()
        })
    },
    checkModel(order) {
        return new Promise((resolve, reject) => {
            defaultCheck(order)
                .then(result => { resolve(); })
                .catch(err_msg => { reject(err_msg); })
        })
    },
}
var dimmingDown = {
    setDefault(order) {
        return new Promise((resolve, reject) => {


            if (order.ALL && order.ROOM.length === 0 && !order.LIGHT) {
                order.ROOM = ROOM; //LIGHT가 NULL이고 ROOM만있고 ALL셋되면 ROOM에 해당되는 LIGHT전체에게 명령전송
            }
            if (!order.LIGHT && !order.ALL && order.ROOM.length == 1) {
                //LIGHT이름만 넣으면 된다.
                let roomid = LID.Info.RoomInfo.find(k => {
                    if (k.NickName === order.ROOM[0]) {
                        return k;
                    }
                }).RoomID;

                order.LIGHT = LID.Info.LightInfo.find(k => {
                    if (k.RoomID === roomid) {
                        return k;
                    }
                }).NickName;

            }
            if (!order.LIGHT && order.ROOM.length === 0 && !order.ALL) { // 가장 가까운 등 한개만 켜자
                order.ALL = false;
                order.LIGHT = LID.Info.LightInfo.find(k => {
                    if (k.LightID === LID.Model.LightID && k.RoomID === LID.Model.RoomID)
                        return k;
                })
                let obj = LID.Info.LightInfo.find(k => {
                    if (k.LightID === LID.Model.LightID && k.RoomID == LID.Model.RoomID) {
                        return k;
                    }
                });
                order.LIGHT = obj.NickName;
                obj = LID.Info.RoomInfo.find(k => {
                    if (k.RoomID == LID.Model.RoomID)
                        return k;
                })
                order.ROOM.push(obj.NickName);
                if (order.LIGHT == undefined) {
                    reject('sampleslot 555:something wrong Plz check.');
                }
            }
            if (order.ROOM.length === 0 && !order.LIGHT) {
                let obj = LID.Info.LightInfo.find(k => {
                    if (k.LightID === LID.Model.LightID && k.RoomID == LID.Model.RoomID) {
                        return k;
                    }
                });
                order.LIGHT = obj.NickName;
                obj = LID.Info.RoomInfo.find(k => {
                    if (k.RoomID == LID.Model.RoomID)
                        return k;
                })
                order.ROOM.push(obj.NickName);
                if (order.LIGHT == undefined) {
                    reject('sampleslot 600:something wrong Plz check.');
                }
            }
            // if (!order.LIGHT) {
            //     for (var k = 0; k < LID.Info.LightInfo.length; k++) {
            //         if (LID.Info.LightInfo[k].LightID === LID.Model.LightID)
            //             order.LIGHT = LID.Info.LightInfo[k].NickName;
            //     }
            // }
            // if (order.ROOM.length == 0) {
            //     for (var k = 0; k < LID.Info.RoomInfo.length; k++) {
            //         if (LID.Info.RoomInfo[k].RoomID === LID.Model.RoomID)
            //             order.ROOM.push(LID.Info.RoomInfo[k].NickName);
            //     }
            // }
            if (!order.COLOR)
                order.COLOR = [LID.Status.Color.Red, LID.Status.Color.Green, LID.Status.Color.Blue];
            if (!order.PIR) {
                order.PIR = DEVICE.OFF;
            }
            if (!order.CDS) {
                order.CDS = DEVICE.OFF;
            }

            if (!order.DIMMING)
                order.DIMMING = LID.Status.Bright - 20;

            if (!order.ALL)
                order.ALL = false;
            if (!order.WEATHER)
                order.WEATHER = false;
            if (!order.DUST)
                order.DUST = false;
            if (!order.TEMPERATURE)
                order.TEMPERATURE = false;
            if (!order.CHECK)
                order.CHECK = [false, false, false, false];
            resolve();
        })
    },
    checkModel(order) {
        return new Promise((resolve, reject) => {
            defaultCheck(order)
                .then(result => { resolve(); })
                .catch(err_msg => { reject(err_msg); })
        });
    },
    findContradiction(order) {
        return new Promise((resolve, reject) => {
            //이미 최저입니다.
            if (LID.Status.Bright <= 0) {
                LID.Status.Bright = 0;
                reject('밝기가 이미 최소입니다.');
            }
            resolve();
        });
    }
}

var setColor = {
    setDefault(order) {
        return new Promise((resolve, reject) => {
            if (order.ALL && order.ROOM.length === 0 && !order.LIGHT) {
                order.ROOM = ROOM; //LIGHT가 NULL이고 ROOM만있고 ALL셋되면 ROOM에 해당되는 LIGHT전체에게 명령전송
            }
            if (!order.LIGHT && !order.ALL && order.ROOM.length == 1) {
                //LIGHT이름만 넣으면 된다.
                let roomid = LID.Info.RoomInfo.find(k => {
                    if (k.NickName === order.ROOM[0]) {
                        return k;
                    }
                }).RoomID;

                order.LIGHT = LID.Info.LightInfo.find(k => {
                    if (k.RoomID === roomid) {
                        return k;
                    }
                }).NickName;

            }
            if (!order.LIGHT && order.ROOM.length === 0 && !order.ALL) { // 가장 가까운 등 한개만 켜자
                order.ALL = false;
                order.LIGHT = LID.Info.LightInfo.find(k => {
                    if (k.LightID === LID.Model.LightID && k.RoomID === LID.Model.RoomID)
                        return k;
                })
                let obj = LID.Info.LightInfo.find(k => {
                    if (k.LightID === LID.Model.LightID && k.RoomID == LID.Model.RoomID) {
                        return k;
                    }
                });

                order.LIGHT = obj.NickName;
                obj = LID.Info.RoomInfo.find(k => {
                    if (k.RoomID == LID.Model.RoomID)
                        return k;
                })
                order.ROOM.push(obj.NickName);
                if (order.LIGHT == undefined) {
                    reject('sampleslot 555:something wrong Plz check.');
                }
            }
            if (!order.COLOR)
                order.COLOR = [LID.Status.Color.Red, LID.Status.Color.Green, LID.Status.Color.Blue];

            if (!order.PIR) {
                order.PIR = DEVICE.OFF;
            }
            if (!order.CDS) {
                order.CDS = DEVICE.OFF;
            }

            if (!order.DIMMING)
                order.DIMMING = 100;

            if (!order.ALL)
                order.ALL = false;
            if (!order.WEATHER)
                order.WEATHER = false;
            if (!order.DUST)
                order.DUST = false;
            if (!order.TEMPERATURE)
                order.TEMPERATURE = false;
            if (!order.CHECK)
                order.CHECK = [false, false, false, false];

            resolve(order);
        });
    },
    checkModel(order) {
        return new Promise((resolve, reject) => {
            defaultCheck(order)
                .then(result => {
                    if (LID.Property.Color == STATUS.COLOR[1])
                        reject('색깔을 설정할 수 없는 모델입니다.');
                    resolve();
                })
                .catch(err_msg => { reject(err_msg); });

        });
    },
    findContradiction(order) {
        return new Promise((resolve, reject) => {
            if (typeof (order.COLOR) === 'string') {
                order.COLOR = mappingColor(order.COLOR);
                if (order.COLOR != [0, 0, 0]) {
                    reject('color:', order.COLOR, ' 설정되어있지 않은 색깔입니다.');
                }
            }
            resolve();
        });
    }
}

var SensorOn = {
    checkOn() {
        return new Promise((resolve, reject) => {
            let pir = (LID.Property.Sensor != 'None' || LID.Property.Sensor != 'LightOnly');
            let cds = (LID.Property.Sensor != 'None' || LID.Property.Sensor != 'MotionOnly');
            if (LID.Property.Sensor == STATUS.SENSOR[3]) { //Both
                if (pir && cds)
                    resolve(true);
                else
                    resolve(false);
            } else if (LID.Property.Sensor === STATUS.SENSOR[2]) { //LightOnly
                if (cds) resolve(true);
                else resolve(false);
            } else if (LID.Property.Sensor === STATUS.SENSOR[1]) { //Motion only
                if (pir) resolve(true);
                else resolve(false);
            } else { //none
                resolve(false);
            }
        })
    },
    setDefault(order) {
        return new Promise((resolve, reject) => {
            if (!order.LIGHT) {
                for (var k = 0; k < LID.Info.LightInfo.length; k++) {
                    if (LID.Info.LightInfo[k].LightID === LID.Model.LightID)
                        order.LIGHT = LID.Info.LightInfo[k].NickName;
                }
            }
            if (order.ROOM.length == 0) {
                for (var k = 0; k < LID.Info.RoomInfo.length; k++) {
                    if (LID.Info.RoomInfo[k].RoomID === LID.Model.RoomID)
                        order.ROOM.push(LID.Info.RoomInfo[k].NickName);
                }
            }

            if (!order.COLOR)
                order.COLOR = [LID.Status.Color.Red, LID.Status.Color.Green, LID.Status.Color.Blue];

            //sensor
            if (!order.PIR) {
                if ((LID.Property.Sensor === STATUS.SENSOR[0] || LID.Property.Sensor === STATUS.SENSOR[2]))
                    order.PIR = DEVICE.OFF;
                else order.PIR = DEVICE.ON;
            }

            if (!order.CDS) {
                if ((LID.Property.Sensor === STATUS.SENSOR[0] || LID.Property.Sensor === STATUS.SENSOR[1]))
                    order.CDS = DEVICE.OFF;
                else order.CDS = DEVICE.ON;
            }

            if (!order.ALL)
                order.ALL = false;
            else {
                order.PIR = DEVICE.ON;
                order.CDS = DEVICE.ON;
            }
            if (!order.WEATHER)
                order.WEATHER = false;
            if (!order.DUST)
                order.DUST = false;
            if (!order.TEMPERATURE)
                order.TEMPERATURE = false;
            if (!order.CHECK)
                order.CHECK = [false, false, false, false];
            order.DIMMING = 0;
            resolve();
        });
    },
    checkModel(order) {
        return new Promise((resolve, reject) => {
            defaultCheck(order)
                .then(result => { })
                .catch(err_msg => { reject(err_msg); })
            resolve();
        })
    },
    findContradiction(order) {
        return new Promise((resolve, reject) => {
            this.checkOn().then(res => {
                if (res)
                    reject('센서가 이미 켜져있습니다.');
                resolve();
            })
        });
    }
}

var SensorOff = {
    setDefault(order) {
        return new Promise((resolve, reject) => {
            if (!order.LIGHT) {
                for (var k = 0; k < LID.Info.LightInfo.length; k++) {
                    if (LID.Info.LightInfo[k].LightID === LID.Model.LightID)
                        order.LIGHT = LID.Info.LightInfo[k].NickName;
                }
            }

            if (order.ROOM.length == 0) {
                for (var k = 0; k < LID.Info.RoomInfo.length; k++) {
                    if (LID.Info.RoomInfo[k].RoomID === LID.Model.RoomID)
                        order.ROOM.push(LID.Info.RoomInfo[k].NickName);
                }
            }

            if (!order.COLOR)
                order.COLOR = [LID.Status.Color.Red, LID.Status.Color.Green, LID.Status.Color.Blue];

            //sensor
            if (!order.PIR) {
                if ((LID.Property.Sensor === STATUS.SENSOR[0] || LID.Property.Sensor === STATUS.SENSOR[2]))
                    order.PIR = DEVICE.ON;
                else order.PIR = DEVICE.OFF;
            }

            if (!order.CDS) {
                if ((LID.Property.Sensor === STATUS.SENSOR[0] || LID.Property.Sensor === STATUS.SENSOR[1]))
                    order.CDS = DEVICE.ON;
                else order.CDS = DEVICE.OFF;
            }

            if (!order.ALL)
                order.ALL = false;
            else {
                order.PIR = DEVICE.OFF;
                order.CDS = DEVICE.OFF;
            }

            if (!order.WEATHER)
                order.WEATHER = false;
            if (!order.DUST)
                order.DUST = false;
            if (!order.TEMPERATURE)
                order.TEMPERATURE = false;
            if (!order.CHECK)
                order.CHECK = [false, false, false, false];
            order.DIMMING = 0;
            resolve();
        });
    },
    checkModel(order) {
        return new Promise((resolve, reject) => {
            defaultCheck(order)
                .then(result => { })
                .catch(err_msg => { reject(err_msg); })
            resolve();
        });
    },
    findContradiction(order) {
        return new Promise((resolve, reject) => {
            SensorOn.checkOn().then(res => {
                if (!res)
                    reject('센서가 이미 꺼져있습니다.');
                resolve();
            })
        });
    }
}

var LightOff = {
    setDefault(order) {
        return new Promise(function (resolve, reject) {

            if (!order.COLOR)
                order.COLOR = [0, 0, 0];
            if (!order.PIR)
                order.PIR = DEVICE.OFF;
            if (!order.CDS)
                order.CDS = DEVICE.OFF;
            if (order.ALL && order.ROOM.length === 0 && !order.LIGHT) {
                order.ROOM = ROOM; //LIGHT가 NULL이고 ROOM만있고 ALL셋되면 ROOM에 해당되는 LIGHT전체에게 명령전송
            }
            if (!order.LIGHT && !order.ALL && order.ROOM.length == 1) {
                //LIGHT이름만 넣으면 된다.
                let roomid = LID.Info.RoomInfo.find(k => {
                    if (k.NickName === order.ROOM[0]) {
                        return k;
                    }
                }).RoomID;

                order.LIGHT = LID.Info.LightInfo.find(k => {
                    if (k.RoomID === roomid) {
                        return k;
                    }
                }).NickName;

            }
            if (!order.LIGHT && order.ROOM.length === 0 && !order.ALL) { // 가장 가까운 등 한개만 켜자
                order.ALL = false;
                order.LIGHT = LID.Info.LightInfo.find(k => {
                    if (k.LightID === LID.Model.LightID && k.RoomID === LID.Model.RoomID)
                        return k;
                })
                let obj = LID.Info.LightInfo.find(k => {
                    if (k.LightID === LID.Model.LightID && k.RoomID == LID.Model.RoomID) {
                        return k;
                    }
                });
                order.LIGHT = obj.NickName;
                obj = LID.Info.RoomInfo.find(k => {
                    if (k.RoomID == LID.Model.RoomID)
                        return k;
                })
                order.ROOM.push(obj.NickName);
                if (order.LIGHT == undefined) {
                    reject('sampleslot 555:something wrong Plz check.');
                }
            }

            if (!order.WEATHER)
                order.WEATHER = false;
            if (!order.DUST)
                order.DUST = false;
            if (!order.TEMPERATURE)
                order.TEMPERATURE = false;
            if (!order.CHECK)
                order.CHECK = [false, false, false, false];


            if (order.ROOM.length === 0 && !order.LIGHT) {
                let obj = LID.Info.LightInfo.find(k => {
                    if (k.LightID === LID.Model.LightID && k.RoomID == LID.Model.RoomID) {
                        return k;
                    }
                });
                order.LIGHT = obj.NickName;
                obj = LID.Info.RoomInfo.find(k => {
                    if (k.RoomID == LID.Model.RoomID)
                        return k;
                })
                order.ROOM.push(obj.NickName);
                if (order.LIGHT == undefined) {
                    reject('sampleslot 600:something wrong Plz check.');
                }
            }
            if (order.ROOM.length != 0 && !order.LIGHT && !order.ALL) {

            }
            order.DIMMING = 0;

            if (!order.ALL) order.ALL = false;
            resolve(order);

        });

    },
    checkModel(order) {
        return new Promise((resolve, reject) => {
            defaultCheck(order)
                .then(() => { resolve(order) })
                .catch(err_msg => { reject(err_msg); });

        });
    },
    findContradiction(order) {
        return new Promise((resolve, reject) => {
            if (order.DIMMING === 100) {
                reject('dimming:100 수행할 수 없는 동작입니다.');
            }

            if (typeof (order.COLOR) === 'string') {
                order.COLOR = mappingColor(order.COLOR);
            }
            if (order.COLOR != [0, 0, 0]) {
                reject('color:', order.COLOR, ' 수행할 수 없는 동작입니다.');
            }

            //Time //시간이 과거가 아닌지 체크
            if (new Date() - order.TIME >= 0) { //the past
                reject('time:present 과거의 시간입니다.');
            }
            resolve(order);
        })
    }
}

var LightOn = {
    setDefault(order) {
        return new Promise(function (resolve, reject) {
            if (!order.COLOR)
                order.COLOR = [255, 255, 255];
            if (!order.PIR)
                order.PIR = DEVICE.OFF;
            if (!order.CDS)
                order.CDS = DEVICE.OFF;
            if (order.ALL && order.ROOM.length === 0 && !order.LIGHT) {
                order.ROOM = ROOM; //LIGHT가 NULL이고 ROOM만있고 ALL셋되면 ROOM에 해당되는 LIGHT전체에게 명령전송
            }

            if (!order.LIGHT && order.ROOM.length === 0 && !order.ALL) { // 가장 가까운 등 한개만 켜자
                order.ALL = false;
                //order.LIGHT = LID.Info.LightInfo.find(k => {
                let obj = LID.Info.LightInfo.find(k => {
                    if (k.LightID === LID.Model.LightID && k.RoomID == LID.Model.RoomID) {
                        return k;
                    }
                });
                order.LIGHT = obj.NickName;
                obj = LID.Info.RoomInfo.find(k => {
                    if (k.RoomID == LID.Model.RoomID)
                        return k;
                })
                order.ROOM.push(obj.NickName);
                if (order.LIGHT == undefined) {
                    reject('sampleslot 651:something wrong Plz check.');
                }
                //})
            }

            if (!order.WEATHER)
                order.WEATHER = false;
            if (!order.DUST)
                order.DUST = false;
            if (!order.TEMPERATURE)
                order.TEMPERATURE = false;
            if (!order.CHECK)
                order.CHECK = [false, false, false, false];


            if (order.ROOM.length != 0 && !order.LIGHT) {
                //해당 ROOM의 Light 모두 켜기
                order.ALL = true;
                // let obj = LID.Info.LightInfo.find(k => {
                //     if (k.LightID === LID.Model.LightID && k.RoomID == LID.Model.RoomID) {
                //         return k;
                //     }
                // });
                // order.LIGHT=obj.NickName;
                // obj = LID.Info.RoomInfo.find(k => {
                //     if (k.RoomID == LID.Model.RoomID)
                //         return k;
                // })
                // order.ROOM.push(obj.NickName);
                // if (order.LIGHT == undefined) {
                //     reject('sampleslot 600:something wrong Plz check.');
                // }
            }
            order.DIMMING = 100;

            if (!order.ALL) order.ALL = false;
            resolve(order);

        });

    },
    findContradiction(data) {
        return new Promise((resolve, reject) => {
            if (data.DIMMING === 0) {
                reject('dimming:0 수행할 수 없는 동작입니다.');
            }

            //color
            if (typeof (data.COLOR) === 'string') {
                data.COLOR = mappingColor(data.COLOR);
            }
            if (data.COLOR === [0, 0, 0]) {
                reject('color:black 수행할 수 없는 동작입니다.');
            }

            //Time //시간이 과거가 아닌지 체크
            if (new Date() - data.TIME < 0) { //the past
                console.log('1', new Date());
                console.log('2', data.TIME);
                console.log('3', new Date() - data.TIME);
                reject('time:present 과거의 시간입니다.');
            }
            resolve(data);
        });

    },
    checkModel(data) {
        return new Promise(function (resolve, reject) {
            defaultCheck(data)
                .then(() => {
                    //color
                    if (LID.Property.Color === STATUS.COLOR[1]) {
                        if (MAPCOLOR.WHITE.indexOf(data.COLOR) === -1) {
                            reject('color:해당 모델은 색깔을 설정할 수 없습니다.');
                        }
                    }
                    resolve(data);
                })
                .catch(err_msg => { reject(err_msg); });

        });
    }
}

var LightOnDuration = {
    setDefault(order) {
        return new Promise((resolve, reject) => {
            if (!order.LIGHT) {
                for (var k = 0; k < LID.Info.LightInfo.length; k++) {
                    if (LID.Info.LightInfo[k].LightID === LID.Model.LightID)
                        order.LIGHT = LID.Info.LightInfo[k].NickName;
                }
            }
            if (order.ROOM.length == 0) {
                for (var k = 0; k < LID.Info.RoomInfo.length; k++) {
                    if (LID.Info.RoomInfo[k].RoomID === LID.Model.RoomID)
                        order.ROOM.push(LID.Info.RoomInfo[k].NickName);
                }
            }
            if (!order.COLOR)
                order.COLOR = [255, 255, 255];
            if (!order.PIR)
                order.PIR = DEVICE.OFF;
            if (!order.CDS)
                order.CDS = DEVICE.OFF;
            if (!order.ALL)
                order.ALL = false;
            if (!order.WEATHER)
                order.WEATHER = false;
            if (!order.DUST)
                order.DUST = false;
            if (!order.TEMPERATURE)
                order.TEMPERATURE = false;
            if (!order.CHECK)
                order.CHECK = [false, false, false, false];
            order.DIMMING = 100;
            resolve();
        });
    },

    checkModel(order) {
        return new Promise(function (resolve, reject) {
            defaultCheck(order)
                .then(() => {
                    resolve();
                })
                .catch(err_msg => { reject(err_msg); });

        });
    }
}


exports.matching = function matching(data, LIDm) {

    LID = LIDm;
    //console.log('sampleslot_756:',LID);
    LIGHT = ['큰등', '무드등', '안방등', '작은방등'];
    ROOM = ['거실', '안방', '작은방'];
    // for (let k = 0; k < LID.Info.RoomInfo.length; k++) {
    //     ROOM.push(LID.Info.RoomInfo[k].NickName);
    // }

    let order = {
        Intent: null,
        LIGHT: null, ROOM: [],
        TIME: null,
        DIMMING: null, COLOR: null,
        PIR: null, CDS: null, //DEVICE.ON/OFF
        ALL: null, //true or false
        WEATHER: null, DUST: null, TEMPERATURE: null,
        CHECK: [false, false, false, false], //dim,color,sensor,status
        DURATION: null,
    };
    let check1 = false;
    let name1;
    let name2;
    let check2 = false;
    order.Intent = data.intent;
    arr = data.words;
    order.TIME = new Date();
    LUQ.Data.Time = new Date();//.toISOString();
    for (let i = 0; i < data.tags.length; i++) {
        //다시
        if ('B-RoomA' == data.tags[i]) { //작은 방
            check1 = true;
            name1 = data.words[i];
        }
        else if ('I-RoomA' == data.tags[i]) {
            check2 = true;
            name2 = data.words[i];
        }
        else if (data.tags[i] == 'I-Time.hour' && data.words[i + 1] === '후') {
            order.DURATION = parseInt(data.words[i - 1]) * 60;
        }
        else if (data.tags[i] == 'I-Time.minutes' && data.words[i + 1] === '후') {
            order.DURATION = parseInt(data.words[i - 1]);
        }
        else if ('B-Light' === data.tags[i]) {
            if (data.words[i] === '무드등') {
                order.LIGHT = '무드등'
            } else {
                if (data.words[i] === '등') {
                    order.LIGHT = data.words[i - 1] + data.words[i];
                    if (data.words[i - 1] != '무드') {
                        order.ROOM.push(data.words[i - 1]);
                    }
                }
            }
        }
        //오류처리
        else if ('B-Color' === data.tags[i]) {
            if (data.words[i] === '무드등') {
                order.LIGHT = '무드등';
                data.tags[i] = 'O';
            } else {
                order.COLOR = data.words[i];
            }

        }

        else if ('O' === data.tags[i] && '등' === data.words[i]) {
            //작은 방 등
            order.LIGHT = data.words[i - 2] + data.words[i - 1] + data.words[i];
            order.ROOM.push(data.words[i - 2] + data.words[i - 1]);
        }

        //console.log(data.tags[i],'data.tags[i]');
        // if ('I-RoomA' === data.tags[i]) {
        //     order.ROOM[0] = order.ROOM[0] + data.words[i];
        // }
        //  else if ('B-RoomA' === data.tags[i]) {
        //     order.ROOM.push(data.words[i]);
        // } else if ('B-Color' === data.tags[i]) {
        //     order.COLOR = data.words[i];

        // else if (data.tags[i].includes('B-Time')) {

        //     if (order.Intent.includes('duration')) {
        //         LUQ.Format = 'SUQ';

        //         if (data.tags[i].includes('hour')) {
        //             //order.TIME.setHours(order.TIME.getHours()+parseInt(data.words[i]));
        //             order.DURATION = parseInt(data.words[i]) * 60;
        //             //UTC GMT +09:00
        //         }
        //         if (data.tags[i].includes('min')) {
        //             //order.TIME.setMinutes(order.TIME.getMinutes()+parseInt(data.words[i]));
        //             order.DURATION = parseInt(data.words[i]);
        //         }
        //     } else {

        //         if (data.tags[i].includes('date')) {
        //             if (arr[i] === '내일') {
        //                 order.TIME.setDate(order.TIME.getDate() + 1);
        //             } else if (arr[i] === '모레') {
        //                 order.TIME.setDate(order.TIME.getDate() + 2);
        //             } else if (arr[i] === '어제') {
        //                 order.TIME.setDate(order.TIME.getDate() - 1);
        //             }
        //         }
        //         if (data.tags[i].includes('hour')) {
        //             order.TIME.setHours(parseInt(data.words[i]));
        //             order.TIME.setSeconds(0, 0);
        //             //UTC GMT +09:00
        //         }
        //         if (data.tags[i].includes('min')) {
        //             order.TIME.setMinutes(parseInt(data.words[i]));
        //         }
        //     }
        // }
        else if (data.tags[i].includes('B-Time')) {
            if (data.tags[i].includes('hour')) {

                order.DURATION = parseInt(data.words[i]) * 60;

            }
            if (data.tags[i].includes('min')) {

                order.DURATION = parseInt(data.words[i]);
            }
        }
        if (data.tags[i] === 'B-All')
            order.ALL = true;

        if (data.tags[i].includes('B-Check')) {
            switch (data.tags[i].charAt(7)) {
                case 'D': //dimming
                    order.CHECK[0] = true;
                    break;
                case 'C': //color
                    order.CHECK[1] = true;
                    break;
                case 'S': //sensor
                    order.CHECK[2] = true;
                    break;
                case 'L': //onoff check
                    order.CHECK[3] = true;
                    break;
            }
        }

        if (data.tags[i] === 'B-Temp') {
            order.TEMPERATURE = true;
        }
        if (data.tags[i] === 'B-Dust') {
            order.DUST = true;
        }
        if (data.tags[i] === 'B-Weather') {
            order.WEATHER = true;
        }
        if (data.tags[i] === 'B-PIR') {
            order.PIR = DEVICE.ON;
        }

        if (data.tags[i] === 'B-CDS') {
            order.CDS = DEVICE.ON;
        }

    }
    if (check1 && check2) {
        order.ROOM.push(name1 + name2);
    }
    if (!LIGHT.includes(order.LIGHT)) { //없는 Light 걸러내기
        order.LIGHT = null;
    }
    for (let k = 0; k < order.ROOM.length; k++) { //없는 ROOM 걸러내기
        if (!ROOM.includes(order.ROOM[k])) {
            order.ROOM.splice(k, 1);
            k = -1;
        }
    }

    if (order.Intent === 'Light_On') {
        LightOn.setDefault(order)
            .then(order => { return LightOn.findContradiction(order) })
            .catch(err => { console.log('sampleslot 867:', err); return; })
            .then(data => {
                LUQ.Data.Info.Bright = data.DIMMING;
                LUQ.Data.Info.Color.Red = data.COLOR[0];
                LUQ.Data.Info.Color.Green = data.COLOR[1];
                LUQ.Data.Info.Color.Blue = data.COLOR[2];
            })
    }
    else if (order.Intent === 'Light_Off') {
        LightOff.setDefault(order)
            .then(order => { return LightOff.checkModel(order); })
            .catch(err => { console.log(err); })

            .then(order => { return LightOff.findContradiction(order); })
            .catch(err => { console.log(err); })

    }
    else if (order.Intent === 'Set_Color') {

        setColor.setDefault(order)
            .then((order) => { return setColor.checkModel(order); })
            .catch(err_msg => { console.error(err_msg); })

            .then(() => { return setColor.findContradiction(order); })
            .catch(err_msg => { console.error(err_msg); })

            .then(() => {
                console.log('sampleSlot:949_Success!');
            })
            .catch(err => { console.log(err); })
    }
    else if (order.Intent === 'Sensor_On') {
        SensorOn.setDefault(order)
            .then(() => { return SensorOn.checkModel(order); })
            .catch(err_msg => { console.error(err_msg); })
            .then(() => { return SensorOn.findContradiction(order); })
            .catch(err_msg => { console.error(err_msg); })

            .then(() => {
                //console.log('sampleSlot:962',order);
            });
    }
    else if (order.Intent === 'Weather') {
        weather.setDefault(order)
            .then(() => { return weather.checkModel(order); })
            .catch(err_msg => { console.error(err_msg); })
    }
    else if (order.Intent.includes('duration')) {

        LightOnDuration.setDefault(order)
            .then(() => { return LightOnDuration.checkModel(order); })
            .catch(err => { console.log(err); })

    }
    else if (order.Intent === 'Dimming_down') {
        dimmingDown.setDefault(order)
            .then(() => { })
            .catch(err => { console.log(err); })
    }
    else if (order.Intent === 'Room_Info') {
        roomInfo.setDefault(order)
            .then(() => { })
            .catch(() => { })
    }

    return [LUQ, order];
}

var roomInfo = {
    setDefault(order) {
        return new Promise((resolve, reject) => {
            if (order.ALL && order.ROOM.length === 0 && !order.LIGHT) {
                order.ROOM = ROOM; //LIGHT가 NULL이고 ROOM만있고 ALL셋되면 ROOM에 해당되는 LIGHT전체에게 명령전송
            }
            if (!order.LIGHT && !order.ALL && order.ROOM.length == 1) {
                //LIGHT이름만 넣으면 된다.
                let roomid = LID.Info.RoomInfo.find(k => {
                    if (k.NickName === order.ROOM[0]) {
                        return k;
                    }
                }).RoomID;

                order.LIGHT = LID.Info.LightInfo.find(k => {
                    if (k.RoomID === roomid) {
                        return k;
                    }
                }).NickName;

            }
            if (!order.LIGHT && order.ROOM.length === 0 && !order.ALL) { // 가장 가까운 등 한개만 켜자
                order.ALL = false;
                order.LIGHT = LID.Info.LightInfo.find(k => {
                    if (k.LightID === LID.Model.LightID && k.RoomID === LID.Model.RoomID)
                        return k;
                })
                let obj = LID.Info.LightInfo.find(k => {
                    if (k.LightID === LID.Model.LightID && k.RoomID == LID.Model.RoomID) {
                        return k;
                    }
                });
                order.LIGHT = obj.NickName;
                obj = LID.Info.RoomInfo.find(k => {
                    if (k.RoomID == LID.Model.RoomID)
                        return k;
                })
                order.ROOM.push(obj.NickName);
                if (order.LIGHT == undefined) {
                    reject('sampleslot 555:something wrong Plz check.');
                }
            }
            resolve();
        })
    },

}