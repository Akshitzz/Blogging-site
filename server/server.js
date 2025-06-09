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

// Enable CORS for all routes
server.use(cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

server.use(express.json());

// Handle preflight requests
server.options('*', cors({
    origin: process.env.NODE_ENV === 'production' ? process.env.CLIENT_URL : 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// MongoDB Connection with proper options
mongoose.connect(process.env.CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000, // Increase timeout to 30 seconds
    socketTimeoutMS: 45000, // Increase socket timeout
    family: 4, // Use IPv4, skip trying IPv6
    ssl: true,
    retryWrites: true,
    w: "majority"
})
.then(() => {
    console.log('Connected to MongoDB Atlas');
})
.catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Handle MongoDB connection errors
mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
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

server.post("/change-password", verifyJWT, async (req, res) => {
    try {
        console.log("Change password request body:", req.body);
        console.log("User ID from token:", req.user);
        let { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            console.log("Missing password fields");
            return res.status(400).json({ error: "Both current and new password are required" });
        }

        if (!passwordRegex.test(currentPassword) || !passwordRegex.test(newPassword)) {
            return res.status(403).json({ error: "Password should be 6 to 20 characters long with a numeric, 1 lowercase and 1 uppercase letters" });
        }

        const user = await User.findOne({ _id: req.user });
        console.log("Found user:", user ? "Yes" : "No");
        
        if (!user) {
            console.log("User not found");
            return res.status(404).json({ error: "User not found" });
        }

        if (user.google_auth) {
            console.log("Google auth user");
            return res.status(403).json({ error: "You can't change account's password because you logged in through Google" });
        }

        console.log("Comparing passwords...");
        const passwordMatch = await bcrypt.compare(currentPassword, user.personal_info.password);
        console.log("Password match:", passwordMatch);
        
        if (!passwordMatch) {
            console.log("Incorrect current password");
            return res.status(403).json({ error: "Incorrect current password" });
        }

        console.log("Hashing new password...");
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        console.log("Updating user password...");
        await User.findOneAndUpdate(
            { _id: req.user },
            { "personal_info.password": hashedPassword }
        );

        console.log("Password updated successfully");
        return res.status(200).json({ status: 'password changed' });
    } catch (err) {
        console.error("Change password error:", err);
        return res.status(500).json({ error: err.message || "Internal server error" });
    }
});

server.post('/latest-blogs', (req, res) => {
    let { page = 1 } = req.body;
    let maxLimit = 5;

    Blog.find({ draft: false })
        .populate("author", "personal_info.username personal_info.fullname personal_info.profile_img -_id")
        .sort({ "publishedAt": -1 })
  .select("blog_id title des banner activity tags publishedAt -_id")
        .skip((page - 1) * maxLimit)
  .limit(maxLimit)
        .then(blogs => {
            return res.status(200).json({ blogs });
  })
        .catch(err => {
            console.error("Error fetching latest blogs:", err);
            return res.status(500).json({ error: err.message });
        });
});

server.get('/trending-blogs', (req, res) => {
    Blog.find({ draft: false })
        .populate("author", "personal_info.username personal_info.fullname personal_info.profile_img -_id")
        .sort({
            "activity.total_reads": -1,
            "activity.total_likes": -1,
            "publishedAt": -1
        })
        .select("blog_id title des banner activity tags publishedAt -_id")
  .limit(5)
        .then(blogs => {
            return res.status(200).json({ blogs });
  })
        .catch(err => {
            console.error("Error fetching trending blogs:", err);
            return res.status(500).json({ error: err.message });
        });
});

server.post("/search-blogs", (req, res) => {
    let { tag, page = 1, query, author, limit = 5, eliminate_blog } = req.body;
    let findQuery;

    if (tag) {
        findQuery = { tags: tag, draft: false };
        if (eliminate_blog) {
            findQuery.blog_id = { $ne: eliminate_blog };
        }
    } else if (query) {
        findQuery = { 
            draft: false,
            $or: [
                { title: new RegExp(query, 'i') },
                { des: new RegExp(query, 'i') },
                { tags: new RegExp(query, 'i') }
            ]
        };
    } else if (author) {
        findQuery = { author, draft: false };
    }

    let maxLimit = limit;

    Blog.find(findQuery)
        .populate("author", "personal_info.profile_img personal_info.username personal_info.fullname -_id")
        .sort({ "publishedAt": -1 })
        .select("blog_id title des banner activity tags publishedAt -_id")
        .skip((page - 1) * maxLimit)
        .limit(maxLimit)
        .then(blogs => {
            return res.status(200).json({ blogs });
        })
        .catch(err => {
            console.error("Error in search-blogs:", err);
            return res.status(500).json({ error: err.message });
        });
});

server.post("/search-blogs-count", (req, res) => {
    let { tag, query, author } = req.body;
    let findQuery;

    if (tag) {
        findQuery = { tags: tag, draft: false };
    } else if (query) {
        findQuery = { 
            draft: false,
            $or: [
                { title: new RegExp(query, 'i') },
                { des: new RegExp(query, 'i') },
                { tags: new RegExp(query, 'i') }
            ]
        };
    } else if (author) {
        findQuery = { author, draft: false };
    }

    Blog.countDocuments(findQuery)
        .then(count => {
            return res.status(200).json({ totalDocs: count });
        })
        .catch(err => {
            console.error("Error in search-blogs-count:", err);
            return res.status(500).json({ error: err.message });
        });
});

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

server.post("/update-profile-img",verifyJWT,(req,res)=>{
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
server.post("/get-blog", async (req, res) => {
    try {
        let { blog_id, draft, mode } = req.body;
        let incrementVal = mode !== 'edit' ? 1 : 0;

        // Get the auth token if present
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(" ")[1];
        let userId;

        // If we're in edit mode, verify the token
        if (mode === 'edit') {
            if (!token) {
                return res.status(401).json({ error: "Authentication required to edit blog" });
            }
            try {
                const decoded = jwt.verify(token, process.env.SECRET_ACCESS_KEY);
                userId = decoded.id;
            } catch (err) {
                return res.status(403).json({ error: "Invalid authentication token" });
            }
        }

        const blog = await Blog.findOne({ blog_id })
            .populate("author", "personal_info.username personal_info.fullname personal_info.profile_img")
            .select("title des banner content activity publishedAt blog_id tags draft author");

        if (!blog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        // In edit mode, verify the user is the author
        if (mode === 'edit' && blog.author._id.toString() !== userId) {
            return res.status(403).json({ error: "You don't have permission to edit this blog" });
        }

        if (blog.draft && !draft && mode !== 'edit') {
            return res.status(403).json({ error: "You cannot access draft blog" });
        }

        // Only increment reads if not in edit mode
        if (incrementVal > 0) {
            await Blog.findOneAndUpdate({ blog_id }, { $inc: { "activity.total_reads": incrementVal } });
            await User.findOneAndUpdate(
                { "personal_info.username": blog.author.personal_info.username },
                { $inc: { "account_info.total_reads": incrementVal } }
            );
        }

        return res.status(200).json({ blog });
    } catch (err) {
        console.error("Error in get-blog:", err);
        return res.status(500).json({ error: err.message });
    }
});

server.post("/add-comment",verifyJWT,(req,res)=>{
  let user_id = req.user;
  let {_id, comment, blog_author, replying_to, notification_id} = req.body;
  
  if(!comment.length){
    return res.status(403).json({error:"Write something to comment"})
  }

  // creating a comment object
  let commentObj = {
    blog_id: _id,
    blog_author,
    comment,
    commented_by: user_id,  // Make sure we set the commented_by field
    children: []
  }

  if(replying_to){
    commentObj.parent = replying_to;
    commentObj.isReply = true;
  }

  new Comment(commentObj).save()
    .then(async commentFile => {
      let {comment, commentedAt, children} = commentFile;

      await Blog.findOneAndUpdate(
        {_id},
        {
          $push: {"comments": commentFile._id},
          $inc: {
            "activity.total_comments": 1,
            "activity.total_parent_comments": replying_to ? 0 : 1
          }
        }
      );

      let notificationObj = {
        type: replying_to ? "reply" : "comment",
        blog: _id,
        notification_for: blog_author,
        user: user_id,
        comment: commentFile._id,
      }

      if(replying_to){
        notificationObj.replied_on_comment = replying_to;

        await Comment.findOneAndUpdate(
          {_id: replying_to},
          {$push: {children: commentFile._id}}
        ).then(replyingToCommentDoc => {
          notificationObj.notification_for = replyingToCommentDoc.commented_by
        });

        if(notification_id){
          await Notification.findOneAndUpdate(
            {_id: notification_id},
            {reply: commentFile._id}
          );
        }
      }

      await new Notification(notificationObj).save();

      return res.status(200).json({
        comment,
        commentedAt,
        _id: commentFile._id,
        user_id,
        children
      });
    })
    .catch(err => {
      console.error("Error adding comment:", err);
      return res.status(500).json({error: err.message})
    });
});

server.post("/get-blog-comments", async (req, res) => {
    try {
        const { blog_id, skip = 0 } = req.body;

        console.log("Fetching comments for blog:", blog_id);

        const comments = await Comment.find({ blog_id })
            .populate({
                path: "commented_by",
                select: "personal_info.username personal_info.fullname personal_info.profile_img",
                model: "users"
            })
            .populate({
                path: "blog_author",
                select: "personal_info.username personal_info.fullname personal_info.profile_img",
                model: "users"
            })
            .populate({
                path: "children",
                populate: {
                    path: "commented_by",
                    select: "personal_info.username personal_info.fullname personal_info.profile_img",
                    model: "users"
                }
            })
            .sort({ commentedAt: -1 })
            .skip(skip)
            .limit(5);

        console.log("Found comments:", comments.map(c => ({
            id: c._id,
            comment: c.comment,
            commented_by: c.commented_by?.personal_info,
            blog_author: c.blog_author?.personal_info
        })));

        return res.status(200).json(comments);
    } catch (error) {
        console.error("Error fetching comments:", error);
        return res.status(500).json({ error: "Error while fetching comments" });
    }
});

server.post("/get-replies", async (req, res) => {
    try {
        let { _id, skip = 0 } = req.body;
        let max_limit = 5;

        const comment = await Comment.findById(_id)
            .populate({
                path: "children",
                options: {
                    limit: max_limit,
                    skip: skip,
                    sort: { 'commentedAt': -1 }
                },
                populate: [{
                    path: 'commented_by',
                    select: "personal_info.profile_img personal_info.fullname personal_info.username"
                }, {
                    path: 'blog_author',
                    select: "personal_info.profile_img personal_info.fullname personal_info.username"
                }]
            })
            .select("children");

        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        return res.status(200).json({ replies: comment.children || [] });
    } catch (err) {
        console.error("Error in get-replies:", err);
        return res.status(500).json({ error: err.message });
    }
});

const deleteComments = async (_id) => {
    try {
        const comment = await Comment.findOneAndDelete({ _id });
        if (!comment) {
            throw new Error("Comment not found");
        }

        // Delete from parent if it's a reply
        if (comment.parent) {
            await Comment.findOneAndUpdate(
                { _id: comment.parent },
                { $pull: { children: _id } }
            );
        }

        // Delete notifications
        await Notification.findOneAndDelete({ comment: _id });
        await Notification.findOneAndUpdate(
            { reply: _id },
            { $unset: { reply: 1 } }
        );

        // Update blog
        await Blog.findOneAndUpdate(
            { _id: comment.blog_id },
            {
                $pull: { comments: _id },
                $inc: {
                    "activity.total_comments": -1,
                    "activity.total_parent_comments": comment.parent ? 0 : -1
                }
            }
        );

        // Recursively delete child comments
        if (comment.children && comment.children.length) {
            await Promise.all(comment.children.map(reply => deleteComments(reply)));
        }

        return true;
    } catch (err) {
        console.error("Error in deleteComments:", err);
        throw err;
    }
}

server.post("/delete-comment", verifyJWT, async (req, res) => {
    try {
        const user_id = req.user;
        const { _id } = req.body;

        if (!_id) {
            return res.status(400).json({ error: "Comment ID is required" });
        }

        // Find the comment with populated commented_by field
        const comment = await Comment.findById(_id)
            .populate('commented_by', '_id')
            .populate('blog_author', '_id');

        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }

        // Convert ObjectIds to strings for comparison
        const commentedById = comment.commented_by?._id?.toString();
        const blogAuthorId = comment.blog_author?._id?.toString();
        const userId = user_id.toString();

        console.log('Deleting comment:', {
            commentId: _id,
            commentedById,
            blogAuthorId,
            userId,
            rawComment: comment
        });

        // Check if user has permission to delete
        if (commentedById !== userId && blogAuthorId !== userId) {
            return res.status(403).json({ error: "You don't have permission to delete this comment" });
        }

        await deleteComments(_id);
        return res.status(200).json({ status: "Comment deleted successfully" });
    } catch (err) {
        console.error("Error in delete-comment:", err);
        return res.status(500).json({ error: err.message || "Failed to delete comment" });
    }
});

server.get("/get-notification",verifyJWT,(req,res)=>{
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


server.post("/notifications", verifyJWT, async (req, res) => {
    try {
        let { page = 1, filter, deletedDocCount = 0 } = req.body;
        let maxLimit = 10;

        let query = { notification_for: req.user };
        
        if(filter != 'all') {
            query.type = filter;
        }

        let notifications = await Notification.find(query)
            .populate('blog', 'title blog_id')
            .populate('comment', 'comment')
            .populate('replied_on_comment', 'comment')
            .populate('user', 'personal_info.username personal_info.fullname personal_info.profile_img')
            .sort({ createdAt: -1 })
            .skip((page - 1) * maxLimit)
            .limit(maxLimit)
            .select('-notification_for');

        return res.status(200).json({ notifications });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: err.message });
    }
});

server.post("/all-notifications-count", verifyJWT, async (req, res) => {
    try {
        let { filter } = req.body;
        let query = { notification_for: req.user };
        
        if(filter != 'all') {
            query.type = filter;
        }

        let count = await Notification.countDocuments(query);
        return res.status(200).json({ totalDocs: count });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

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


server.post("/user-written-blogs-count", verifyJWT, (req, res) => {
  let user_id = req.user;
    let {draft, query} = req.body;

    Blog.countDocuments({
        author: user_id,
        draft: draft || false,
        title: new RegExp(query || '', 'i')
    })
    .then(count => {
        return res.status(200).json({totalDocs: count});
  })
    .catch(err => {
        console.log(err);
        return res.status(500).json({error: err.message});
    });
});

server.post("/delete-blog", verifyJWT, (req, res) => {
    let user_id = req.user;
    let {blog_id} = req.body;

    Blog.findOneAndDelete({blog_id})
        .then(blog => {
            if (!blog) {
                return res.status(404).json({error: "Blog not found"});
            }

            Promise.all([
                Notification.deleteMany({blog: blog._id}),
                Comment.deleteMany({blog_id: blog._id}),
                User.findOneAndUpdate(
                    {_id: user_id},
                    {
                        $pull: {blogs: blog._id},
                        $inc: {"account_info.total_posts": -1}
                    }
                )
            ])
            .then(() => {
                return res.status(200).json({status: 'done'});
    })
            .catch(err => {
                return res.status(500).json({error: err.message});
            });
        })
        .catch(err => {
            return res.status(500).json({error: err.message});
        });
});

server.post("/get-comments", async (req, res) => {
    try {
        const { blog_id, skip = 0 } = req.body;

        const comments = await Comment.find({ blog_id })
            .populate("commented_by", "personal_info.username personal_info.fullname personal_info.profile_img")
            .populate("children")
            .sort({ commentedAt: -1 })
            .skip(skip)
            .limit(5);

        return res.status(200).json(comments);
    } catch (error) {
        console.error("Error fetching comments:", error);
        return res.status(500).json({ error: "Error while fetching comments" });
    }
});

server.post("/like-blog", verifyJWT, async (req, res) => {
    try {
        const user_id = req.user;
        const { _id } = req.body;

        // Find the blog
        const blog = await Blog.findById(_id);
        if (!blog) {
            return res.status(404).json({ error: "Blog not found" });
        }

        // Check if user has already liked
        const hasLiked = blog.activity.likedBy.includes(user_id);
        
        if (hasLiked) {
            // Unlike: Remove user from likedBy and decrement count
            await Blog.findByIdAndUpdate(_id, {
                $pull: { "activity.likedBy": user_id },
                $inc: { "activity.total_likes": -1 }
            });

            // Remove like notification
            await Notification.findOneAndDelete({
                type: "like",
                blog: _id,
                user: user_id
            });

            return res.status(200).json({ status: "Blog unliked successfully" });
        } else {
            // Like: Add user to likedBy and increment count
            await Blog.findByIdAndUpdate(_id, {
                $addToSet: { "activity.likedBy": user_id },
                $inc: { "activity.total_likes": 1 }
            });

            // Create notification for blog author
            const notification = new Notification({
                type: "like",
                blog: _id,
                notification_for: blog.author,
                user: user_id
            });

            await notification.save();
            return res.status(200).json({ status: "Blog liked successfully" });
        }
    } catch (err) {
        console.error("Error in like-blog:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
