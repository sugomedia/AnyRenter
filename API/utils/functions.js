const moment = require('moment');
var clc = require("cli-color");

var error = clc.red.bold;
var warn = clc.yellow;
var notice = clc.blue;
var info = clc.white;

// events logging
function log(req, res, type) {
    if (process.env.DEBUG == 1) {
        var timestamp = moment(new Date()).format('yyyy-MM-DD HH:mm:ss');
        switch (type) {
            case 'info':
                { console.log(info(`[${timestamp}] : `) + info(`${req} >>> ${res}`)); break; }
            case 'warning':
                { console.log(info(`[${timestamp}] : `) + warn(req) + info(` >>> `) + warn(res)); break; }
            case 'notice':
                { console.log(info(`[${timestamp}] : `) + notice(req) + info(` >>> `) + notice(res)); break; }
            case 'error':
                { console.log(info(`[${timestamp}] : `) + error(req) + info(` >>> `) + error(res)); break; }
        }

    }
}

// time format
function format(seconds) {
    function pad(s) {
        return (s < 10 ? '0' : '') + s;
    }
    var hours = Math.floor(seconds / (60 * 60));
    var minutes = Math.floor(seconds % (60 * 60) / 60);
    var seconds = Math.floor(seconds % 60);

    return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

// operands switch
function getOp(op) {
    switch (op) {
        case 'eq':
            { op = '='; break; }
        case 'lt':
            { op = '<'; break; }
        case 'gt':
            { op = '>'; break; }
        case 'not':
            { op = '!='; break; }
        case 'gte':
            { op = '>='; break; }
        case 'lte':
            { op = '<='; break; }
        case 'lk':
            { op = ' LIKE '; break; }
    }
    return op;
}

module.exports = {
    log,
    format,
    getOp
}