import { useContext, useState } from "react";
import { UserContext } from "../App";
import toast from "react-hot-toast";
import axios from "axios";
import { BlogContext } from "../pages/blog.page";

const CommentField = ({action, index = undefined, replyingTo = undefined, setReplying}) => {
    const [comment, setComment] = useState("");
    
    const { 
        blog, 
        blog: { 
            _id, 
            author: { 
                _id: blog_author_id,
                personal_info: {
                    fullname: blog_author_fullname,
                    username: blog_author_username,
                    profile_img: blog_author_profile_img
                }
            }, 
            comments = { results: [] }, 
            activity 
        }, 
        setBlog, 
        setTotalParentCommentLoaded 
    } = useContext(BlogContext);

    const { userAuth: { access_token, username, fullname, profile_img } } = useContext(UserContext);

    const handleComment = () => {
        if(!access_token) {
            return toast.error("Please log in to comment");
        }
        
        if(!comment.length) {
            return toast.error("Write something to comment");
        }

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/add-comment", {
            _id,
            blog_author: blog_author_id,
            comment,
            replying_to: replyingTo
        }, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
        .then(({data}) => {
            setComment("");
            
            // Prepare the new comment data
            const newComment = {
                _id: data._id,
                comment: data.comment,
                commentedAt: data.commentedAt,
                children: data.children || [],
                commented_by: {
                    personal_info: {
                        username,
                        fullname,
                        profile_img
                    }
                },
                blog_author: {
                    personal_info: {
                        username: blog_author_username,
                        fullname: blog_author_fullname,
                        profile_img: blog_author_profile_img
                    }
                },
                childrenLevel: 0
            };

            let updatedComments;
            if(replyingTo) {
                // Handle reply
                const commentArr = [...comments.results];
                if(commentArr[index]) {
                    commentArr[index].children = commentArr[index].children || [];
                    commentArr[index].children.push(data._id);
                    newComment.childrenLevel = commentArr[index].childrenLevel + 1;
                    newComment.parentIndex = index;
                    commentArr[index].isReplyLoaded = true;
                    commentArr.splice(index + 1, 0, newComment);
                }
                updatedComments = { results: commentArr };
                setReplying(false);
            } else {
                // Handle new comment
                newComment.childrenLevel = 0;
                updatedComments = {
                    results: [newComment, ...(comments.results || [])]
                };
            }

            // Update blog state
            setBlog({
                ...blog,
                comments: updatedComments,
                activity: {
                    ...activity,
                    total_comments: (activity?.total_comments || 0) + 1,
                    total_parent_comments: (activity?.total_parent_comments || 0) + (replyingTo ? 0 : 1)
                }
            });

            if(!replyingTo) {
                setTotalParentCommentLoaded(prev => prev + 1);
            }

            toast.success(`${action} added successfully`);
        })
        .catch(err => {
            console.error("Error adding comment:", err);
            toast.error(err.response?.data?.error || "Failed to add comment");
        });
    }

    return (
        <div className="flex gap-5 items-start">
            <img 
                src={profile_img} 
                alt={`${username}'s profile`}
                className="w-8 h-8 rounded-full object-cover flex-none"
            />
            <div className="w-full">
                <textarea 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment..."  
                    className="input-box pl-5 placeholder:text-dark-grey resize-none h-[150px] overflow-auto"
                ></textarea>
                <button 
                    className="btn-dark mt-5 px-10"
                    onClick={handleComment}
                >
                    {action}
                </button>
            </div>
        </div>
    );
}

export default CommentField;