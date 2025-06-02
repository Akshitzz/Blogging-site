import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import User from "./Schema/User.js";
import jwt from 'jsonwebtoken';
import cors from 'cors';
import admin from "firebase-admin";
import { createRequire } from 'module';
import aws from "aws-sdk"
// schema below 
import Blog from './Schema/Blog.js';
import Comment from './Schema/Comment.js';
import User from './Schema/User.js';
import Notfication from './Schema/Notification.js';





const require = createRequire(import.meta.url);
const serviceAccount = require("./safevoice2-firebase-adminsdk-8id5v-ddce5f5da9.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

import { getAuth } from "firebase-admin/auth";


const server = express();

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
let PORT = 3000;

server.use(express.json());
server.use(cors());

mongoose.connect(process.env.CONNECTION_STRING, {
  autoIndex: true
});
// setting up the s3 bucket
const s3 = new aws.S3({
  region: 'ap-southeast-2',
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  signatureVersion: 'v4'
});


const generateUploadURL = async () => {
  try {
    const date = new Date();
    const imageName = `${nanoid()}-${date.getTime()}.jpeg`;
    
    const params = {
      Bucket: 'blogging-website-2',
      Key: imageName,
      Expires: 1000,
      ContentType: "image/jpeg"
    };

    const signedUrl = await s3.getSignedUrlPromise('putObject', params);
    return signedUrl;
  } catch (error) {
    console.error('Error generating upload URL:', error);
    throw new Error('Failed to generate upload URL: ' + error.message);
  }
}

const verifyJWT =(req,res,next)=>{
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(" ")[1];
  if(token == null){
    return res.status(401).json({error:"no access token"})
  }

  jwt.verify(token,process.env.SECRET_ACCESS_KEY,(err,user)=>{
    if(err){
      return res.status(403).json({error:"  Access token is invalid"})
    }
    req.user = user.id
    next()
  })
}

const formatDataToSend = (user) => {
  const access_token = jwt.sign({ id: user._id }, process.env.SECRET_ACCESS_KEY);
  return {
    access_token,
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    fullname: user.personal_info.fullname
  };
};

const generateUsername = async (email) => {
  let username = email.split("@")[0];
  let isUsernameExists = await User.exists({ "personal_info.username": username });
  if (isUsernameExists) {
    username += nanoid().substring(0, 5);
  }
  return username;
};


// upload image url root
server.get('/get-upload-url', async (req, res) => {
  try {
    const url = await generateUploadURL();
    res.status(200).json({ uploadURL: url });
  } catch (err) {
    console.error('Error in get-upload-url:', err);
    res.status(500).json({ "error": err.message });
  }
});

server.post("/signup", (req, res) => {
  let { fullname, email, password } = req.body;
  // Validating the data from frontend
  if (fullname.length < 3) {
    return res.status(403).json({ "error": "Fullname must be at least 3 letters long" });
  }

  if (!email.length) {
    return res.status(403).json({ "error": "Enter Email" });
  }

  if (!emailRegex.test(email)) {
    return res.status(403).json({ "error": "Email is invalid" });
  }

  if (!passwordRegex.test(password)) {
    return res.status(403).json({
      "error": "Password should be 6 to 20 characters long with a numeric, 1 lowercase, and 1 uppercase letter"
    });
  }

  bcrypt.hash(password, 10, async (err, hashed_password) => {
    if (err) {
      return res.status(500).json({ "error": "Error occurred while hashing password" });
    }
    let username = await generateUsername(email);
    let user = new User({
      personal_info: { fullname, email, password: hashed_password, username }
    });

    user.save()
      .then((u) => {
        return res.status(200).json(formatDataToSend(u));
      })
      .catch(err => {
        if (err.code == 11000) {
          return res.status(500).json({ "error": "Email already exists" });
        }
        return res.status(500).json({ "error": err.message });
      });
  });
});

server.post("/signin", (req, res) => {
  let { email, password } = req.body;

  User.findOne({ "personal_info.email": email })
    .then((user) => {
      if (!user) {
        return res.status(403).json({ "error": "Email not found" });
      }
      if (!user.google_auth) {
        bcrypt.compare(password, user.personal_info.password, (err, result) => {
          if (err) {
            return res.status(403).json({ "error": "Error occurred while login, please try again" });
          }
          if (!result) {
            return res.status(403).json({ "error": "Incorrect password" });
          } else {
            return res.status(200).json(formatDataToSend(user));
          }
        });
      } else {
        return res.status(403).json({ "error": "Account was created using Google. Try logging in with Google" });
      }
    })
    .catch(err => {
      console.log(err.message);
      return res.status(500).json({ "error": err.message });
    });
});

server.post("/google-auth", async (req, res) => {
  let { access_token } = req.body;
  getAuth()
    .verifyIdToken(access_token)
    .then(async (decodeUser) => {
      let { email, name, picture } = decodeUser;
      picture = picture.replace("s96-c", "s384-c");
      let user = await User.findOne({ "personal_info.email": email })
        .select("personal_info.fullname personal_info.username personal_info.profile_img personal_info.google_auth")
        .then((u) => {
          return u || null;
        })
        .catch(err => {
          return res.status(500).json({ "error": err.message });
        });

      if (user) {
        if (!user.google_auth) {
          return res.status(403).json({ "error": "This email was signed up without Google. Please login with password to access the account" });
        }
      } else {
        // Signup
        let username = await generateUsername(email);
        user = new User({
          personal_info: { fullname: name, email, username, google_auth: true }
        });
        await user.save()
          .then((u) => {
            user = u;
          })
          .catch(err => {
            return res.status(500).json({ "error": err.message });
          });
      }

      return res.status(200).json(formatDataToSend(user));
    })
    .catch(err => {
      return res.status(500).json({ "error": "Failed to authenticate you with Google. Try with some other Google account" });
    });
});

server.post("/all-latest-blogs-count",(req,res)=>{
  Blog.countDocuments({draft :false})
  .then((count)=>{
    return res.status(200).json({totalDocs:count})
  })
  .catch(err=>{
    return res.status(500).json({error:err.message})
  })


})




server.get('/latest-blogs',(req,res)=>{

    let {page} =5;
    let maxLimit =5;

  Blog.find({draft :false}).
  populate("author","personal_info.username personal_info.fullname -_id")
  .sort({"publishedAt":-1})
  .select("blog_id title des banner activity tags publishedAt -_id")
  .skip((page -1) * maxLimit)
  .limit(maxLimit)
  .then(blogs=>{
    return res.status(200).json(blogs)
  })
  .catch(err=>{
    return res.status(500).json({error:err.message})
  })
}
)
server.get('/trending-blogs',(req,res)=>{
  Blog.find({draft :false}).
  populate("author","personal_info.username personal_info.fullname -_id")
  .sort({"activity.total_read":-1,"activity.total_likes":-1,"publishedAt":-1})
  .select("blog_id title publishedAt -_id")
  .limit(5)
  .then(blogs=>{
    return res.status(200).json(blogs)
  })
  .catch(err=>{
    return res.status(500).json({error:err.message})
  })
})



server.post("/search-blogs",(req,res)=>{
  let {tag ,page,query,author,limit,eliminate_blog}= req.body;
 let findQuery = {tag:tag, draft :false}
  if(tag){
    findQuery= {tags:tag,draft:false,blog_id:{$ne:eliminate_blog}};
  }else if(query){
      findQuery = {draft :false ,title: new RegExp(query,'i')}
  } else if(author) {
    findQuery = {author,draft :false}
  }


  let maxLimit =limit ?limit:2 ;

  Blog.find(findQuery)
  .populate("author" ,"personal_info.profile_img personal_info.username personal_info.fullname -_id")
  .sort({"publishedAt":-1})
  .select("blog_id title des banner activity tags publishedAt -_id")
  .skip((page-1) *maxLimit)
  .limit(maxLimit)
  .then(blogs=>{
    return res.status(200).json(blogs)
  })
  .catch(err=>{
    return res.status(500).json({error:err.message})
  })

})
server.post("/search-blogs-count",(req,res)=>{
  let {tag ,author,query} = req.body;
 let findQuery = {tag:tag, draft :false}
  if(tag){
    findQuery= {tags:tag,draft:false};
  }else if(query){
      findQuery = {draft :false ,title: new RegExp(query,'i')}
  }else if(author) {
    findQuery = {author,draft :false}
  }

  Blog.countDocuments(findQuery)
  .then(count =>{
    return res.status(200).json({totalDocs:count})

  }).catch(err =>{
    return res.status(500).json({error :err.message})
  })
})

server.post("/search-users",(req,res)=>{
  let {query} = req.body;

  User.find({"personal_info.username" : new RegExp(query,'i')})
  .limit(50)
  .select("personal_info.fullname personal_info.username personal_info.profile_img -_id")
  .then(users =>{
    return res.status(200).json({users})
  })
  .catch(err =>{
    return res.json(500).json({err :err.message})
  })
})



server.post("/get-profile",(req,res)=>{
  let {username} = req.body;

  User.findOne({"personal_info.username":username})
  .select("-personal_info.password -google_auth -updatedAt -blogs")
  .then(user=>{
    return res.status(200).json(user)
  })
  .catch(err=>{
    return res.status(500).json({errpr :err.message})
  })

})



server.post('/create-blog',verifyJWT,(req,res)=>{
let authorId = req.user;
let {title,des,banner,tags,content,draft,id}= req.body;
if(!title.length){
  return res.status(403).json({error:"You must provide a title to publish the blog"})
}
if(!des.length || des.length>300){
  return res.status(403).json({error:"You must provide blog description under 200 characters"})
}

if(!banner.length){
  return res.status(403).json({error:"You must provide a blog banner to publish it"})
}
if(!content.blocks.length){
  return res.status(403).json({error:"There must be some blog content to publish it "});
}
if(!tags.length || tags.length >10){
  return res.status(403).json({error:"Provide tags on order to publish the blog ,Maximun 10"})
}

tags = tags.map(tag =>tag.toLowerCase());
let blog_id = id || title.replace(/[^a-zA-Z0-9]/g,'').replace(/\s+/g,"-").trim() + nanoid()


  if(id){
    Blog.findOneAndUpdate({blog_id},{title,des,banner,content,tags,draft:draft ?draft :false})
    .then(()=>{
      return res.status(200).json({id:blog_id});
    })
    .catch(err=>{
      return res.status(200).json({error:"Failed to update total posts number "})
    })
  }else {

    let blog = new Blog({
     title,des,banner,content,tags, author: authorId, blog_id,draft:Boolean(draft)
  })
  blog.save().then(blog=>{
    let incrementVal = draft ? 0 :1;
    User.findOneAndUpdate({_id:authorId},{$inc:{"account_info.total_posts":incrementVal},$push:{"blogs":blog_id}})
    .then(user=>{
      return res.status(200).json({id:blog.blog_id})
    })
    .catch(err=>{
      return res.status(500).json({error:"Failed to update total posts number"})
    })
  return res.json({status:'done'})
  })
  }


})
server.post("/get-blog",(req,res)=>{
  
  let {blog_id,draft,mode} = req.body;
  let incrementVal = mode !== 'edit' ?1 :0  ;


  Blog.findOneAndUpdate({blog_id},{$inc:{"activity.total_reads":incrementVal}})
  .populate("author","personal_info.username personal_info.fullname personal_info.profile_img")
  .select("title des banner content activity publishedAt blog_id tags")
  .then(blog=>{
    User.findOneAndUpdate({"personal_info.username":blog.author.personal_info.username},{$inc:{"account_info.total_reads":incrementVal}})
    .catch(err=>{
      return res.status(500).json({error:err.message})
    })
    return res.status(200).json({blog})
  })
  .catch(err=>{
    return res.status(500).json({error:err.message})
  })
if(Blog.draft && !draft){
  return res.status(500).json({error : "You can not access draft blog "})
}
})

server.post("/add-comment",verifyJWT,(req,res)=>{
  let user_id =req.user;
  let {_id,comment,replying_to,blog_author} =req.body;
  if(!comment.length){
    return res.status(403).json({error:"Write something to comment"})
  }


  // creating a comment object

  let commentObj = new  Comment({
    blog_id:_id,
    blog_author,
    comment,
    comment_id:user_id,
  })

  commentObj.save().then(commentFile=>{
    let {comment,commentedAt,children} = commentFile;

    Blog.findOneAndUpdate({_id},{$push:{"comments":commentFile._id},$inc:{"activity.total_comments":1},"activity.total_parent_comments":1})
    .then(console.log("comment added to blog"))
    .catch(err=>{
      return res.status(500).json({error:err.message})
    })

    let notificationObj = {
      type:"comment",
      blog:_id,
      notification_for:blog_author,
      user:user_id,
      comment:commentFile._id,
    }
    new Notification(notificationObj).save().then(notfication=>console.log("notfication created"))


    return res.status(200).json({
      comment,commentedAt,_id:commentFile._id,user_id,children
    })

    


  })
})



server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
