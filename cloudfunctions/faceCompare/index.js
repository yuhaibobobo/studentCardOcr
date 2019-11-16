// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init()


// 云函数入口函数
exports.main = async (event, context) => {

    const wxContext = cloud.getWXContext()
    let param = event.param;
    
    let app_key = event.app_key
    let time_in_sec = Math.floor(new Date().getTime() / 1000)
    param["time_stamp"] = time_in_sec.toString();
    param["nonce_str"] = Math.random().toString(36).slice(-8)
    //console.log(param["image_a"]);
    //console.log(param["image_b"]);
    let sorted_key = Object.keys(param).sort()

    let sorted_param_strs = []
    for (var index in sorted_key) {
      let key = sorted_key[index]
      let value = param[key]

      if (value) {
        let quoted = encodeURIComponent(value)
        sorted_param_strs.push(key + "=" + quoted)
    }
  }

    sorted_param_strs.push("app_key=" + app_key)

    let request_str = sorted_param_strs.join('&')
    //console.log(request_str)

    let crypto = require('crypto');
    let sign = crypto.createHash('md5').update(request_str).digest('hex');
    sign = sign.toUpperCase()
    param["sign"] = sign;
    console.log(sign);
    let request = require("request-promise")
    let res = await request.post({
      url: "https://api.ai.qq.com/fcgi-bin/face/face_facecompare",
      form: param
    })
    console.log(res)
    return res
    /*post({
      url: "https://api.ai.qq.com/fcgi-bin/face/face_facecompare",
      form: param
    })*/
  }

