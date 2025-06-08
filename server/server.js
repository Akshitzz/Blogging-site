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
import Notfication from './Schema/Notification.js';

const require = createRequire(import.meta.url);
const serviceAccount = require("./safevoice2-firebase-adminsdk-8id5v-ddce5f5da9.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

import { getAuth } from "firebase-admin/auth";
import Notification from './Schema/Notification.js';
import { error } from 'console';

const server = express();

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;
let PORT = 3000;

// CORS Configuration
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
};

server.use(cors(corsOptions));
server.use(express.json());

// Handle preflight requests
server.options('*', cors(corsOptions));

// Additional headers for CORS
server.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});

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

server.post("/change-password",verifyJWT,(req,res)=>{
  let {currentPassword,newPassword} =req.body;

  if(!passwordRegex.test(currentPassword) || !passwordRegex.test(newPassword)){
    return resizeTo.status(403).json({error:"Password should be 6 to 20 characters long with a numeric ,1 lowercase and 1 uppercase letters "})
  }

  User.findOne({_id :req.user}).then((user)=>{
    if(user.google_auth){
      return res.status(403).json({error : "You cant change account's password you loggied in throught google"})
    }

    bcrypt.compare(currentPassword,user.personal_info.password,(err,result)=>{
      if(err){
        return res.status(500).json({error:"Some error occured while changing the password ,please try again later"})
      }
      if(!result){
        return res.status(403).json({error:"Incorrect current password"})
      }
        bcrypt.hash(newPassword,10,(err,hashed_password)=>{
          User.findOneAndUpdate({_id:req.user},{"personal_info.password":hashed_password})
          .then((u)=>{
            return res.status(200).json({status:'password changed'})
          })
          .catch(err=>{
            return res.status(500).json({error:'Some error while saving new password,please try again later'})
          })
        })

    })
  })
.catch(err=>{
  console.log(err)
  res.status(500).json({error:"User not found"})
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

server.post("/updated-profile-img",verifyJWT,(req,res)=>{
  let {url} = req.body;
  User.findOneAndUpdate({_id:req.user},{"personal_info.profile_img":url})
  .then(()=>{
    return res.status(200).json({profile_img:url})
  })
  .catch(err =>{
    return res.status(500).json({error:err.message})
  })
})

server.post("/update-profile",(req,res)=>{
  let {username,bio,social_links} = req.body;
  let bioLimit = 150;
  if(username.length <1){
    return res.status(403).json({error:"Username should be at least 3 letters long "});

  }
  if(bio.length >bioLimit) {
    return res.status(403).json({error:`Bio should be more than ${bioLimit} charactes`})
}

let socialLinksArr = Object.keys(social_links);

try {
  for(let i=0 ;i<socialLinksArr.length;i++){
    if(social_links[socialLinksArr[i]].length){
      let hostname = new URL(social_links[socialLinksArr[i]]).hostname;

      if(!hostname.includes(`${socialLinksArr[i]}.com`) && socialLinksArr[i] !== 'website'){
        return res.status(403).json({error:`${socialLinksArr[i]} link is invalif . You must enter a correct link `} )
      }
    }
  }

}catch(err){
    return res.status(500).json({error:"You must provide full social links with https included"})
}

    let updateObj={
      "personal_info.username": username,
      "personal_info.bio": bio,
      social_links
    }
    User.findOneAndUpdate({_id:req.user}, updateObj,{
      runValidators:true
    })
.then(()=>{
  return res.status(200).json({username})
})
.catch(err=>{
  if(err.code === 11000){
    return res.status(409).json({error:"username is a;ready taken"})
  }
  return res.status(500).json({error:err.message})
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
  let {_id,comment,blog_author,replying_to,notification_id} =req.body;
  if(!comment.length){
    return res.status(403).json({error:"Write something to comment"})
  }


  // creating a comment object

  let commentObj = {
    blog_id:_id,
    blog_author,
    comment,
    comment_id:user_id,
  }

  if(replying_to){
    commentObj.parent = replying_to;
    commentObj.isReply =true;
  }



 new Comment(commentObj).save().then(async commentFile=>{
    let {comment,commentedAt,children} = commentFile;

    Blog.findOneAndUpdate({_id},{$push:{"comments":commentFile._id},$inc:{"activity.total_comments":1},"activity.total_parent_comments":replying_to?0:1})
    .then(console.log("comment added to blog"))
    .catch(err=>{
      return res.status(500).json({error:err.message})
    })

    let notificationObj = {
      type:replying_to?"reply":"comment",
      blog:_id,
      notification_for:blog_author,
      user:user_id,
      comment:commentFile._id,
    }
    if(replying_to){

      notificationObj.replied_on_comment =replying_to;

      await Comment.findOneAndUpdate({_id:replying_to},{$push:{children:commentFile._id}}).then(replyingToCommentDoc=>{notificationObj.notification_for=replyingToCommentDoc.commented_by})

      if(notification_id){
        Notfication.findOneAndUpdate(
          {
            _id: notification_id
          },
          {
            reply :commentFile._id
          }
        ).then(notfication=>console.log('Notfication Updated'))
      }
    }



    new Notification(notificationObj).save().then(notification=>console.log("notfication created"))


    return res.status(200).json({
      comment,commentedAt,_id:commentFile._id,user_id,children
    })




  })
})

server.post("/get-blog-comments",(req,res)=>{
  let {blog_id,skip} =req.body;

  let maxLimit =5 ;

  Comment.find({blog_id,isReply:false})
  .populate("commented_by", "personal_info.username personal_info.fullname personal_info.profile_img ")
  .skip(skip)
  .limit(maxLimit).
  sort({
    "commentedAt":-1
  })
.then(comment =>{
  return res.status(200).json(comment);
})
.catch(err=>{
  console.log(err.message);
  return res.status(500).json({error:err.message})

})
})

server.post("/get-replies",(req,res)=>{
  let {_id,skip} =req.body;

  let max_limit= 5;

  Comment.findOne({_id})
  .populate({
    path:"children",
    option:{
      limit:max_limit,
      skip:skip,
      sort:{'commentedAt':-1}
    },
    populate:{
      path :'commented_by',
      select:"personal_info.profile_img personal_info.fullname personal_info.username"
    }
  }),
  select("children")
  .then(doc=>{
    return res.json(200).json({replies:doc.children})
  })
  .catch(err=>{
    return res.status(500).json({error :err.message})
  })
})

const deleteComments= (_id)=>{
  Comment.findOneAndDelete({_id})
  .then(comment=>{
    if(comment.parent){
      Comment.findOneAndUpdate({_id:comment.parent},{$pull:{children:_id}})
      .then(data=>console.log('Comment delete from parent'))
      .catch(err=>console.log(err))
    }

    Notfication.findOneAndDelete({comment:_id}).then(notfication=>console.log('comment notfication deleted'))

    Notfication.findOneAndUpdate({reply:_id},{$unset:{reply:1}}).then(notfication=>console.log('reply notfication deleted'))

    Blog.findOneAndUpdate({_id:comment.blog_id},{$pull :{comments:_id},$inc:{"activity.total_comments":-1},"activity.total_parent_comments":comment.parent ?0:-1})
    .then(blog=>{
      if(comment.children.length){
        comment.children.map(replies=>{
          deleteComments(replies)
        })
      }
    })


  })
  .catch(err=>{
    console.log(err.message)
  })
}




server.post("/delete-comment",verifyJWT,(req,res)=>{
  let user_id = req.user;
  let {_id}= req.body;
  
  Comment.findOne({_id})
  .then(comment=>{
    if(user_id == comment.commented_by || user_id == comment.blog_author){
      deleteComments(_id)
      return res.status(200).json({status:"deleted successfully"})
    }else{
      return res.status(500).json({error:"You cannot delete this comment"})
    }
  })
})


server.get("/get-notfication",verifyJWT,(req,res)=>{
  let user_id = req.user;

  Notification.exists({notification_for:user_id,seen:false,user:{$ne:user_id}})
  .then(result=>{
    if(result){
      return res.status(200).json({new_notification_available:true})

    }else{
      return res.status(200).json({new_notification_available:false})
    }
  }).catch(err=>{
    return res.status(500).json({error :err.message})
  })
})


server.post("/notfication",verifyJWT,(req,res)=>{
  let user_id =req.id;

  let {page,filter,deletedDocCount} =req.body;

  let maxLimit=10;

  let findQuery={notification_for:user_id,user:{$ne:user_id}}

  let skipDocs = (page-1) *maxLimit;

  if(filter !== 'all'){
    findQuery.type =filter;
  }

  if(deletedDocCount){
    skipDocs -= deletedDocCount;
  }

  Notfication.find(findQuery)
  .skip(skipDocs)
  .limit(maxLimit)
  .populate("blogs","title blog_id")
  .populate("user","personal_info.fullname personal_info.username personal_info.profile_img")
  .populate("comment" ,"comment")
  .populate("replied_on_comment","comment")
  .populate("reply","comment")
  .then(notfication=>{
    Notfication.updateMany(findQuery,{seen:true})
    .skip(skipDocs)
  .limit(maxLimit)
    .then(()=>console.log('notfications seen'))

    return res.status(200).json({notfication})
  }).catch(err=>{
    console.log(err.message);
    return res.status(500).json({error :err.message})
    
  })




})

server.post("/all-notifications-count",verifyJWT,(req,res)=>{
  let user_id = req.user;
  let {filter} = req.body;

  let findQuery = {notification_for:user_id,user:{$ne:user_id}}

    if(filter !== 'all'){
      findQuery.type =filter;
    }

Notfication.countDocuments(findQuery)
.then(count=>{
  return res.status(200).json({totalDocs:count})
})
.catch(err=>{
  return res.status(500).json({error :err.message})
})


})

server.post("/user-written-blogs",verifyJWT,(req,res)=>{
  let user_id = req.user;

  let {page,draft,query,deleteDocCount} = req.body;

  let maxLimit =5;
  let skipDocs = (page -1) * maxLimit;
  if(deleteDocCount) {
    skipDocs -= deleteDocCount
  }

Blog.find({author :user_id,draft,title: new RegExp(query,'i')})
.skip(skipDocs)
.limit(maxLimit)
.sort({publishedAt :-1})
.select("title banner  publishedAt blog_id des draft -_id")
.then(blogs=>{
  return res.status(200).json({blogs})
})
.catch(err=>{
  return res.status(500).json({error :err.message})
})
})


server.post("/user-written-blogs-count",verifyJWT,(req,res)=>{

  let user_id = req.user;
  let {page,deletedDocCount,draft,query} =req.body;


  let max_limit =5;
  let skipDocs= (page-1) *max_limit;
  if(deletedDocCount){
    skipDocs-= deletedDocCount
  }

  Blog.countDocuments({author :user_id,draft,title:new RegExp(query,'i')})
  .then(count=>{
    return res.status(200).json({totalDocs:count``})
  })
  .catch(err=>{
    console.log(err)
    return res.status(500).json({error:err.message})
  })



}
)

server.post("/delete-blog",verifyJWT,(req,res)=>{

    let user_id = req.body;
    let {blog_id} = req.body;

    Blog.findOneAndDelete({blog_id})
    .then(blog=>{
      Notification.deleteMany({blog :blog._id}).then(data=>{console.log('notfications deleted')});

    Comment.deleteMany({blog_id:blog._id}).then(data=>console.log('comments deleted'))

    User.findOneAndUpdate({_id :user_id},{$pull:{blog:blog._id}, $inc:{"account_info.total_posts":-1}}).then(user=> console.log('Blog deleted'))

    return res.status(200).json({status: 'done'})


    })
    .catch(err=>{
      return res.status(500).json({error:err.message})
    })

})



server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
