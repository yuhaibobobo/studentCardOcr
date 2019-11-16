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
    formData: []
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
    // 从相册和相机中获取图片
    wx.chooseImage({
      count: 1,
      sizeType: [ 'compressed'],
      //sourceType: ['album','camera'], 
      success: dRes => {
        // 展示加载组件
        wx.showLoading({
          title: '上传文件',
        });
        wx.saveFile({
          tempFilePath: dRes.tempFilePaths[0],
          success: res =>{
            const savedFilePath=res.savedFilePath;
            console.log(savedFilePath)
            this.setData({
              imgPath : savedFilePath
            },() =>{
              let cloudPath = `${Date.now()}-${Math.floor(Math.random(0, 1) *
                1000)}.png`;
              // 云开发新接口，用于上传文件
              wx.cloud.uploadFile({
                cloudPath: cloudPath,
                filePath: this.data.imgPath,
                success: res => {
                  if (res.statusCode < 300) {
                    console.log(res.fileID);
                    this.setData({
                      fileID: res.fileID,
                    }, () => {
                      this.parseStudentCard();
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
          }
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
        fileID: this.data.fileID
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
      let data = this.handleData(res.result.items);
      console.log(data);
      if(that.data.varify == true){
        this.setData({
          formData: data
        });
        this.addStudent();
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
      if(new RegExp('学生卡是学生的身份证').test(txt) == true){
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
    console.log("添加学生");
    const formData = this.data.formData;
    let imgPath = this.data.imgPath;
    wx.showLoading({
      title: '添加中'
    });
    const db = wx.cloud.database();
    db.collection('student').add({
      data: formData
    }).then((res) => {
      wx.hideLoading();
      let url = '../faceCompare/index?imgPath='+this.data.imgPath
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

