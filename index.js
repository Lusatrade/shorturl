require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const bodyParser = require("body-parser");
const fs = require("fs");
const dns = require("node:dns");
const uri = require('node-uri');
let data = [];

// Basic Configuration
const port = process.env.PORT || 3000;

//Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use("/public", express.static(`${process.cwd()}/public`));

const validateUrlMiddleware = (req, res, next) => {
  logger(req)
  const u = uri.checkURI(req.body.url)
  if(!u.valid || (u.scheme!='https' && u.scheme!='http')){
    res.status(200).json({ error: "Invalid URL" });
  }

  dns.lookup(u.host, (err, address) => {
    if (err) {
      console.log(err);
      res.status(200).json({ error: "Invalid URL" });
    } else {
      next()
     
    }
  });
};
//Helpers
const dataPath = __dirname + "/data.json";
const logPath =  __dirname + "/log.txt";

const logger = (req)=>{
  let params = JSON.stringify(req.params)
  let body = JSON.stringify(req.body)
  let ts = new Date().toString()
  let str = ` ${ts} ${req.method} ${req.path} ${params} ${body}\n`
  fs.appendFile(logPath,str,(err)=>console.log(err))
}

const updateStorage = (obj) => {
  data.push(obj);
  fs.writeFile(dataPath, JSON.stringify(data), (err) => {
    if (err) console.log(err);
  });
};

const createObject = (long_url, short_url) => {
  return {
    original_url: long_url,
    short_url: short_url,
  };
};

const findLongUrl = (short_url) => {
  console.log(short_url);
  console.log(data);
  return data.find((el) => {
    return parseInt(el.short_url) == parseInt(short_url);
  });
};

const findShortUrl = (long_url) => {
  return data.find(
    (el) =>
      el.original_url.replace(/^http(s):\/\//i, "") ===
      long_url.replace(/^http(s):\/\//i, "")
  );
};

//Routes
app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.get("/api/admin", function (req, res) {
  res.json(data);
});


app.get("/api/logs", function (req, res) {
  res.sendFile(logPath,(err)=>console.log(err));
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

app.post("/api/shorturl", validateUrlMiddleware, (req, res) => {
  const long_url = req.body.url;
  let obj = null;
  //If short url alredy exists send it
  if ((obj = findShortUrl(long_url))) {
    res.status(200).json(obj);
  } else {
    obj = createObject(long_url, data.length + 1);
    updateStorage(obj);
    res.status(200).json(obj);
  }
});

app.get("/api/shorturl/:short_url?", (req, res) => {
  logger(req)
  const short_url = req.params.short_url;
  console.log("params = " + short_url);
  if (!short_url) {
    res.status(200).json({ error: "Invalid url" });
  } else {
    let obj = findLongUrl(short_url);
    if (!obj) {
      res.status(200).json({ error: "Invalid url" });
    } else {
      res.redirect(301, obj.original_url);
    }
  }
});

const startApp = () => {
  const stored = fs.readFileSync(dataPath);

  data = JSON.parse(stored);

  app.listen(port, function () {
    console.log(`Listening on port ${port}`);
  });
};

startApp();
