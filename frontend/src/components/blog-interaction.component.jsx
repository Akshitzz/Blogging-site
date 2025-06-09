import { useContext } from "react";
import { BlogContext } from "../pages/blog.page";
import { UserContext } from "../App";
import { Link } from "react-router-dom";
import { toast, Toaster } from "react-hot-toast";
import axios from "axios";

const BlogInteraction = () => {
    let { 
        blog: { 
            _id,
            blog_id,
            title,
            activity,
            activity: { total_likes, total_comments },
            author: { personal_info: { username: author_username } }
        },
        setBlog,
        isLikedByUser,
        setLikedByUser,
        commentsWrapper,
        setCommentsWrapper
    } = useContext(BlogContext);

    let { userAuth: { username, access_token } } = useContext(UserContext);

    const handleLike = () => {
        if(access_token) {
            // Optimistically update UI
            setLikedByUser(prevVal => !prevVal);
            let newTotalLikes = isLikedByUser ? total_likes - 1 : total_likes + 1;
            
            setBlog(prevBlog => ({
                ...prevBlog,
                activity: {
                    ...prevBlog.activity,
                    total_likes: newTotalLikes
                }
            }));

            // Make API call to persist the like
            axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/like-blog", {
                _id
            }, {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            })
            .then(({data}) => {
                toast.success(data.status);
            })
            .catch(err => {
                // Revert UI changes if API call fails
                setLikedByUser(prevVal => !prevVal);
                setBlog(prevBlog => ({
                    ...prevBlog,
                    activity: {
                        ...prevBlog.activity,
                        total_likes: total_likes
                    }
                }));
                console.error(err);
                toast.error(err.response?.data?.error || "Failed to update like status");
            });
        } else {
            toast.error("Please log in to like this blog");
        }
    }

    return (
        <>
            <Toaster />
            <hr className="border-grey my-2" />
            <div className="flex gap-6 justify-between">
                <div className="flex gap-3 items-center">
                    <button 
                        className={"w-10 h-10 rounded-full flex items-center justify-center " + (isLikedByUser ? "bg-red/20 text-red" : "bg-grey/80")}
                        onClick={handleLike}
                    >
                        <i className={"fi " + (isLikedByUser ? "fi-sr-heart" : "fi-rr-heart")}></i>
                    </button>
                    <p className="text-xl text-dark-grey">{total_likes}</p>

                    <button 
                        className="w-10 h-10 rounded-full flex items-center justify-center bg-grey/80"
                        onClick={() => setCommentsWrapper(prev => !prev)}
                    >
                        <i className="fi fi-rr-comment-dots"></i>
                    </button>
                    <p className="text-xl text-dark-grey">{total_comments}</p>
                </div>

                <div className="flex gap-6 items-center">
                    {username === author_username && (
                        <Link to={`/editor/${blog_id}`} className="underline hover:text-purple">
                            Edit
                        </Link>
                    )}

                    <Link 
                        to={`https://twitter.com/intent/tweet?text=Read ${title}&url=${window.location.href}`}
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        <i className="fi fi-brands-twitter text-xl hover:text-twitter"></i>
                    </Link>
                </div>
            </div>
            <hr className="border-grey my-2" />
        </>
    );
}

export default BlogInteraction;