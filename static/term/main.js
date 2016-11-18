/**
 * Created by barry on 16/11/14.
 */
(function () {
    var httpsEnabled = window.location.protocol == "https:";
    var url = (httpsEnabled ? 'wss://' : 'ws://') + window.location.host + window.location.pathname + 'ws';
    var protocols = ["tty"];
    var autoReconnect = -1;

    var openWs = function () {
        var termContainer = document.getElementById('terminal');
        var ws = new WebSocket(url, protocols);
        var term, pingTimer;

        ws.onopen = function (event) {
            if (typeof tty_auth_token !== 'undefined') {
                ws.send(JSON.stringify({AuthToken: tty_auth_token}));
            }
            pingTimer = setInterval(sendPing, 30 * 1000, ws);

            hterm.defaultStorage = new lib.Storage.Local();
            hterm.defaultStorage.clear();

            term = new hterm.Terminal();

            term.getPrefs().set("send-encoding", "raw");

            term.onTerminalReady = function () {
                var io = term.io.push();

                io.onVTKeystroke = function (str) {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send("0" + str);
                    }
                };

                io.sendString = io.onVTKeystroke;

                io.onTerminalResize = function (columns, rows) {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send("2" + JSON.stringify({columns: columns, rows: rows}));
                    }
                };

                term.installKeyboard();
            };

            while (termContainer.firstChild) {
                termContainer.removeChild(termContainer.firstChild);
            }
            term.decorate(termContainer);
        };

        ws.onmessage = function (event) {
            var data = event.data.slice(1);
            switch (event.data[0]) {
                case '0':
                    term.io.writeUTF8(window.atob(data));
                    break;
                case '1':
                    // pong
                    break;
                case '2':
                    term.setWindowTitle(data);
                    break;
                case '3':
                    var preferences = JSON.parse(data);
                    Object.keys(preferences).forEach(function (key) {
                        console.log("Setting " + key + ": " + preferences[key]);
                        term.getPrefs().set(key, preferences[key]);
                    });
                    break;
                case '4':
                    autoReconnect = JSON.parse(data);
                    console.log("Enabling reconnect: " + autoReconnect + " seconds")
                    break;
            }
        };

        ws.onclose = function (event) {
            if (term) {
                term.uninstallKeyboard();
                setTimeout(function () {
                    term.io.showOverlay("Connection Closed", null);
                }, 300);
            }
            clearInterval(pingTimer);
            if (autoReconnect > 0) {
                setTimeout(openWs, autoReconnect * 1000);
            }
        };

        ws.onerror = function (event) {
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
        };
    };

    var sendPing = function (ws) {
        ws.send("1");
    };

    openWs();
})();