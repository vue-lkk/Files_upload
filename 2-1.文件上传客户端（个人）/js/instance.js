// ---------------二次封装axios--------------------------
let instance  = axios.create()

// 设置基础地址
instance.defaults.baseURL = 'http://127.0.0.1:8889';

// 默认设置(请求头：文件类型为：multipart/form-data)
instance.defaults.headers['Content-Type'] = 'multipart/form-data'; 

// 如果设置请求头：文件类型为：application/x-www-form-urllencoded格式,
// transformRequest：请求预处理函数
instance.defaults.transformRequest = (data,headers) => {
    // 判断请求头
    const contentType = headers['Content-Type'];

    if(contentType === "application/x-www-form-urlencoded") {
        // 得到的拼接结果：file=data%253Aim.....&filename=%E9%BB%984.jpg
        return Qs.stringify(data);
    }else{
        // 如果是multipart/form-data式就直接返回，不需拼接
        return data
    }
}

// 响应拦截器
instance.interceptors.response.use(response => {
    return  response.data
})


