function extend(obj, src) {
    Object.keys(src).forEach(function(key) { 
        obj[key] = src[key]; 
    });
    return obj;
}

module.exports = {
    extend: extend
};