import { useContext, useState } from "react";
import { UserContext } from "../App";
import toast ,{Toaster} from "react-hot-toast";
import axios from "axios";
import { BlogContext } from "../pages/blog.page";


export const CommentField = ({action,index =undefined,replyingTo=undefined,setReplying}) => {

    let {blog:{_id ,author:{_id:blog_author},comments,comments:{comments:commentArr},activity:{total_comments,total_parent_comment}},setBlog,setTotalParentCommentLoaded} =useContext(BlogContext);

    let{ userAuth:{access_token ,username,fullname,profile_img} } =useContext(UserContext);

    const [comment,setcomment] = useState("");
    const handleComment =()=>{
        if(!access_token){
            toast.error("Please log in to comment");
            
        }
        if(!comment.length){
            return toast.error("Write something to comment");
        }

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/add-comment",{
            _id,blog_author,comment ,replyingTo:replyingTo
        },{
            header:{
                'Authorization':`Bearer ${access_token}`
            }
        })
        .then(({data})=>{

            setcomment("");
            data.commented_by = {personal_info:{username,profile_img,fullname}}
                 let newCommentArr;
            if(replyingTo){
                commentArr[index].children.push(data._id);
                
                data.childrenLevel = commentArr[index].childrenLevel +1;
                data.parentIndex =index;

                commentArr[index].isReplyLoaded =true;
                commentArr.splice(index +1,0,data)
                newCommentArr = commentArr
                setReplying(false);
                // 
            }else{
                data.childrenLevel =0;
                 newCommentArr =[data, ...commentArr];
            }


            let parentCommentIncrement = replyingTo ?0 :1;
            setBlog({...blog,comment:{...comments},results:newCommentArr,activity:{...activity,total_comments:total_comments +1,total_parent_comments:total_parent_comment + parentCommentIncrement}});

            setTotalParentCommentLoaded(preVal => preVal + parentCommentIncrement);
            toast.success("Comment added successfully");

        })
        .catch(err=>{
            console.log(err);
            
        })
    }
    return (
        <>
            <textarea value={comment}
            onChange={(e)=>setcomment(e.target.value)}
            placeholder="Leave a comment ..."  className="input-box pl-5 placeholder:text-dark-grey resize-none h-[150px] overflow-auto"></textarea>
            <button className="btn-dark mt-5 px-10" onClick={handleComment}>{action}</button>
        </>
    )
}