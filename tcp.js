/* 
    Writer: Youngsung Moon, Yeji Kim
    Modified date: 2018-02-12
*/
let net=require('net');
const ip='202.31.200.71';
const port=5571;


exports.getConnection=function getConnection(ip,func){
    let client=net.connect({port:port,host:ip},function(){
        this.setTimeout(5000);
        this.setEncoding('utf8');
        console.log('connect successfully');

        this.on('data',function(data){
            //console.log("From server:"+data.toString());
            func(data);
            this.end();
        });

        this.on('error',function(err){
            console.log('Socket Error:'+JSON.stringify(err));
        });
        
        this.on('timeout', function() {
            console.log('Socket Timed Out');
        });
    
        this.on('close', function() {
            console.log('Socket Closed');
        });    
    });
    return client;
}

exports.writeData=function writeData(socket,data){
    data=(JSON.stringify(data));

    let success=!socket.write(data);
    if(!success){
        (function(socket,data){
            socket.once('drain',function(){
                writeData(socket,data);   
            });
        })(socket,data);
    }
}

// var con=getConnection(ip);
// writeData(con,jsondata);
