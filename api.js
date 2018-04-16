/* 날씨 API */
const express=require('express');
const app=express();
const request=require('request');
const fs=require('fs');
const http = require( "http" );
const jsonQuery=require('json-query');
const urlencode=require('urlencode');


//날짜 계산용 함수
function CalDate()
{
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth()+1; //January is 0!
  var yyyy = today.getFullYear();
  if(dd<10) {
      dd='0'+dd
  }
  if(mm<10) {
      mm='0'+mm
  }
  return yyyy+mm+dd;
}

function CalDateWithDash()//-붙은 날짜 반환
{
  var maxday=[31,28,31,30,31,30,31,31,30,31,30,31];
  var today = new Date();
  var h=today.getHours();
  var dd = today.getDate();
  var mm = today.getMonth()+1; //January is 0!
  var yyyy = today.getFullYear();
  if (h<=5)//6시 이전이면 하루 이전 날짜 반환
  {
    if ((dd--)==0)//오늘이 1일이면 전 달 마지막 날짜로
    {
      if ((mm--)==0)//1월 1일이었을 경우에는 12월로 돌아가야 하니까
      {
         mm=12;
      }
      dd=maxday[mm];
    }
  }
  if(dd<10) {
      dd='0'+dd
  }
  if(mm<10) {
      mm='0'+mm
  }
  return yyyy+"-"+mm+"-"+dd;
}
function CalNextDay()
{
  var maxday=[31,28,31,30,31,30,31,31,30,31,30,31];
  var today=new Date();
  var dd=today.getDate();
  var mm=today.getMonth();
  if (maxday[mm]==dd)
  {
    dd=1;
    mm++;
  }
  dd++;
  mm++;
  var yyyy = today.getFullYear();
  if(dd<10) {
      dd='0'+dd
  }
  if(mm<10) {
      mm='0'+mm
  }
  return yyyy+mm+dd;
}

function CalHour()
{
  var today=new Date();
  var h=today.getHours();
  if (h<10)
    h='0'+h+'00';
  else
    h=h+'00';
    return h;
}
function tommorrow() {
  let now = new Date();
  now.setHours(now.getHours() + 24);
  var dd = now.getDate();
  var mm = now.getMonth() + 1; //January is 0!
  var yyyy = now.getFullYear();
  if (dd < 10) {
    dd = '0' + dd
  }
  if (mm < 10) {
    mm = '0' + mm
  }
  return yyyy + mm + dd;
}
function CalLocate(locate)
{
  switch(locate)
  {
    case "서울":
      return 0;
    case "제주":
      return 1;
    case "전남":
      return 2;
    case "전북":
      return 3;
    case "광주":
      return 4;
    case "경남":
      return 5;
    case "경북":
      return 6;
    case "울산":
      return 7;
    case "대구":
      return 8;
    case "부산":
      return 9;
    case "충남":
      return 10;
    case "충북":
      return 11;
    case "세종":
      return 12;
    case "대전":
      return 13;
    case "영동":
      return 14;
    case "영서":
      return 15;
    case "경기남부":
      return 16;
    case "경기북부":
      return 17;
    case "인천":
      return 18;
  }
}

//동네예보조회서비스 인증키
const WEATHER_KEY="ServiceKey=sorAXyqaCrE73R%2BN1FYHxTYKH1eFTcWOVCUg7hstI6fFlURL8wVHZYY4pXRY68IBACa4BTxQemrXOzutGlDfIA%3D%3D&";
//대기오염정보조회서비스 인증키
const AIR_KEY="ServiceKey=sorAXyqaCrE73R%2BN1FYHxTYKH1eFTcWOVCUg7hstI6fFlURL8wVHZYY4pXRY68IBACa4BTxQemrXOzutGlDfIA%3D%3D&";


//대기오염정보조회 오퍼레이션-------------------------------------------------------------------------------------
const AIR_BASE_URL="http://openapi.airkorea.or.kr/openapi/services/rest/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty?";
const AIR_STATION="stationName="+urlencode("형곡동")+"&";//측정소 이름
const AIR_TERM="dataTerm=DAILY&"//데이터 기간
const AIR_NUMOFROWS="numOfRows=10&"//1페이지 행 개수
const AIR_RETURN_TYPE="_returnType=json&";//반환 유형
const AIR_VERSION="ver=1.3";//버전
//대기오염정보조회 오퍼레이션-------------------------------------------------------------------------------------

//http://openapi.airkorea.or.kr/openapi/services/rest/ArpltnInforInqireSvc/getMinuDustFrcstDspth?
//searchDate=2018-01-04&_returnType=json&ServiceKey=sorAXyqaCrE73R%2BN1FYHxTYKH1eFTcWOVCUg7hstI6fFlURL8wVHZYY4pXRY68IBACa4BTxQemrXOzutGlDfIA%3D%3D&

//대기질 예보통보 조회 오퍼레이션------------------------------------------------------------------------------------
const AIR_TOMORROW_BASE_URL="http://openapi.airkorea.or.kr/openapi/services/rest/ArpltnInforInqireSvc/getMinuDustFrcstDspth?";
const AIR_TOMORROW_DATE="searchDate="+CalDateWithDash()+"&";//시간대가
const AIR_TOMORROW_TYPE_PM10="informCode=PM10&";
const AIR_TOMORROW_TYPE_PM25="informCode=PM25&";
//대기질 예보통보 조회 오퍼레이션------------------------------------------------------------------------------------
//문제. 대기질 예보통보 조회하는데 내일 예보는 17시와 23시에만 발표됨. 그럼 그 전까지는 어떻게 해야 하지?


//동네예보조회 오퍼레이션--------------------------------------------------------------------------------------------
const BASE_URL="http://newsky2.kma.go.kr/service/SecndSrtpdFrcstInfoService2/ForecastSpaceData?";
const BASE_DATE="base_date="+CalDate()+"&";//발표일자
const BASE_TIME="base_time=0200&";//발표시각
const NX="nx=86&";//검색을 원하는 위치(지역)의 좌표
const NY="ny=96&";//검색을 원하는 위치(지역)의 좌표
const NUMOFROWS="numOfRows=200&";//한 페이지 결과 수 설정(default : 200)
const RETURN_TYPE="_type=json";//리턴 타입 설정(json)
//동네예보조회 오퍼레이션--------------------------------------------------------------------------------------------

//초단기실황조회 오퍼레이션--------------------------------------------------------------------------------------------
const NOW_BASE_URL="http://newsky2.kma.go.kr/service/SecndSrtpdFrcstInfoService2/ForecastGrib?";
const NOW_BASE_DATE="base_date="+CalDate()+"&";//발표일자
const NOW_BASE_TIME="base_time=0000&"//발표시각
const NOW_NX="nx=86&";//검색을 원하는 위치(지역)의 좌표
const NOW_NY="ny=96&";//검색을 원하는 위치(지역)의 좌표
const NOW_NUMOFROWS="numOfRows=200&";//한 페이지 결과 수 설정(default : 20
const NOW_RETURN_TYPE="_type=json";//리턴 타입 설정(json)
//초단기실황조회 오퍼레이션--------------------------------------------------------------------------------------------


// POP : 강수확률
// PTY : 강수형태
// REH : 습도
// SKY : 하늘상태
// T3H : 3시간 기온
// UUU : 풍속(동서)
// VEC : 풍향
// VVV : 풍속(남북)
// WSD : 풍속(?)

var tomorrow_hum;//습도(REH)
var tomorrow_temp;//기온(T3H)
var tomorrow_weat;//날씨(SKY+PTY)
var tomorrow_sky;

var today_hum; //습도(REH)
var today_temp;//기온 (T1H)
var today_weat;//날씨(SKY+PTY)
var today_sky;


app.get("/", function(req, res) {
  //미세먼지(오늘 값)
  var today_dust_url=AIR_BASE_URL+AIR_STATION+AIR_TERM+AIR_NUMOFROWS+AIR_KEY+AIR_RETURN_TYPE+AIR_VERSION;
  http.get(today_dust_url, function(res){
    var body = '';
    res.on('data', function(chunk){
        body += chunk;
    });
    res.on('end', function(){
      result_body=JSON.parse(body);
      var pm10grade;
      var pm25grade;
      switch(result_body.list[0].pm10Grade1h)
      {
        case "1":
          pm10grade="좋음";
          break;
        case "2":
          pm10grade="보통";
          break;
        case "3":
          pm10grade="나쁨";
          break;
        case "4":
          pm10grade="매우나쁨";
          break;
      }
      switch(result_body.list[0].pm25Grade1h)
      {
        case "1":
          pm25grade="좋음";
          break;
        case "2":
          pm25grade="보통";
          break;
        case "3":
          pm25grade="나쁨";
          break;
        case "4":
          pm25grade="매우나쁨";
          break;
      }
      console.log("현재 미세먼지 : " + pm10grade);
      console.log("현재 초미세먼지 : " + pm25grade);
    });
  });

  //미세먼지(내일 값)
  var tomorrow_dust_pm10_url=AIR_TOMORROW_BASE_URL+AIR_TOMORROW_DATE+AIR_TOMORROW_TYPE_PM10+AIR_RETURN_TYPE+AIR_KEY;
  var tomorrow_dust_pm25_url=AIR_TOMORROW_BASE_URL+AIR_TOMORROW_DATE+AIR_TOMORROW_TYPE_PM25+AIR_RETURN_TYPE+AIR_KEY;
  var locate=CalLocate("경북");
  console.log("현재 시간이 6시 이전이면 하루 전 날짜가 나타납니다 : "+ CalDateWithDash());
  http.get(tomorrow_dust_pm10_url, function(res){
    var body = '';
    res.on('data', function(chunk){
        body += chunk;
    });
    res.on('end', function(){
      result_body=JSON.parse(body);
      var result=result_body.list[1].informGrade;
      var result_split=result.split(",");
      console.log("내일 미세먼지(PM10) : " + result_split[locate]);
    });
  });

  http.get(tomorrow_dust_pm25_url, function(res){
    var body = '';
    res.on('data', function(chunk){
        body += chunk;
    });
    res.on('end', function(){
      result_body=JSON.parse(body);
      var result=result_body.list[1].informGrade;
      var result_split=result.split(",");
      console.log("내일 초미세먼지(PM2.5) : " +result_split[locate]);
    });
  });
  //단기실황(오늘 값)
  var today_url=NOW_BASE_URL+WEATHER_KEY+NOW_BASE_DATE+NOW_BASE_TIME+NOW_NX+NOW_NY+NOW_NUMOFROWS+NOW_RETURN_TYPE;
  http.get(today_url, function(res){
      var body = '';
      res.on('data', function(chunk){
          body += chunk;
      });
      res.on('end', function(){
          result_body = JSON.parse(body);
          //시간 측정 시작=============================================================================
          console.time('duration');
          var count;
          count=result_body.response.body.totalCount;
          for (i=0; i<count; i++)
          {
            //여기에 category 맞게 값 넣을 것
            if (result_body.response.body.items.item[i].category=="REH")//습도
              today_hum=result_body.response.body.items.item[i].obsrValue+"%";
            else if (result_body.response.body.items.item[i].category=="T1H")//기온
              today_temp=result_body.response.body.items.item[i].obsrValue+"도";
            else if (result_body.response.body.items.item[i].category=="PTY")
            {
              switch(result_body.response.body.items.item[i].obsrValue)
              {
                case 1:
                  today_weat="비";
                  break;
                case 2:
                  today_weat="진눈깨비";
                  break;
                case 3:
                  today_weat="눈";
                  break;
                case 0:
                  today_weat=0;
                  break;
              }
            }
            else if (result_body.response.body.items.item[i].category=="SKY")
            {
              switch(result_body.response.body.items.item[i].obsrValue)
              {
                case 1:
                  today_sky="맑음";
                  break;
                case 2:
                  today_sky="구름조금";
                  break;
                case 3:
                  today_sky="구름많음";
                  break;
                case 4:
                  today_sky="흐림";
                  break;
              }
            }
          }//for end

          if (today_weat==0)
            today_weat=today_sky;

          console.log("지금 습도 : " + today_hum);
          console.log("지금 온도 : "+ today_temp);
          console.log("지금 날씨 : " + today_weat);
          console.timeEnd('duration');
          //시간 측정 끝=============================================================================
      });
  });
  //동네예보(내일 값)
  var tomorrow_url=BASE_URL+WEATHER_KEY+BASE_DATE+BASE_TIME+NX+NY+NUMOFROWS+RETURN_TYPE;
  http.get(tomorrow_url, function(res){
      var body = '';
      res.on('data', function(chunk){
          body += chunk;
      });
      res.on('end', function(){
          result_body = JSON.parse(body);
          //시간 측정 시작=============================================================================
          console.time('duration');
          var count;
          if (result_body.response.body.numOfRows<result_body.response.body.totalCount)
            count=result_body.response.body.numOfRows;
          else
            count=result_body.response.body.totalCount;
          for (i=0; i<count; i++)
          {
            if (result_body.response.body.items.item[i].fcstDate==tommorrow()
          &&result_body.response.body.items.item[i].fcstTime=="0900")
            {
              //여기에 category 맞게 값 넣을 것
              if (result_body.response.body.items.item[i].category=="REH")//습도
                tomorrow_hum=result_body.response.body.items.item[i].fcstValue+"%";
              else if (result_body.response.body.items.item[i].category=="T3H")//기온
                tomorrow_temp=result_body.response.body.items.item[i].fcstValue+"도";
              else if (result_body.response.body.items.item[i].category=="PTY")
              {
                switch(result_body.response.body.items.item[i].fcstValue)
                {
                  case 1:
                    tomorrow_weat="비";
                    break;
                  case 2:
                    tomorrow_weat="진눈깨비";
                    break;
                  case 3:
                    tomorrow_weat="눈";
                    break;
                  case 0:
                    tomorrow_weat=0;
                    break;
                }
              }
              else if (result_body.response.body.items.item[i].category=="SKY")
              {
                switch(result_body.response.body.items.item[i].fcstValue)
                {
                  case 1:
                    tomorrow_sky="맑음";
                    break;
                  case 2:
                    tomorrow_sky="구름조금";
                    break;
                  case 3:
                    tomorrow_sky="구름많음";
                    break;
                  case 4:
                    tomorrow_sky="흐림";
                    break;
                }
              }
            }//if-날짜, 시간 확인 부분 end
          }//for end

          if (tomorrow_weat==0)
            tomorrow_weat=tomorrow_sky;

          console.log("내일 습도 : " + tomorrow_hum);
          console.log("내일 온도 : "+ tomorrow_temp);
          console.log("내일 날씨 : " + tomorrow_weat);
          console.timeEnd('duration');
          //시간 측정 끝=============================================================================
      });
  });
});

app.listen("3000", function() {
  console.log("공공데이터 API 테스트 중");
});