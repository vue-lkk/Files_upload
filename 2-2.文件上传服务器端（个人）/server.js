const express = require('express'),
    fs = require('fs'),
    bodyParser = require('body-parser'),
    // 插件1：处理上传文件（解析form-data文件）
    multiparty = require('multiparty'),
    // 处理客户端文件hash名字
    SparkMD5 = require('spark-md5')

// 创建app 
const app = express(),
    PORT = 8889,        // 端口
    HOST = 'http://127.0.0.1',  // 协议
    HOSTNAME = `${HOST}:${PORT}`; // 拼接协议、端口

// 监听
app.listen(PORT, () => {
    console.log(`端口：${PORT},链接：${HOSTNAME}`)
})

// 中间件
app.use((req, res, next) => {
    // 处理跨域问题
    res.header("Access-Control-Allow-Origin", "*");
    req.method === 'OPTIONS' ? res.send('CURRENT SERVICES SUPPORT CROSS DOMAIN REQUESTS!') : next();
})
// body解析器
app.use(bodyParser.urlencoded({
    extended: true,
    limit: '1024mb'
}));
app.use(bodyParser.json())
// 插件2：也可以解析文件 (不可与multiparty同时使用)
// const uploader = require('express-fileupload')
// app.use(uploader())

// --------------------/*-封装的函数-*/--------------------
// 延迟函数
const delay = function delay(interval) {
    // 判断参数是否是数值
    typeof interval !== "number" ? interval = 1000 : null;
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, interval);
    });
};


// 检测文件是否存在
const exists = function exists(path) {
    return new Promise(resolve => {
        // fs.access() 判断文件和目录是否存在
        fs.access(path, fs.constants.F_OK, err => {
            if (err) {
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
};
// --------------------/*-封装的函数-*/------------------------




//---------------------- 以下是核心代码/*-API-*/-----------------------------------

// 基于multiparty插件实现文件上传处理 & form-data解析
const uploadDir = `${__dirname}/upload`; // 存放客户端上传过来的文件目录
// 处理客户端传递过来的文件
const multiparty_upload = function multiparty_upload(req, auto) {
    // 设置默认值
    typeof auto !== 'boolean' ? auto = false : null
    // 配置项
    let config = {
        maxFieldsSize: 200 * 1024 * 1024 //最大字段大小
    }
    // 判断添加配置项
    if (auto) config.uploadDir = uploadDir; // 文件存储的目录

    return new Promise(async (resolve, reject) => {
        await delay()
        // 传入配置项构造出一个对象
        new multiparty.Form(config).parse(req, (err, fields, files) => {
            if (err) {
                reject(err)
                return
            }
            resolve({
                fields,  //文件名字段{filename:[]}
                files    //文件对象字段{file:[{}]}
            })
        })
    })
}
// 单文件上传处理「FORM-DATA」
app.post('/upload_single', async (req, res) => {
    try {
        let { fields, files } = await multiparty_upload(req, true)
        let file = (files.file && files.file[0]) || {}
        // 返回
        res.send({
            code: 0,
            codeText: '上传成功',
            originalFilename: file.originalFilename, // 原文件名
            // 上传到服务器的图片路径
            servicePath: file.path.replace(__dirname, HOSTNAME)
        })
    } catch (error) {
        res.send({
            code: 1,
            codeText: '上传失败'
        });
    }
})





// 创建文件并写入到指定的目录 & 返回客户端结果
// 参数：（响应头，要写入的路径，文件内容，文件名）
const writeFile_base64 = function writeFile(res, path, file, filename) {
    return new Promise((resolve, reject) => {
        // 写入操作
        fs.writeFile(path, file, err => {
            console.log(file)
            if (err) {
                reject(err);
                res.send({
                    code: 1,
                    codeText: err
                });
                return;
            }
            resolve();
            res.send({
                code: 0,
                codeText: 'upload success',
                originalFilename: filename,  // 源文件名
                servicePath: path.replace(__dirname, HOSTNAME)  // 替换访问路径
            });
        });
    });
};
// 单一文件上传「BASE64」，只适合图片，后端处理文件命名
app.post('/upload_single_base64', async (req, res) => {
    // 请求头body中拿到文件参数
    let file = req.body.file,
        filename = req.body.filename,
        spark = new SparkMD5.ArrayBuffer(), // 生成hash值命名文件
        //[ '.png', 'png', index: 8, input: 'download.png', groups: undefined ]
        suffix = /\.([0-9a-zA-Z]+)$/.exec(filename)[1], // 匹配以.xxx后缀结尾,拿到文件后缀名jpg、png...
        isExists = false,
        path;

    // 此时客户端传递过来的base64是编码状态，防止乱码的，以下结果：
    // 输出：data%3Aimage%2Fpng%3Bbase64%2CiVBORw0KGgoAAAANSUhEUgAABLA
    // console.log(file)

    // 解码：decodeURIComponent(file) 可以直接使用,解码base64
    // 输出：data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABLAAAAvfCAMA......
    file = decodeURIComponent(file);

    // 输出：iVBORw0KGgoAAAANSUhEUgAABLAAAAvfCAMA...... （替换不需要的部分）
    file = file.replace(/^data:image\/\w+;base64,/, "");

    // 输出：<Buffer 89 50 4e 47 0d 0a ... 49971 more bytes>（转成Buffer）
    file = Buffer.from(file, 'base64');

    // 传入Buffer，利用spark.end()生成hash值来命名文件
    spark.append(file);

    // 输出：E:\基于原生js和node实现文件上传和大文件文件切片\2-2.node后端/upload/6f2c97f045ba988851b02056c01c8d62.png
    path = `${uploadDir}/${spark.end()}.${suffix}`;

    // 延迟
    await delay();
    // 检测是否存在 (传入文件路径)
    isExists = await exists(path);
    // 如果文件存在返回给客户端的数据
    if (isExists) {
        res.send({
            code: 0,
            codeText: 'file is exists',  // 提示文件已存在
            originalFilename: filename,  // 文件源名
            // 将'E:\基于原生js和node实现文件上传和大文件文件切片\2-2.node后端/' 替换成 'http://127.0.0.1:8889/'
            // 输出：http://127.0.0.1:8889/upload/6f2c97f045ba988851b02056c01c8d62.png
            servicePath: path.replace(__dirname, HOSTNAME)
        });
        return;
    }
    // 写入到指定的目录
    // 参数：（响应头，要写入的路径，文件内容，文件名）
    writeFile_base64(res, path, file, filename);
});




// 创建文件并写入到指定的目录 & 返回客户端结果
// 参数：（响应头，要写入的路径，文件内容，文件名）
const writeFile_formdata = function writeFile(res, path, file, filename) {
    return new Promise((resolve, reject) => {
        // 文件流
        try {
            // 创建可读流,并读取其中的是数据,【file.path 是客服端的文件路径】
            let readStream = fs.createReadStream(file.path),
                // 创建可写流，【file.path 是需要写入到服务器的文件路径】
                writeStream = fs.createWriteStream(path);
            // 当有新的数据可供读取时，readStream会自动推入writeStream中
            readStream.pipe(writeStream);

            readStream.on('end', () => {
                resolve();
                // unlinkSync()函数同步删除文件
                fs.unlinkSync(file.path);
                res.send({
                    code: 0,
                    codeText: 'upload success',
                    originalFilename: filename,
                    servicePath: path.replace(__dirname, HOSTNAME)
                });
            });
        } catch (err) {
            reject(err);
            res.send({
                code: 1,
                codeText: err
            });
        }
    });
};
// 单一文件上传「缩略图处理」，前端处理文件命名
app.post('/upload_single_name', async (req, res) => {
    try {
        let { fields, files } = await multiparty_upload(req);
        let file = (files.file && files.file[0]) || {},
            filename = (fields.filename && fields.filename[0]) || "",
            path = `${uploadDir}/${filename}`,
            isExists = false;
        // 检测是否存在
        isExists = await exists(path);
        if (isExists) {
            res.send({
                code: 0,
                codeText: 'file is exists',
                originalFilename: filename,
                servicePath: path.replace(__dirname, HOSTNAME)
            });
            return;
        }
        writeFile_formdata(res, path, file, filename);
    } catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }
});




// 大文件切片上传 & 合并切片
const merge = function merge(HASH, count) {
    return new Promise(async (resolve, reject) => {
        let path = `${uploadDir}/${HASH}`,
            fileList = [],
            suffix,
            isExists;
        isExists = await exists(path);
        if (!isExists) {
            reject('HASH path is not found!');
            return;
        }
        fileList = fs.readdirSync(path);
        if (fileList.length < count) {
            reject('the slice has not been uploaded!');
            return;
        }
        fileList.sort((a, b) => {
            let reg = /_(\d+)/;
            return reg.exec(a)[1] - reg.exec(b)[1];
        }).forEach(item => {
            !suffix ? suffix = /\.([0-9a-zA-Z]+)$/.exec(item)[1] : null;
            fs.appendFileSync(`${uploadDir}/${HASH}.${suffix}`, fs.readFileSync(`${path}/${item}`));
            fs.unlinkSync(`${path}/${item}`);
        });
        fs.rmdirSync(path);
        resolve({
            path: `${uploadDir}/${HASH}.${suffix}`,
            filename: `${HASH}.${suffix}`
        });
    });
};
// 切片存储
app.post('/upload_chunk', async (req, res) => {
    try {
        let { fields, files } = await multiparty_upload(req);
        // 文件对象
        let file = (files.file && files.file[0]) || {},
            // 文件名称
            filename = (fields.filename && fields.filename[0]) || "",
            path = '',
            isExists = false;
        // 创建存放切片的临时目录(HASH命名)
        let [, HASH] = /^([^_]+)_(\d+)/.exec(filename);
        // 目录路径
        path = `${uploadDir}/${HASH}`;

        !fs.existsSync(path) ? fs.mkdirSync(path) : null;
        // 把切片存储到临时目录中
        path = `${uploadDir}/${HASH}/${filename}`;
        // 查看文件是否存在
        isExists = await exists(path);
        if (isExists) {
            res.send({
                code: 0,
                codeText: 'file is exists',
                originalFilename: filename,
                servicePath: path.replace(__dirname, HOSTNAME)
            });
            return;
        }
        // 不存在就写入
        writeFile_formdata(res, path, file, filename);
    } catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }
});
// 当所有切片都上传成功，我们合并切片
app.post('/upload_merge', async (req, res) => {
    let {
        HASH,
        count
    } = req.body;
    try {
        let {
            filename,
            path
        } = await merge(HASH, count);
        res.send({
            code: 0,
            codeText: 'merge success',
            originalFilename: filename,
            servicePath: path.replace(__dirname, HOSTNAME)
        });
    } catch (err) {
        res.send({
            code: 1,
            codeText: err
        });
    }
});
// 已经上传的切片信息
app.get('/upload_already', async (req, res) => {
    let {
        HASH
    } = req.query;
    // 查找到对应HASH命名的文件夹
    let path = `${uploadDir}/${HASH}`,
        fileList = [];
    try {
        // 读取目录
        fileList = fs.readdirSync(path);
        // 排序
        fileList = fileList.sort((a, b) => {
            let reg = /_(\d+)/;
            return reg.exec(a)[1] - reg.exec(b)[1];
        });
        res.send({
            code: 0,
            codeText: '',
            fileList: fileList
        });
    } catch (err) {
        res.send({
            code: 0,
            codeText: '',
            fileList: fileList
        });
    }
});






// 格式常量
const ALLOWEN_TYPE = {
    'video/mp4': 'mp4',
    'video/ogg': 'ogg'

}
// 拿到文件后缀
const { extname, resolve } = require('path')
// existsSync判断文件是否存在, appendFileSync追加文件同步, writeFileSync写文件同步
const { existsSync, appendFileSync,writeFileSync } = require('fs')
// 大文件上传
app.post('/upload_video', (req, res) => {
    const { name, type, size, fileName, uploadedSize } = req.body
    // 注意: file在body里拿不到
    const { file } = req.files
    console.log(file)
    // 限制是否选择文件
    if (!file) {
        res.send({
            code: 1001,
            msg: '没有上传文件'
        })
        return
    }
    // 限制格式
    if (!ALLOWEN_TYPE[type]) {
        res.send({
            code: 1002,
            msg: '不支持此文件格式'
        })
        return
    }

    // 文件名
    const filename = fileName + extname(name)
    // 存储文件的目录
    const filePath = resolve(__dirname, './upload/' + filename)

    // 切片2，3，4... 的 uploadedSize不为0的，就不必创建，直接追加
    if (uploadedSize !== '0') {
        // 判断后续的切片，已经存在这个文件
        if (!existsSync(filePath)) {
            res.send({
                code: 1003,
                msg: '文件已存在'
            })
            return
        }
        // 直接追加到切片1文件里面 (追加的是 Buffer数据)
        appendFileSync(filePath,file.data)
        // 切片2，3，4...：返回给前端的数据
        res.send({
            code: 0,
            msg: '追加上传成功',
            video_url:'http://127.0.0.1:8889/' + filename,
            size:size
        })
        return
    }

    // 开始 切片1 的 uploadedSize是为0的，创建文件，并写入切片1
    writeFileSync(filePath,file.data)
    // 切片1 ：返回给前端的数据
    res.send({
        code: 0,
        msg: '上传成功',
        video_url:'http://127.0.0.1:8889/' + filename,
        size:size
    })
})




//---------------------- 以下是核心代码/*-API-*/-----------------------------------



// 设置路径 可以访问上传文件资源
app.use(express.static('./'));

// 大文件上传
// app.use('/',express.static('upload'));

// 处理页面不存在 404
app.use((req, res) => {
    res.status(404);
    res.send(`<h1 style='color:red;text-align:center'>NOT FOUND! 404</h1>`);
});
