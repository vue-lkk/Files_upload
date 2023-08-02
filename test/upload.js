
/* 大文件上传 另外一种方式*/
;(function() {
    const oProgress = document.querySelector('#uploadProgress')
    const oVideo = document.querySelector('#uploadVideo')
    const oInfo = document.querySelector('#uploadInfo')
    const oBtn = document.querySelector('#uploadBtn')
    const oVideo_box = document.querySelector('#oVideo_box')
    // 切片开始
    let uploadedSize = 0

    // 提示常量
    const UPLOAD_INFO = {
        'NO_FILE':"请选择上传的文件",
        'INVALID_TYPE':"不支持该类型文件",
        'UPLOAD_FAILED':"上传失败",
        'UPLOAD_SUCCESS':"上传成功"
    }
    // 格式常量
    const ALLOWEN_TYPE = {
        'video/mp4':'mp4',
        'video/ogg':'ogg'
    }
    // 切片大小常量
    const CHUNK_SIZE = 64 * 1024 ;
    // 请求地址常量
    const API = {
        UPLOAD_VIDEO:'http://127.0.0.1:8889/upload_video'
    }


    // 初始化
    const init = () => {
        bindEvent()
    };

    // 绑定事件
    function bindEvent() {
        oBtn.addEventListener('click',uploadVideo,false)
    };

    async function uploadVideo(e){
        e.preventDefault();
        e.stopPropagation();
        const {files:[file]} = oVideo
        // 是否选择文件
        if(!file) {
            oInfo.innerHTML = UPLOAD_INFO['NO_FILE']
            return
        }
        // 文件类型
        if(!ALLOWEN_TYPE[file.type]){
            oInfo.innerHTML = UPLOAD_INFO['INVALID_TYPE']
            return
        }

        const {name,type,size} = file
        console.log(name,type,size)
        const fileName = new Date().getTime() + '_' + name;
        oProgress.max = size
        oInfo.innerHTML = ''
        // 存储后端返回的数据
        let uploadResult = null

        // 循环切割
        while(uploadedSize < size){
            const fileChunk = file.slice(uploadedSize,uploadedSize + CHUNK_SIZE);
            // 创建formData
            const formData = createFormData({name,type,size,fileName,
                uploadedSize,file:fileChunk})
          try {
            uploadResult = await axios.post(API.UPLOAD_VIDEO,formData)
          } catch (error) {
            // 上传失败
            oInfo.innerHTML = UPLOAD_INFO['UPLOAD_FAILED']
          }
          
          uploadedSize += fileChunk.size
          // 进度条
          oProgress.value = uploadedSize
        }
        // 上传成功
        oInfo.innerHTML = UPLOAD_INFO['UPLOAD_SUCCESS']
        // 清空
        oVideo.value = null
        
        createVideo(uploadResult.data.video_url)

    }

    function createFormData({name,type,size,fileName,uploadedSize,file}){
        let fd = new FormData()
        fd.append('name',name)
        fd.append('type',type)
        fd.append('size',size)
        fd.append('fileName',fileName)
        fd.append('uploadedSize',uploadedSize)
        fd.append('file',file)
        return fd
    }

    // 创建视频
    function createVideo(src){
        const oVideo = document.createElement('video')
        oVideo.controls = true;
        oVideo.width = '500';
        oVideo.src = src;
        oVideo_box.appendChild(oVideo)
    }

    init();
})();