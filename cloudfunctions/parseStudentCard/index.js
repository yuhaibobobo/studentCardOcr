const cloud = require('wx-server-sdk')
cloud.init()

exports.main = async (event, context) => {
  try {
    const fileID = event.fileID;
    const res = await cloud.downloadFile({
      fileID: fileID,
    });
    const buffer = res.fileContent;
    console.log(res.fileContent);
    const result = await cloud.openapi.ocr.printedText({
      type: 'photo',
      img: {
        contentType: 'image/jpg',
        value: buffer
      }
    })
    console.log(result)
    return result
  } catch (err) {
    console.log(err)
    return err
  }
}