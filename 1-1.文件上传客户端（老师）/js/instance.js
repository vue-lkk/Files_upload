let instance = axios.create();
instance.defaults.baseURL = 'http://127.0.0.1:8888';
instance.defaults.headers['Content-Type'] = 'multipart/form-data';
instance.defaults.transformRequest = (data, headers) => {
    const contentType = headers['Content-Type'];
    // 得到的拼接结果：file=data%253Aimage%252.....&filename=%E9%BB%98%E8%AE%A4.jpg
    if (contentType === "application/x-www-form-urlencoded") return Qs.stringify(data);
    // 如果是multipart/form-data式就直接返回，不需拼接
    return data;
};
instance.interceptors.response.use(response => {
    return response.data;
});