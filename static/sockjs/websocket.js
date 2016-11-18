/**
 * Created by barry on 16/11/8.
 */

var ws = withSockJS("/term", function (ws) {
    ws.on("open", function (msg) {
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

        ws.term = new Terminal(80, 60, function (key) {
            ws.emit("data", key);
        });
        ws.term.open();
        $('.terminal').detach().appendTo('#term');
        ws.term.resize(80, 30);
        ws.term.write("connection.......");

        console.log("open");
    }).on("error", function (msg) {
        console.log(msg);
        ws.term.write('Error: ' + msg + '\r\n');
        console.log(msg);
    }).on("close", function (msg) {
        console.log(msg);
        ws.term.write('Connection Reset By Peer');
    }).on("data", function (msg) {
        console.log(msg);
        ws.term.write(msg);
    });
});