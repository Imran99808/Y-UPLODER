// external module 
const console = require('console');
const { google } = require('googleapis');
require('dotenv').config();

// internal module
const https = require('https');
const path=require('path');
const fs=require('fs');



const config = {
   tPath:path.join(__dirname,'aceessToken.json'),
  // sheetsData:{}

};

// fs module use
const readFile=(path)=>{
  const data= fs.readFileSync(path);
  const pData=JSON.parse(data);
  if(!pData.time){
    pData.time=Date.now();
    console.log('ko')
  }
  
   config.token=pData;
};

// google sheets data get for 

const getDtata = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: 'https://www.googleapis.com/auth/spreadsheets',

  });

  const client = await auth.getClient();
  config.googleSheets = google.sheets({ version: 'v4', auth: client });

  config.spreadsheetId = '1opc_0RufbVy6NM-ya69etb4oAfbt0Eqo67n-8svYwcU';

  const metadata = await config.googleSheets.spreadsheets.values.get({

    spreadsheetId:config.spreadsheetId,
    range: 'Sheet1',

  });



  return metadata.data.values;


};


const checkIndex = async () => {
  if (!config.sheetsData) {
    config.sheetsData = await getDtata();
  }


// console.log(config.sheetsData)
   for (let i = 1; i < config.sheetsData.length; i++) {
    console.log(i)
     if (config.sheetsData[i].length !== 5) {
      console.log(i);
       expDateCheck(i);
  
      break
     }
    
   }
};
const expDateCheck=(i)=>{
  const refreshTokenBody = {
    grant_type: 'refresh_token',
    refresh_token: process.env.refreshToken,

    client_id: process.env.clientId,
    client_secret: process.env.clientSecret,
  }
  if(config.token.time <= Date.now()){
    genretAuthToken(refreshTokenBody, (token) => {
      if (token) {
        token.time=(Date.now())+(token.expires_in*1000);
        console.log('1',token.time)
        try{
         fs.writeFileSync(config.tPath,JSON.stringify(token))
         readFile(config.tPath);
         yUploder(i);
        }catch(e){
          console.log(e.message);
        }
      
      }
     
  
  
    });
     console.log( Date.now())
    // if()
   
  }else{
    yUploder(i);
  }

  // yUploder(i);
}
const yUploder = (i) => {
  const filename = config.sheetsData[i][0];
  const title = config.sheetsData[i][1];
  const des = config.sheetsData[i][2];
  
  const videoPath = path.join(__dirname,'Videos', filename);
  config.oauth2Client.setCredentials(config.token);
  
  config.youtube = google.youtube({ version: 'v3', auth: config.oauth2Client })

  const yBody = {

    part: 'snippet',
    requestBody: {
      snippet: {
        title: title,
        description: des
      },

    },
    media: {
      body: fs.createReadStream(videoPath),
    }
  }
 
  config.youtube.videos.insert(yBody, (err, response) => {
    if (err) {
      console.log(err.message)
    } else {
      console.log('vide upload success fully')
      console.log(response.data.id)
       tUpload(i,response.data.id);
    }
  })
};
const tUpload = (i,id) => {
  const tname=config.sheetsData[i][3];
  const Path= path.join(__dirname,'Tumblain', tname);
  config.youtube.thumbnails.set({
    videoId: id,
    media: {
      body: fs.createReadStream(Path)
    }

  }, (err, response) => {
    if (err) {
      console.log(err.message)
      updateSheets(i,id);
    } else {
      console.log('thumblain uload successfully')
        updateSheets(i,id);
    }
  });
  
};

const updateSheets=async(i,id)=>{
  const vLink=`https://www.youtube.com/watch?v=${id}`
  config.sheetsData[i].push(vLink);

  const adata = await config.googleSheets.spreadsheets.values.update({
    //   auth,
         spreadsheetId:config.spreadsheetId,
         range:'Sheet1',
         valueInputOption:'USER_ENTERED',
       resource:{
         values:config.sheetsData
        }
  
    });

    console.log(adata)
}
// ........................STEP 1 OR 2 FUNCTION FOR...................

const outhCode = () => {
  const authUri = config.oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/youtube.upload']
  })
  console.log("_________THIS LINK COPY AND POST YOURE BROSER AND AUTHENTICATE YOUR YOTUBE GMAIL.............")
  console.log(authUri)
};

const genretAuthToken = (bodyData, cb) => {

  
    const requestBody = JSON.stringify(bodyData);


    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': requestBody.length
      }
    };

    const request = https.request('https://oauth2.googleapis.com/token', options, (res) => {
      let body = ''

      res.on('data', (data) => {
        body += data;

      });
      res.on('end', () => {
        token = JSON.parse(body);
        cb(token);
      });


      res.on('error', (e) => {
        cb(false);
      });


    });

    request.on('error', (e) => {
      cb(false)

    });

    request.write(requestBody);
    request.end();
 

  // return ret;
};

// main fucntion 
const mainFunc = () => {
  const arguments = process.argv;

  config.oauth2Client = new google.auth.OAuth2({
    clientId: process.env.clientId,
    clientSecret: process.env.clientSecret,
    redirectUri: ["http://localhost:3000"] // Replace with your redirect URI
  });

  const tokenBody = {
    grant_type: 'authorization_code',
    code: process.env.authCode,

    client_id: process.env.clientId,
    client_secret: process.env.clientSecret,
    redirect_uri: 'http://localhost:3000'
  };

  if (arguments[2] == 1) {

    outhCode();

  }
  else if (arguments[2] == 2) {


    genretAuthToken(tokenBody, (a) => {
      console.log(a)
    });

    console.log('111');
    //  console.log('refreshToken=',token.refresh_token);

  }
  else {
    
     
     readFile(config.tPath)
    
     process.env.refreshToken.length>10&&checkIndex();


  }

};

mainFunc();