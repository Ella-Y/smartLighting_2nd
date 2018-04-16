/* 
    Writer: Youngsung Moon 
    Modified date: 2018-01-31
*/
let http=require('http');

let options={
	hostname:'202.31.200.71',
	port:'6666',
	path:'/nlp',
	method: 'POST',
};


module.exports.request=function(message,func){
	var req=http.request(options,function(response){
		console.log('setting:'+options.hostname+' port:',+options.port);
		let responseData='';
		response.on('data',function(chunk){
			responseData+=chunk;
		});
		response.on('end',function(){
			let dataobj=JSON.parse(responseData);
			// console.log('Raw Response: '+responseData);
			// console.log('Response: '+dataobj.words);

			func(dataobj);
		});
	});
	req.setHeader('Content-Type','application/json');
	let data={
		'words':message
	}
	req.write(JSON.stringify(data),'utf8',function(){
		console.log('send data');
	});
	req.end();
}

// console.log(typeof(request));