var express = require("express"),
    app = express();

app.use("/", express.static(__dirname));
app.use("/styles", express.static(__dirname + '/styles'));
app.listen(8080);