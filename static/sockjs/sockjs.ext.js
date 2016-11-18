/**
 * Created by barry on 16/11/3.
 */

function SockJSWrap(sockjs_url) {
    var that = this;
    this._listeners = new Array();
    this._listeners["open"] = function (e) {
        console.log(e);
    };
    this._listeners["close"] = function (e) {
        console.log(e);
    };
    this._listeners["error"] = function (e) {
        console.log(e);
    };

    this.ws = new SockJS(sockjs_url);
    this.ws.onopen = function (e) {
        that._listeners["open"](e);
    };
    this.ws.onclose = function (e) {
        that._listeners["close"](e);
    };
    this.ws.onclose = function (e) {
        that._listeners["error"](e);
    };
    this.ws.onmessage = function (e) {
        var t = e.data.split(',');
        var name = t.shift(), data = t.join();
        if (name in that._listeners) {
            that._listeners[name](data);
        }
    };

    this.on = function (type, listener) {
        that._listeners[type] = listener;
        return that;
    };
    this.remove = function (type) {
        if (type in that._listeners) {
            delete that._listeners[type];
        }
    };
    this.emit = function (type, data, func) {
        if (typeof(func) == "function") {
            that._listeners[type + "_return"] = function (msg) {
                func(msg);
            };
        }
        that.ws.send(type + "," + data);
    };
}

function withSockJS(sockjs_url, func) {
    var ws = new SockJSWrap(sockjs_url);
    func(ws);
    return ws
}

function test() {
    withSockJS("/echo", function (ws) {
        ws.on("open", function (msg) {
            ws.emit("name", "data");
        });

        ws.on("jjjj", function (msg) {
            ws.emit("name", "data", function (msg) {
            });
        });
    });

    var ws = new SockJSWrap("/echo");
    ws.on("jjjj", function (msg) {
        ws.emit("name", "data", function (msg) {
        });
    });
}


// delete that._listeners[type + "_return"];