import { useContext } from "react";
import { BlogContext } from "../pages/blog.page";
import {UserContext} from "../App"
import { Link } from "react-router-dom";
import {toast,Toaster} from "react-hot-toast";
const BlogInteraction =()=>{

let {blog:{blog_id , activity, activity :{total_likes,total_comments},author:{personal_info:{username:author_username}}},setBlog ,isLikedByUser,setLikedByUser} = useContext(BlogContext)

let {userAuth:{username,access_token}} =useContext(UserContext)
    const handleLike = () => {
        if(access_token){
//  like the blog
                    isLikedByUser(preVal =>!preVal);
                    !isLikedByUser ? total_likes ++ :total_likes--;
                    setBlog({...blog,activity:{...activity,total_likes}})
                    total_likes--;
                    console.log(isLikedByUser);
        }else{
            //  unlike the blog 
            toast.error("please logged in to like this blog  ")
        }
    }
    return (
        <>
        <Toaster/>
            <hr  className="border-grey my-2"/>
            <div className="flex gap-6 justify-between">
             <div className="flex gap-3 items-center">
                   <div >
                    <button 
                    onClick={handleLike}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-grey/10">
                            <i className="fi fi-rr-heart"></i>
                    </button>
                <p>{total_likes}</p>
                </div>


                <div className="flex gap-3 items-center">
                    <button className="w-10 h-10 rounded-full flex items-center justify-center bg-grey/10">
                            <i className="fi fi-rr-comment-dots"></i>
                    </button>
                <p>{total_comments}</p>
                </div>

             </div>

                <div className="flex gap-6 items-center">


                {
                    username == author_username ? 
                    <Link to ={`/editor/${blog_id}`} className="underline hover:text-purple">Edit</Link> : ''
                }


                    <Link to={`https://twitter.com/intent/tweet?text=Read ${title}&url=${location.href}`}><i className="fi fi-brands-twitter text-xl hover:text-twitter"></i></Link>
                </div>
            </div>


            <hr  className="border-grey my-2"/>
        </>
    )
}

export default BlogInteraction;