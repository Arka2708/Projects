// app.js
const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const app = express();
const PORT = process.env.PORT || 4000;

// Set EJS as the view engine
app.set("view engine", "ejs");

// Middleware for parsing URL-encoded bodies
app.use(bodyParser.urlencoded({ extended: false }));

// Middleware for serving static files
app.use(express.static(path.join(__dirname, "public")));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname,"public"));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage: storage });


// Routes
app.get("/",(req,res)=>{
  res.render('Register.ejs');
})

app.get("/login",(req,res)=>{
   res.render('login.ejs');
})

async function searchInFile(filePath, key, value) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf-8', (err, data) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        let jsonData = [];
        try {
          jsonData = JSON.parse(data);
          const result = jsonData.filter((item) => item["username"] === key && item["password"] === value);
          console.log(result);
          if (result.length > 0) {
            resolve(true);
          } else {
            resolve(false);
          }
        } catch (parseError) {
          console.log(parseError);
          resolve(false);
        }
      }
    });
  });
}

async function searchInFileForRegister(filePath,key){
  return new Promise((resolve, reject) => {
  fs.readFile(filePath,'utf-8',(err,data)=>{
    if(err){
      console.log(err);
    }else{
      let jsonData = [];
      try{
         jsonData = JSON.parse(data);
        const result = jsonData.filter((item)=>item["username"] === key);
        console.log(result);
        if (result.length > 0) {
          resolve(false);
        } else {
          resolve(true);
        }
      }catch(parseError){
          console.log(parseError);
          return resolve(false);
      }
    }
  })
});
}
function appendRecordToJsonFile(filename, newData) {
  // Read the existing JSON data from the file
  fs.readFile(filename, 'utf8', (err, data) => {
      if (err) {
          console.error('Error reading JSON file:', err);
          return;
      }
      try {
          const jsonData = JSON.parse(data);
          // Append the new data to the JavaScript object
          jsonData.push(newData);
          // Convert the updated JavaScript object back to JSON format
          const updatedJsonData = JSON.stringify(jsonData, null, 4);
          // Write the updated JSON data back to the file
          fs.writeFile(filename, updatedJsonData, 'utf8', (err) => {
              if (err) {
                  console.error('Error writing to JSON file:', err);
              } else {
                  console.log('New record appended to the JSON file');
              }
          });
      } catch (parseError) {
          console.error('Error parsing JSON data:', parseError);
      }
  });
}

app.post("/",(req,res)=>{
  const user = req.body.username;
  const password = req.body.password;
  const result = searchInFileForRegister("user.json",user);
  result.then((resolve)=>{
    if(resolve == true){
      appendRecordToJsonFile("user.json",{"username" : user , "password" : password});
      res.redirect(`/${user}`);
    }else{
      res.render("registerError.ejs");
    }
  })
})


app.post("/login", async (req, response) => {
  const user = req.body.username;
  const password = req.body.password;
  try {
    const result = await searchInFile("user.json", user, password);
    console.log(result);
    if (result === false) {
      response.render("error.ejs");
    } else {
      response.redirect(`/${user}`);
    }
  } catch (error) {
    console.log(error);
    response.render("error.ejs");
  }
});




// Home route - Display the upload form
app.get("/:user", (req, res) => {
  const username = req.params.user;
  res.render("upload",{user : username});
});

// Handle form submission - Upload data and file
app.post("/:user/upload", upload.single("file"), (req, res) => {
  const data = req.body.data;
  const file = req.file;
  const username = req.params.user;

  // Read existing data from JSON file
  fs.readFile("data.json", "utf8", (err, jsonData) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    let collection = [];
    if (jsonData) {
      // Parse JSON data if it exists
      try {
        collection = JSON.parse(jsonData);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        res.status(500).send("Internal Server Error");
        return;
      }
    }

    collection.push({ user: username, text: data, file: file });
    // console.log(collection);
    // Write updated data to JSON file
    fs.writeFile("data.json", JSON.stringify(collection, null, 4), (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
        return;
      }
      res.redirect(`/${username}/collection`);
    });
  });
});

// Display the collection
app.get("/:user/collection", (req, res) => {
  const username = req.params.user;
  fs.readFile("data.json", "utf8", (err, jsonData) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }
    const collection = JSON.parse(jsonData);
    res.render("collection", { user : username , collection : collection });
  });
});

// Serve files for download
app.get("/:user/download/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname + "/public", filename);
  res.download(filePath);
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
