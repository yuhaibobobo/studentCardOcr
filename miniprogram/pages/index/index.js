//index.js
//获取应用实例
const app = getApp()
const mapping = require('../common/mapping.js');
Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    fileID: null,
    imgPath: null,
    varify: false,
    formData: [],
    cWidth: null,
    cHeight: null
  },
  //事件处理函数
  bindViewTap: function () {
    wx.navigateTo({
      url: '../logs/logs'
    })
  },
  onLoad: function () {
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse) {
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }
  },
  getUserInfo: function (e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },
  uploadFile() {
    var that = this
    // 从相册和相机中获取图片
    wx.chooseImage({
      count: 1,
      sourceType: ['album','camera'], 
      success: dRes => {
        // 展示加载组件
        wx.showLoading({
          title: '上传文件',
        });
        let tempImagePath = dRes.tempFilePaths[0]
        wx.getImageInfo({
          src: tempImagePath,
          success: function (res) {
            console.log("压缩前"+res.width+"x"+res.height)
            //---------利用canvas压缩图片--------------
            var ratio = 2;
            var canvasWidth = res.width //图片原始长宽
            var canvasHeight = res.height
            while (canvasWidth > 1200 || canvasHeight > 1200) { // 保证宽高在400以内
              canvasWidth = Math.trunc(res.width / ratio)
              canvasHeight = Math.trunc(res.height / ratio)
              ratio++;
            }
            that.setData({
              cWidth: canvasWidth,
              cHeight: canvasHeight
            })
            console.log("压缩后" + canvasWidth + "x" + canvasHeight)
            //console.log("success")
            console.log(res.path)
            //----------绘制图形并取出图片路径--------------
            var ctx = wx.createCanvasContext('canvas')
            ctx.drawImage(res.path, 0, 0, canvasWidth, canvasHeight)
            ctx.draw(false, setTimeout(function () {
              console.log("绘制完成")
              wx.canvasToTempFilePath({
                canvasId: 'canvas',
                fileType: 'jpg',
                destWidth: canvasWidth,
                destHeight: canvasHeight,
                success: function (res) {
                console.log(res.tempFilePath)
                      const savedFilePath = res.tempFilePath;
                      console.log(savedFilePath)
                      that.setData({
                        imgPath: savedFilePath
                      }, () => {
                        let cloudPath = `${Date.now()}-${Math.floor(Math.random(0, 1) *
                          1000)}.png`;
                        // 云开发新接口，用于上传文件
                        wx.cloud.uploadFile({
                          cloudPath: cloudPath,
                          filePath: that.data.imgPath,
                          success: res => {
                            if (res.statusCode < 300) {
                              console.log(res.fileID);
                              that.setData({
                                fileID: res.fileID,
                              }, () => {
                                that.parseStudentCard();
                                wx.hideLoading();
                              });
                            }
                          },
                          fail: err => {
                            // 隐藏加载组件并提示
                            wx.hideLoading();
                            wx.showToast({
                              title: '上传失败',
                              icon: 'none'
                            });
                          },
                        });
                      })
                },
                fail: function (res) {
                  console.log("fail")
                }
              })
            }, 200)) //留一定的时间绘制canvas
          },
          fail: function (res) {
            console.log(res.errMsg)
          },
        })
      },
      fail: console.error,
    })

  },
  /**
 * 调用接口解析名片
 */
  parseStudentCard() {
    let that = this
    console.log('解析名片');
    wx.showLoading({
      title: '解析名片',
    });
    // 云开发新接口，调用云函数

    wx.cloud.callFunction({
      name: 'parseStudentCard',
      data: {
        fileID: that.data.fileID
      }
    }).then(res => {
      console.log('学生卡解析成功');
      if (res.errcode) {
        wx.showToast({
          title: '解析失败，请重试',
          icon: 'none'
        });
        wx.hideLoading();
        return;
      }
      console.log(res.result)  
      let data = that.handleData(res.result.items);
      console.log(data);
      if(that.data.varify == true){
        that.setData({
          formData: data
        });
        that.addStudent();
        wx.hideLoading();
      }else{
        wx.hideLoading();
        wx.showToast({
          title: '非学生卡',
          icon: 'none',
          duration: 2000
        });
      }
    }).catch(err => {
      console.error('解析失败，请重试。', err);
      wx.showToast({
        title: '解析失败，请重试',
        icon: 'none'
      });
      wx.hideLoading();
    });
  },
  /**
 * 将获取的名片数据进行处理
 * @param {Object} data
 */
  handleData(data) {
    let that = this
    let reg = ['姓名', '性别', '学号', '院系']
    let returnData = {};
    //console.log("处理名片数据", data);
    data.map(item => {
      let txt = item.text;
      if(new RegExp('学生卡是学').test(txt) == true){
        that.setData({
          varify: true
        })
      }
      reg.map(regExp => {
        var patt = new RegExp(regExp);
        if (patt.test(txt) == true) {
          let property = txt.replace(regExp, '')
          property = property.replace(/[-,，；：。.?:;'"!']+/, '');
          returnData[mapping[regExp]] = property;
        } else {
        }
      });
    });
    return returnData;
  },
  /**
 * 在数据库里添加学生信息
 */
  addStudent() {
    var that = this
    console.log("添加学生");
    const formData = that.data.formData;
    let imgPath = that.data.imgPath;
    wx.showLoading({
      title: '添加中'
    });
    const db = wx.cloud.database();
    db.collection('student').add({
      data: formData
    }).then((res) => {
      wx.hideLoading();
      let url = '../faceCompare/index?imgPath='+that.data.imgPath
      //console.log(url)
      wx.redirectTo({
        url: url
      });
    }).catch((e) => {
      console.log("添加名片信息失败", e)
      wx.hideLoading();
      wx.showToast({
        title: '添加失败，请重试',
        icon: 'none'
      });
    });
  }
})

