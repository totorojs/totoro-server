var http = require('http')
var request = require('request')

var opts  = {
  host: 'http://aralejs.org',
  path: '/class/tests/runner.html'
}

var opts1  = {
  host: 'aralejs.org',
  port: 80,
  path: '/class/tests/runner.html'
}

var opts3 = { host: 'aralejs.org',
  port: 80,
  path: '/class/tests/runner.html',
  headers:
   {
     connection: 'keep-alive',
     'cache-control': 'no-cache',
     accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
     pragma: 'no-cache',
     'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.2 Safari/537.36',
     referer: 'http://10.32.193.43:9999/',
     'accept-encoding': 'deflate,sdch',
     'accept-language': 'zh-CN,zh;q=0.8' } }


var opt4 = { host: 'aralejs.org',
  port: 80,
  path: '/class/tests/class-spec.js',
  headers:
   { connection: 'keep-alive',
     'cache-control': 'no-cache',
     accept: '*/*',
     pragma: 'no-cache',
     'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/28.0.1500.2 Safari/537.36',
     referer: 'http://10.32.193.43:9999/runner/AJA_wxk5Gwno9-jIj9Ra//class/tests/runner.html',
     'accept-language': 'zh-CN,zh;q=0.8' } }


 req = http.request(opt4, function(res) {
   var str = ''
   res.on('data', function(data) {
     str += data
   })

   res.on('end', function() {
     //console.info('---->', str)
   })

  console.info('res--->', res.statusCode, res.headers['content-length'])
})

//req.end();
//
request('http://aralejs.org/base/tests/runner.html', function(err, res, body) {
  console.info('body-----11111->', body)
})
