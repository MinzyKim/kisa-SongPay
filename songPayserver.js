const express = require('express')
const app = express()
const path = require('path')
var jwt = require('jsonwebtoken')
var request = require('request')
var auth=require('./lib/auth')
var mysql = require('mysql')

app.set('views', path.join(__dirname, 'views')); //ejs의 view파일이 어디에 있는지 알려줌
app.set('view engine', 'ejs'); // ejs라는 템플릿엔진이 파일을 읽어오는 디렉토리로 선정하는 구문

app.use(express.static(path.join(__dirname, 'public')));//to use static asset

app.use(express.json());  
app.use(express.urlencoded({extended:false}));  //express 에서 json을 보내는걸 허용하겠다

var connection = mysql.createConnection({
    host : 'fintech.c3hayok504vf.ap-northeast-2.rds.amazonaws.com',
    user : 'fintech',
    password : '1q2w3e4r!',
    database : 'innodb'
})

connection.connect();

app.get('/', function (req, res) {
    var title = "javascript"
    res.send('<html><h1>'+title+'</h1><h2>contents</h2></html>')
})

app.get('/login', function(req, res){
    res.render('login');
})

app.get('/signup', function(req, res){
    res.render('signup')
})


app.get('/qrcode', function(req,res){
    res.render('qrcode')
})

app.get('/qr', function(req, res){
    res.render('qrReader')
})

app.get('/deposit', function(req, res){
    res.render('deposit');
})

app.get('/withdraw', function(req, res){
    res.render('withdraw');
})

app.get('/main', function(req, res){
    var sql = "SELECT * FROM innodb.Store";
    connection.query(sql, function(err, result){
        if(err){
            console.error(err);
            res.json(0);
        }
        else{
            res.render('main', {data : result});
        }
    })
});

app.get('/myroom', function(req, res){
    res.render('myroom');
})

app.get('/singing', function(req, res){
    res.render('singing');
})

app.get('/dashboard', function(req, res){
    res.render('dashboard');
})

// service start!!!!!!!!!!!!!!!
app.get('/authResult', function(req, res){
    var authCode = req.query.code
    var option = {
        method : "POST",
        url : "https://testapi.openbanking.or.kr/oauth/2.0/token",
        headers : {
            "Content-Type" : "application/x-www-form-urlencoded"
        },
        form : {
            code : authCode,
            client_id : "hxOQEO1uabDh67XfiRf14i3icax3AwemZz10zUoZ",
            client_secret : "9hXE8UChqrBxvLt1Pe6lapuuZL56NOKGKsRRvVWS",
            redirect_uri : "http://localhost:3000/authResult",
            grant_type : "authorization_code"
        }
    }
    request(option, function(err, response, body){
        if(err){
            console.error(err);
            throw err;
        }
        else {
            var accessRequestResult = JSON.parse(body);
            res.render('resultChild', {data : accessRequestResult} )
        }
    })
})

app.post('/signup', function(req, res){
    //data req get db store
    var visitorEmail = req.body.visitorEmail
    var visitorName = req.body.visitorName
    var visitorPassword = req.body.visitorPassword
    var AccessToken = req.body.AccessToken
    var RefreshToken = req.body.RefreshToken
    var userSeqNo = req.body.userSeqNo


    var sql = "INSERT INTO innodb.Visitor (visitorEmail, visitorname, visitorpassword, accesstoken, refreshtoken, userseqno) values (?, ?, ?, ?, ?, ?)";
    connection.query(
        sql, 
        [visitorEmail, visitorName, visitorPassword, AccessToken, RefreshToken, userSeqNo],
    function(err, result){
        if(err){
            console.log(err);
            res.json(0);
            throw err;
        }
        else{
            res.json(1)
        }
    })
})

app.post('/login', function(req, res){
    var visitorEmail = req.body.visitorEmail;
    var visitorPassword = req.body.visitorPassword;
    var sql = "SELECT * FROM innodb.Visitor WHERE visitoremail = ?";
    connection.query(sql, [visitorEmail], function(err, result){
        if(err){
            console.error(err);
            res.json(0);
            throw err;
        }
        else {
            if(result.length == 0){
                res.json(3)
            }
            else {
                var dbPassword = result[0].visitorpassword;
                if(dbPassword == visitorPassword){
                    var tokenKey = "f@i#n%tne#ckfhlafkd0102test!@#%"
                    jwt.sign(
                      {
                          visitorId : result[0].visitorid,
                          visitorEmail : result[0].visitoremail
                      },
                      tokenKey,
                      {
                          expiresIn : '10d',
                          issuer : 'fintech.admin',
                          subject : 'user.login.info'
                      },
                      function(err, token){
                        
                          res.json(token)
                      }
                    )            
                }
                else {
                    res.json(2);
                }
            }
        }
    })
})

app.post('/withdraw', function(req, res){
  
    var profit = req.body.profit

    var sql2 = "INSERT INTO innodb.Profit(date, profit, clientid) VALUES (curdate(), ?, 1)"
  
  
    connection.query(sql2, [profit] ,function(err, result){
                           
      if(err){
        console.error(err);
        res.json(0);
        throw err;
      }
      else {
        res.json(1);
      }
    })
  })

app.post('/list', auth, function(req, res){
    //계좌 리스트
    var visitorId = req.decoded.visitorId; //token에서 분석해서 가져오기 <decoded>

    var sql = "SELECT * FROM innodb.Visitor WHERE visitorid = ?"
    connection.query(sql, [visitorId], function(err, result){
        if(err){
            console.error(err);
            throw err
        }
        else{
    var option = {
        method: "GET",
        url : "https://testapi.openbanking.or.kr/v2.0/user/me",
        headers : {
            Authorization : 'Bearer' + result[0].accesstoken
            // eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOiIxMTAwMDM0ODU1Iiwic2NvcGUiOlsiaW5xdWlyeSIsImxvZ2luIiwidHJhbnNmZXIiXSwiaXNzIjoiaHR0cHM6Ly93d3cub3BlbmJhbmtpbmcub3Iua3IiLCJleHAiOjE1OTcxMzExMjQsImp0aSI6ImE2ZTQ3YTE4LTNmNDYtNDUwNS05ZTY4LWUzNjM0NWM3NGVkNiJ9.mG7SJK8xwm_VUB9OSNYkJDx0yOZrx5gZaxzppHBSVg4'
        },
        qs:{
            user_seq_no : result[0].userseqno
        }
    }
    request(option, function(err, response, body){
        if(err){
            console.error(err);
            throw err;
        }
        else {
            var accessRequestResult = JSON.parse(body);
            res.json(accessRequestResult) // render 안해

        }
    })
}
})

})

app.post('/withdraw', function(req, res){
  
    var profit = req.body.profit
    var sql2 = "INSERT INTO innodb.Profit(date, profit, clientid, flag) VALUES (curdate(), ?, 1, 0)"
  
  
    connection.query(sql2, [profit] ,function(err, result){
                           
      if(err){
        console.error(err);
        res.json(0);
        throw err;
      }
      else {
        res.json(1);
        console.log("good")
      }
    })
  })

  app.post('/myroom', function(req, res){
  
    var profitId = req.body.profitId
    var sql2 = "select profit from profit where profitid = ?"
  
  
    connection.query(sql2, [profitId] ,function(err, result){
                           
      if(err){
        console.error(err);
        res.json(0);
        throw err;
      }
      else {
        res.json(1);
      }
    })
  })
  
app.post('/dashboard', function(req, res){
    var sum = req.body.sum;
    var sql = "select sum(profit) as '정산' from innodb.Profit"

    connection.query(sql,function(err, result){
                response.send(result);
      })
    })

app.listen(3000);