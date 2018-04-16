/* 
    Writer: Yeji Kim
    Modified date: 2018-01-31
*/
const request=require('request');
const fs=require('fs');
const omx=require('node-omxplayer');
const client_id = 'client_id';
const client_secret = 'client_secret';
const api_url = 'https://openapi.naver.com/v1/voice/tts.bin';
let options={
    url: api_url,
    form:{'speaker':'mijin', 'speed':'0', 'text':''},
    headers: {'X-Naver-Client-Id':client_id, 'X-Naver-Client-Secret': client_secret}
    
};
exeports.getSounds=function(message){
    options.form.text=message;
    let writeStream=fs.createWriteStream('./tts_file.mp3');
    let req=request.post(options).on('response',function(response){
        console.log(response.statusCode);
        console.log(response.headers['content-type']);
    });
    req.pipe(writeStream.on('finish',function(){
        console.log('finish');
        var player=omx('tts_file.mp3','local');
        player.play();
        player.on('close',function(){
            player.quit();
        });
    }));
};