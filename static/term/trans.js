/**
 * Created by barry on 16/11/14.
 */

(function () {
    var autoReconnect = -1;
    var openWs = function () {
        var termContainer = document.getElementById('terminal');
        var term, pingTimer;
        withSockJS("/term1", function (ws) {
            ws.on("open", function (msg) {
                pingTimer = setInterval(sendPing, 30 * 1000, ws);
                ws.emit(
                    "conn",
                    JSON.stringify({
                        "hostname": "{{ h.ip }}",
                        "port": "{{ h.port }}",
                        "username": "{{ h.name }}",
                        "password": "{{ h.password }}"
                    }),
                    function (msg) {
                        console.log(msg);
                    });


                hterm.defaultStorage = new lib.Storage.Local();
                hterm.defaultStorage.clear();

                term = new hterm.Terminal();

                term.getPrefs().set("send-encoding", "raw");

                term.onTerminalReady = function () {
                    var io = term.io.push();

                    io.onVTKeystroke = function (str) {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.emit("data", str);
                        }
                    };

                    io.sendString = io.onVTKeystroke;

                    io.onTerminalResize = function (columns, rows) {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.emit("resize", JSON.stringify({columns: columns, rows: rows}));
                        }
                    };

                    term.installKeyboard();
                };

                while (termContainer.firstChild) {
                    termContainer.removeChild(termContainer.firstChild);
                }
                term.decorate(termContainer);
                ws.term = term;
                console.log("open");
            }).on("error", function (msg) {
                var errorNode = document.createElement('div');
                errorNode.style.cssText = [
                    "color: red",
                    "background-color: white",
                    "font-size: x-large",
                    "opacity: 0.75",
                    "text-align: center",
                    "margin: 1em",
                    "padding: 0.2em",
                    "border: 0.1em dotted #ccc"
                ].join(";");
                errorNode.textContent = "Websocket handshake failed!";
                termContainer.appendChild(errorNode);
                console.log(msg);
            }).on("close", function (msg) {
                if (ws.term) {
                    ws.term.uninstallKeyboard();
                    setTimeout(function () {
                        ws.term.io.showOverlay("Connection Closed", null);
                    }, 300);
                }
                clearInterval(pingTimer);
                if (autoReconnect > 0) {
                    setTimeout(openWs, autoReconnect * 1000);
                }
                console.log(msg);
            }).on("data", function (msg) {
                term.io.writeUTF8(window.atob(msg));
            });
        });
    };
    var sendPing = function (ws) {
        ws.send("ping");
    };
    openWs();
})();