// 延迟函数
const delay = function delay(interval) {
    typeof interval !== "number" ? interval = 1000 : null;
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, interval);
    });
};

/* 基于FORM-DATA实现文件上传 */
(function () {
    // 获取所有需要操作的DOM
    let upload = document.querySelector('#upload1'),
        upload_inp = upload.querySelector('.upload_inp'),
        upload_button_select = upload.querySelector('.upload_button.select'),
        upload_button_upload = upload.querySelector('.upload_button.upload'),
        upload_tip = upload.querySelector('.upload_tip'),
        upload_list = upload.querySelector('.upload_list');
    let _file = null
    
    const changeDisable = flag => {
        if (flag) {
            // 给选择文件按钮添加 disable类（禁用）
            upload_button_select.classList.add('disable');
            // 给上传文件到服务器添加 loading类（禁用）
            upload_button_upload.classList.add('loading');
            return;
        }
        upload_button_select.classList.remove('disable');
        upload_button_upload.classList.remove('loading');
    };

    // 上传文件到服务器
    upload_button_upload.addEventListener('click', function () {
        // 如果上传文件到服务器按钮包含 disable / loading 类 不能再次点击
        if(upload_button_upload.classList.contains('disable') || 
        upload_button_upload.classList.contains('loading')) return 
        if(!_file) {
            alert('请你先选择要上传的文件~~')
            return;
        }
        changeDisable(true)

        // 把文件传递给服务器：FormData 
        let formData = new FormData();
        formData.append('file',_file)  // 追加file字段,值为_file
        formData.append('filename',_file.name); // 追加filename字段,值为_file.name
        // 发送请求
        instance.post('/upload_single',formData).then(data => {
            if(+data.code === 0) {
                alert(`文件已经上传成功~~,您可以基于 ${data.servicePath} 访问这个资源~~`);
                return;
            }
            return Promise.reject(data.codeText) // 返回一个错误的Promise
        }).catch(reason => {
            alert(`文件上传失败，请您稍后再试~~`);
        }).finally(() => { // 无论成功还是错误都会调用此函数
            clearHandle();
            changeDisable(false)
        })
    })
    
    // 移除按钮的点击处理
    const clearHandle = () => {
        // 真正地清空文件数据
        _file = null;
        // 显示提示
        upload_tip.style.display = 'block';
        // 隐藏文件列表
        upload_list.style.display = 'none';
        // 清空列表
        upload_list.innerHTML = ``;
    }
    // 点击移除按钮 (注意：动态添加的节点，需要事件委托来处理)
    upload_list.addEventListener('click',function(ev) {
        // 拿到事件对象
        let target = ev.target
        if(target.tagName == 'EM') {
            clearHandle()
        }
    })

    // 监听用户选择文件的操作（注意：文件改变触发）
    upload_inp.addEventListener('change', function () {
        // 拿到文件对象，注意：是数组
        let file = upload_inp.files[0];
        if (!file) return;

        // 正则表达式：限制文件上传的格式「方案一」  i:代表忽略大小写
        // if(!/(PNG|JPG|JPEG)/i.test(file.type)) {
        //     alert('上传的文件只能是: PNG|JPG|JPEG格式的~~')
        //     return
        // }

        // 直接使用原生accept属性：限制文件上传的格式「方案二」
        // <!-- accept=".png" 限定上传文件的格式 -->
        // <input type="file" class="upload_inp" accept=".png,.jpg,.jpeg"></input>

        // 限制上传文件的大小
        if (file.size > 2 * 1024 * 1024) {
            alert('上传的文件不能超过2MB~~')
            return
        }

        // 存储一份文件
        _file = file

        // 隐藏提示
        upload_tip.style.display = 'none';
        // 显示上传的文件
        upload_list.style.display = 'block';
        // 动态创建
        upload_list.innerHTML = 
        `<li>
            <span>文件：${file.name}</span>
            <span><em>移除</em></span>
        </li>`;

    })

    // 点击选择文件按钮，触发上传文件INPUT框选择文件的行为
    upload_button_select.addEventListener('click', function () {
        if (upload_button_select.classList.contains('disable') || upload_button_select.classList.contains('loading')) return;
        // 手动触发 原生的选择文件
        upload_inp.click();
    })
})();


/* 基于BASE64实现文件上传 */
(function () {
    let upload = document.querySelector('#upload2'),
        upload_inp = upload.querySelector('.upload_inp'),
        upload_button_select = upload.querySelector('.upload_button.select');

    // 验证是否处于可操作性状态
    const checkIsDisable = element => {
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    };

    // 把选择的文件读取成为BASE64
    const changeBASE64 = file => {
        return new Promise(resolve => {
            // 创建文本文件读取 实例
            let fileReader = new FileReader();
            // 读作为数据URL
            fileReader.readAsDataURL(file);
            // 读取完毕
            fileReader.onload = ev => {
                resolve(ev.target.result);
            };
        });
    };

    // 选择文件改变时触发
    upload_inp.addEventListener('change', async function () {
        // 获取文件
        let file = upload_inp.files[0],
            BASE64,
            data;
        // 判断是否选择文件
        if (!file) return;
        // 限制文件东西
        if (file.size > 2 * 1024 * 1024) {
            alert('上传的文件不能超过2MB~~');
            return;
        }
        upload_button_select.classList.add('loading');
        // 拿到base64
        BASE64 = await changeBASE64(file);
        // 发送请求
        try {
            data = await instance.post('/upload_single_base64', {
                // 编码：encodeURIComponent() 可以直接使用,防止base64乱码
                file: encodeURIComponent(BASE64),
                filename: file.name
            }, {
                headers: {
                    // 设置请求头
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });
            if (+data.code === 0) {
                alert(`恭喜您，文件上传成功，您可以基于 ${data.servicePath} 地址去访问~~`);
                return;
            }
            // 手动抛出错误
            throw data.codeText;
        } catch (err) {
            alert('很遗憾，文件上传失败，请您稍后再试~~');
        } finally {
            upload_button_select.classList.remove('loading');
        }
    });

    // 点击选择文件按钮
    upload_button_select.addEventListener('click', function () {
        if (checkIsDisable(this)) return;
        upload_inp.click();
    });
})();


/* 文件缩略图 & 自动生成名字 */
(function () {
    let upload = document.querySelector('#upload3'),
        upload_inp = upload.querySelector('.upload_inp'),
        upload_button_select = upload.querySelector('.upload_button.select'),
        upload_button_upload = upload.querySelector('.upload_button.upload'),
        upload_abbre = upload.querySelector('.upload_abbre'),
        upload_abbre_img = upload_abbre.querySelector('img');
    let _file = null;

    // 验证是否处于可操作性状态
    const checkIsDisable = element => {
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    };

    // 把选择的文件读取成为BASE64
    const changeBASE64 = file => {
        return new Promise(resolve => {
            let fileReader = new FileReader();
            fileReader.readAsDataURL(file);
            fileReader.onload = ev => {
                resolve(ev.target.result);
            };
        });
    };

    // 把选择的文件读取成为Buffer,生成hash值命名文件
    const changeBuffer = file => {
        return new Promise(resolve => {
            let fileReader = new FileReader();
            fileReader.readAsArrayBuffer(file);
            fileReader.onload = ev => {
                let buffer = ev.target.result,
                    spark = new SparkMD5.ArrayBuffer(),
                    HASH,
                    suffix;
                spark.append(buffer);
                // 拿到hash值：6f2c97f045ba988851b02056c01c8d62
                HASH = spark.end();
                // 拿到文件后缀名jpg、png...
                suffix = /\.([a-zA-Z0-9]+)$/.exec(file.name)[1];
                resolve({
                    buffer,
                    HASH,
                    suffix,
                    filename: `${HASH}.${suffix}`
                });
            };
        });
    };

    // 把文件上传到服务器
    const changeDisable = flag => {
        if (flag) {
            upload_button_select.classList.add('disable');
            upload_button_upload.classList.add('loading');
            return;
        }
        upload_button_select.classList.remove('disable');
        upload_button_upload.classList.remove('loading');
    };

    // 上传文件到服务器
    upload_button_upload.addEventListener('click', async function () {
        if (checkIsDisable(this)) return;
        if (!_file) {
            alert('请您先选择要上传的文件~~');
            return;
        }
        changeDisable(true);
        // 生成文件的HASH名字
        let {filename} = await changeBuffer(_file);
        let formData = new FormData();
        formData.append('file', _file);
        formData.append('filename', filename);
        instance.post('/upload_single_name', formData).then(data => {
            if (+data.code === 0) {
                alert(`文件已经上传成功~~,您可以基于 ${data.servicePath} 访问这个资源~~`);
                return;
            }
            // 错误的promise
            return Promise.reject(data.codeText);
        }).catch(reason => {
            alert('文件上传失败，请您稍后再试~~');
        }).finally(() => {
            changeDisable(false);
            upload_abbre.style.display = 'none';
            upload_abbre_img.src = '';
            _file = null;
        });
    });


    // 文件预览，就是把文件对象转换为BASE64，赋值给图片的SRC属性即可
    upload_inp.addEventListener('change', async function () {
        let file = upload_inp.files[0],
            BASE64;
        if (!file) return;
        _file = file;
        upload_button_select.classList.add('disable');
        // 获取base64
        BASE64 = await changeBASE64(file);
        upload_abbre.style.display = 'block';
        upload_abbre_img.src = BASE64;
        upload_abbre_img.style.width= 150 + 'px'
        upload_abbre_img.style.height= 150 + 'px'
        upload_button_select.classList.remove('disable');
    });

    // 手动调用原生文件控件
    upload_button_select.addEventListener('click', function () {
        if (checkIsDisable(this)) return;
        upload_inp.click();
    });
})();


/* 进度管控 */
(function () {
    let upload = document.querySelector('#upload4'),
        upload_inp = upload.querySelector('.upload_inp'),
        upload_button_select = upload.querySelector('.upload_button.select'),
        upload_progress = upload.querySelector('.upload_progress'),
        upload_progress_value = upload_progress.querySelector('.value');

    // 验证是否处于可操作性状态
    const checkIsDisable = element => {
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    };

    upload_inp.addEventListener('change', async function () {
        let file = upload_inp.files[0],
            data;
        if (!file) return;
        upload_button_select.classList.add('loading');
        try {
            let formData = new FormData();
            formData.append('file', file);
            formData.append('filename', file.name);
            data = await instance.post('/upload_single', formData, {
                // 文件上传中的回调函数 xhr.upload.onprogress 【进度条】
                onUploadProgress(ev) {
                    console.log(ev)
                    let {
                        loaded,
                        total
                    } = ev;
                    upload_progress.style.display = 'block';
                    upload_progress_value.style.width = `${(loaded/total*100).toFixed(0)}%`;
                    upload_progress_value.innerHTML = `${(loaded/total*100).toFixed(0)}%`;
                }
            });
            if (+data.code === 0) {
                upload_progress_value.style.width = `100%`;
                await delay(300);
                alert(`恭喜您，文件上传成功，您可以基于 ${data.servicePath} 访问该文件~~`);
                return;
            }
            throw data.codeText;
        } catch (err) {
            alert('很遗憾，文件上传失败，请您稍后再试~~');
        } finally {
            // 无论成功还是失败都会执行finally
            upload_button_select.classList.remove('loading');
            upload_progress.style.display = 'none';
            upload_progress_value.style.width = `0%`;
            upload_progress_value.innerHTML = `0%`;
        }
    });

    upload_button_select.addEventListener('click', function () {
        if (checkIsDisable(this)) return;
        upload_inp.click();
    });
})();


/* 多文件上传 */
(function () {
    let upload = document.querySelector('#upload5'),
        upload_inp = upload.querySelector('.upload_inp'),
        upload_button_select = upload.querySelector('.upload_button.select'),
        upload_button_upload = upload.querySelector('.upload_button.upload'),
        upload_list = upload.querySelector('.upload_list');
    let _files = [];

    // 验证是否处于可操作性状态
    const checkIsDisable = element => {
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    };

    // 把文件上传到服务器
    const changeDisable = flag => {
        if (flag) {
            upload_button_select.classList.add('disable');
            upload_button_upload.classList.add('loading');
            return;
        }
        upload_button_select.classList.remove('disable');
        upload_button_upload.classList.remove('loading');
    };

    // 点击上传到服务器按钮
    upload_button_upload.addEventListener('click', async function () {
        if (checkIsDisable(this)) return;
        if (_files.length === 0) {
            alert('请您先选择要上传的文件~~');
            return;
        }
        changeDisable(true);
        
        // 循环发送请求 Array.from()将伪数组变为数组
        let upload_list_arr = Array.from(upload_list.querySelectorAll('li'));

        _files = _files.map(item => {
            let fm = new FormData(),
                // 返回符合条件的项
                curLi = upload_list_arr.find(liBox => liBox.getAttribute('key') === item.key),
                // 拿到li中最后一个span
                curSpan = curLi ? curLi.querySelector('span:nth-last-child(1)') : null;
            fm.append('file', item.file);
            fm.append('filename', item.filename);
            // 返回每一个Promise
            return instance.post('/upload_single', fm, {
                // 上传进度
                onUploadProgress(ev) {
                    // 检测每一个的上传进度
                    if (curSpan) {
                        curSpan.innerHTML = `${(ev.loaded/ev.total*100).toFixed(2)}%`;
                        curSpan.style.color = 'green';
                    }
                }
            }).then(data => {
                if (+data.code === 0) {
                    if (curSpan) {
                        curSpan.innerHTML = `100%`;
                    }
                    return 'ok';
                }
                return Promise.reject('错误');
            });
        });
        
        // // 等待所有处理的结果
        Promise.all(_files).then((value) => {
            alert('恭喜您，所有文件都上传成功~~');
        }).catch((reason) => {
            alert('很遗憾，上传过程中出现问题，请您稍后再试~~');
        }).finally(() => {
            changeDisable(false);
            _files = [];
            upload_list.innerHTML = '';
            upload_list.style.display = 'none';
        });
    });

    // 基于事件委托实现移除的操作
    upload_list.addEventListener('click', function (ev) {
        let target = ev.target,
            curLi = null,
            key;
        // 目标
        if (target.tagName === 'EM') {
            curLi = target.parentNode.parentNode;
            if (!curLi) return;
            // 移除目标的父级的父级DOM
            upload_list.removeChild(curLi);
            // 获取目标属性key值
            key = curLi.getAttribute('key');
            // 筛选，修改数据
            _files = _files.filter(item => item.key !== key);
            if (_files.length === 0) {
                upload_list.style.display = 'none';
            }
        }
    });

    // 获取唯一值
    const createRandom = () => {
        let ran = Math.random() * new Date();
        return ran.toString(16).replace('.', '');
    };

    // 选择文件发生改变时调用,动态渲染要上传的文件列表
    upload_inp.addEventListener('change', async function () {
        _files = Array.from(upload_inp.files);
        console.log(_files)
        if (_files.length === 0) return;
        // 我们重构集合的数据结构「给每一项设置一个位置值，作为自定义属性存储到元素上，
        // 后期点击删除按钮的时候，我们基于这个自定义属性获取唯一值，再到集合中根据这个
        // 唯一值，删除集合中这一项」
        _files = _files.map(file => {
            return {
                file, // 文件对象
                filename: file.name, // 文件名称
                key: createRandom()  // 唯一ID
            };
        });
        // 绑定数据
        let str = ``;
        // _files.forEach((item, index) => {
        //     str += `<li key="${item.key}">
        //         <span>文件${index+1}：${item.filename}</span>
        //         <span><em>移除</em></span>
        //     </li>`;
        // });
        str=_files.map((item,index) =>
            `
            <li key="${item.key}">
                <span>文件${index+1}：${item.filename}</span>
                <span><em>移除</em></span>
            </li>
            `
        ).join('')
        upload_list.innerHTML = str;
        upload_list.style.display = 'block';
    });

    // 触发
    upload_button_select.addEventListener('click', function () {
        if (checkIsDisable(this)) return;
        upload_inp.click();
    });
})();


/* 拖拽上传 */
(function () {
    let upload = document.querySelector('#upload6'),
        upload_inp = upload.querySelector('.upload_inp'),
        upload_drag =  upload.querySelector('.upload_drag')
        upload_submit = upload.querySelector('.upload_submit'),
        upload_mark = upload.querySelector('.upload_mark');
    let isRun = false;
    // 实现文件上传
    const uploadFile = async file => {
        if (isRun) return;
        isRun = true;
        upload_mark.style.display = 'block';
        try {
            let fm = new FormData,
                data;
            fm.append('file', file);
            fm.append('filename', file.name);
            data = await instance.post('/upload_single', fm);
            if (+data.code === 0) {
                alert(`恭喜您，文件上传成功，您可以基于 ${data.servicePath} 访问该文件~~`);
                return;
            }
            throw data.codeText;
        } catch (err) {
            alert(`很遗憾，文件上传失败，请您稍后再试~~`);
        } finally {
            upload_mark.style.display = 'none';
            isRun = false;
        }
    };

    // 拖拽获取 dragenter dragleave dragover drop
    // 进入
    upload_drag.addEventListener('dragenter', function () {
        console.log('进入');
        upload.style.border='3px dashed #00c9f1'
    },true);
    // 离开
    upload_drag.addEventListener('dragleave', function () {
        console.log('离开');
    },true);
    // 拖拽区移动
    upload_drag.addEventListener('dragover', function (ev) {
        // 禁用默认事件，不然文件拖拽到浏览器，默认会在浏览器打开
        ev.preventDefault();
    });
    // 拖拽松开
    upload_drag.addEventListener('drop', function (ev) {
        ev.preventDefault();
        upload.style.border='3px dashed rgb(218, 232, 233)'
        let file = ev.dataTransfer.files[0];
        if (!file) return;
        uploadFile(file);
    });

    // 手动选择
    upload_inp.addEventListener('change', function () {
        let file = upload_inp.files[0];
        if (!file) return;
        uploadFile(file);
    });
    upload_submit.addEventListener('click', function () {
        upload_inp.click();
    });
})();


/* 大文件上传 */
(function () {
    let upload = document.querySelector('#upload7'),
        upload_inp = upload.querySelector('.upload_inp'),
        upload_button_select = upload.querySelector('.upload_button.select'),
        upload_progress = upload.querySelector('.upload_progress'),
        upload_progress_value = upload_progress.querySelector('.value');

    const checkIsDisable = element => {
        let classList = element.classList;
        return classList.contains('disable') || classList.contains('loading');
    };


    const changeBuffer = file => {
        return new Promise(resolve => {
            let fileReader = new FileReader();
            fileReader.readAsArrayBuffer(file);
            fileReader.onload = ev => {
                let buffer = ev.target.result,
                    spark = new SparkMD5.ArrayBuffer(),
                    HASH,
                    suffix;
                spark.append(buffer);
                HASH = spark.end();
                suffix = /\.([a-zA-Z0-9]+)$/.exec(file.name)[1];
                resolve({
                    buffer,
                    HASH,
                    suffix,
                    filename: `${HASH}.${suffix}`
                });
            };
        });
    };

    
    upload_inp.addEventListener('change', async function () {
        let file = upload_inp.files[0];
        if (!file) return;
        upload_button_select.classList.add('loading');
        upload_progress.style.display = 'block';

        // 获取文件的HASH
        let already = [],
            data = null,
            {
                HASH,
                suffix
            } = await changeBuffer(file);

        // 获取已经上传的切片信息
        try {
            data = await instance.get('/upload_already', {
                params: {
                    HASH
                }
            });
            if (+data.code === 0) {
                already = data.fileList;
            }
        } catch (err) {}

        // 实现文件切片处理 「固定数量 & 固定大小」
        let max = 1024 * 100,
            count = Math.ceil(file.size / max),
            index = 0,
            chunks = [];
        if (count > 100) {
            max = file.size / 100;
            count = 100;
        }
        while (index < count) {
            chunks.push({
                file: file.slice(index * max, (index + 1) * max),
                filename: `${HASH}_${index+1}.${suffix}`
            });
            index++;
        }

        // 上传成功的处理
        index = 0;
        const clear = () => {
            upload_button_select.classList.remove('loading');
            upload_progress.style.display = 'none';
            upload_progress_value.style.width = '0%';
        };
        const complate = async () => {
            // 管控进度条
            index++;
            upload_progress_value.style.width = `${index/count*100}%`;

            // 当所有切片都上传成功，我们合并切片
            if (index < count) return;
            upload_progress_value.style.width = `100%`;
            try {
                data = await instance.post('/upload_merge', {
                    HASH,
                    count
                }, {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }
                });
                if (+data.code === 0) {
                    alert(`恭喜您，文件上传成功，您可以基于 ${data.servicePath} 访问该文件~~`);
                    clear();
                    return;
                }
                throw data.codeText;
            } catch (err) {
                alert('切片合并失败，请您稍后再试~~');
                clear();
            }
        };

        // 把每一个切片都上传到服务器上
        chunks.forEach(chunk => {
            // 已经上传的无需在上传
            if (already.length > 0 && already.includes(chunk.filename)) {
                complate();
                return;
            }
            let fm = new FormData;
            fm.append('file', chunk.file);
            fm.append('filename', chunk.filename);
            instance.post('/upload_chunk', fm).then(data => {
                if (+data.code === 0) {
                    complate();
                    return;
                }
                return Promise.reject(data.codeText);
            }).catch(() => {
                alert('当前切片上传失败，请您稍后再试~~');
                clear();
            });
        });
    });

    upload_button_select.addEventListener('click', function () {
        if (checkIsDisable(this)) return;
        upload_inp.click();
    });
})();



/* 大文件上传 另外一种方式*/
;(function() {
    // 获取需要操作的DOM
    const oProgress = document.querySelector('#uploadProgress')
    const oVideo = document.querySelector('#uploadVideo')
    const oInfo = document.querySelector('#uploadInfo')
    const oBtn = document.querySelector('#uploadBtn')
    const oVideo_box = document.querySelector('#oVideo_box')
    // 切片开始的位置
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
    const CHUNK_SIZE = 1024 * 1024 * 2  ;
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
        const {files:[file]} = oVideo
        // 是否选择文件
        if(!file) {
            // 提示
            oInfo.innerHTML = UPLOAD_INFO['NO_FILE']
            return
        }
        // 文件类型
        console.log(file.type)
        if(!ALLOWEN_TYPE[file.type]){
            // 提示
            oInfo.innerHTML = UPLOAD_INFO['INVALID_TYPE']
            return
        }
        // 解构
        const {name,type,size} = file
        // 重新文件命名
        const fileName = new Date().getTime() + '_' + name;
        // 进度条最大长度 = 文件大小
        oProgress.max = size
        // 清除提示
        oInfo.innerHTML = ''
        // 存储后端返回的数据
        let uploadResult = null

        // 循环切割
        while(uploadedSize < size){
            const fileChunk = file.slice(uploadedSize,uploadedSize + CHUNK_SIZE);
            // 创建formData
            const formData = createFormData({name,type,size,fileName,uploadedSize,file:fileChunk})
          try {
            // 发送请求
            uploadResult = await axios.post(API.UPLOAD_VIDEO,formData)
            // console.log(uploadResult)
          } catch (error) {
            // 上传失败(提示)
            oInfo.innerHTML = UPLOAD_INFO['UPLOAD_FAILED']
          }
          // 切片长度累加
          uploadedSize += fileChunk.size
          // 进度条加进度
          oProgress.value = uploadedSize
        }
        // 上传成功
        oInfo.innerHTML = UPLOAD_INFO['UPLOAD_SUCCESS']
        // 清空
        oVideo.value = null
        // 创建视频节点
        createVideo(uploadResult.data.video_url)

    }

    // 创建formData对象
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
        oVideo.width = '100';
        oVideo.src = src;
        oVideo_box.appendChild(oVideo)
    }

    init();
})();