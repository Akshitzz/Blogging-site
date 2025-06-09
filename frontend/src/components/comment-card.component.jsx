import { getDay } from "../common/date";
import { UserContext } from "../App";
import { useContext, useState, useEffect } from "react";
import CommentField from "./comment-field.component";
import { BlogContext } from "../pages/blog.page";
import axios from "axios";
import toast from "react-hot-toast";

const CommentCard = ({index, leftVal, commentData}) => {
    const [isReplying, setReplying] = useState(false);

    // Only log on mount
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log("CommentCard mounted:", {
                index,
                leftVal,
                commentData: {
                    _id: commentData?._id,
                    comment: commentData?.comment,
                    childrenLevel: commentData?.childrenLevel
                }
            });
        }
    }, []); // Empty dependency array means this only runs once on mount

    // Early return if no commentData
    if (!commentData) {
        console.error("CommentCard: No comment data provided");
        return null;
    }

    // Early return if no commented_by
    if (!commentData.commented_by) {
        console.error("CommentCard: No commented_by data");
        return null;
    }

    // Safely destructure the data with null checks
    const commented_by = commentData.commented_by || {};
    const personal_info = commented_by.personal_info || {};
    const blog_author = commentData.blog_author || {};
    const author_info = blog_author.personal_info || {};

    const {
        fullname = "",
        profile_img = "",
        username: commented_by_username = ""
    } = personal_info;

    const {
        fullname: author_fullname = "",
        profile_img: author_profile_img = "",
        username: author_username = ""
    } = author_info;

    const {
        commentedAt = new Date(),
        comment = "",
        _id = "",
        children = []
    } = commentData;

    const { userAuth = {} } = useContext(UserContext);
    const { access_token, username } = userAuth;

    const {
        blog = {},
        setBlog,
        setTotalParentCommentLoaded
    } = useContext(BlogContext);

    const {
        comments = { results: [] },
        activity = {},
    } = blog;

    const commentArr = comments.results || [];
    const total_parent_comments = activity.total_parent_comments || 0;

    const getParentIndex = () => {
        let startingPoint = index - 1;

        // Handle edge cases
        if (startingPoint < 0 || !commentArr[startingPoint]) {
            return undefined;
        }

        // Handle case where current comment has no childrenLevel
        if (!commentData?.childrenLevel) {
            return undefined;
        }

        try {
            // Look for parent comment by checking childrenLevel
            while (startingPoint >= 0) {
                if (!commentArr[startingPoint]) {
                    return undefined;
                }
                
                if (commentArr[startingPoint].childrenLevel < commentData.childrenLevel) {
                    return startingPoint;
                }
                
                startingPoint--;
            }
            
            // If we couldn't find a parent
            return undefined;
        } catch (err) {
            console.error("Error in getParentIndex:", err);
            return undefined;
        }
    }

    const removeCommentsCard = (startingPoint, isDelete = false) => {
        try {
            if(commentArr[startingPoint]) {
                while(commentArr[startingPoint]?.childrenLevel > commentData.childrenLevel) {
                    commentArr.splice(startingPoint, 1);
                    if(!commentArr[startingPoint]) {
                        break;
                    }
                }
            }
            if(isDelete) {
                let parentIndex = getParentIndex();
                if(parentIndex !== undefined) {
                    commentArr[parentIndex].children = commentArr[parentIndex].children.filter(child => child !== _id);
                    if(!commentArr[parentIndex].children.length) {
                        commentArr[parentIndex].isReplyLoaded = false;
                    }
                }
                commentArr.splice(index, 1);
            }
            if(commentData.childrenLevel == 0 && isDelete) {
                setTotalParentCommentLoaded(preVal => preVal - 1);
            }
            setBlog({
                ...blog,
                comments: {results: commentArr},
                activity: {
                    ...activity,
                    total_parent_comments: total_parent_comments - (commentData.childrenLevel == 0 && isDelete ? 1 : 0)
                }
            });
        } catch (err) {
            console.error("Error in removeCommentsCard:", err);
        }
    }

    const handleReplyClick = () => {
        if(!access_token) {
            return toast.error("Please login to reply to comments");
        }
        setReplying(prev => !prev);
    }

    const deleteComment = (e) => {
        if (!access_token) {
            return toast.error("Please login to delete comments");
        }

        if (!window.confirm("Are you sure you want to delete this comment?")) {
            return;
        }

        const button = e.target;
        button.setAttribute("disabled", true);
        
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/delete-comment", 
            { _id },
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            }
        )
        .then(({data}) => {
            button.removeAttribute("disabled");
            removeCommentsCard(index + 1, true);
            toast.success(data.status || "Comment deleted successfully");
        })
        .catch(err => {
            console.error("Error deleting comment:", err);
            button.removeAttribute("disabled");
            toast.error(err.response?.data?.error || "Failed to delete comment");
        });
    }

    const loadReplies = ({skip = 0, currentIndex = index}) => {
        if(commentArr[currentIndex]?.children?.length) {
            hideReplies();
            axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-replies", {
                _id: commentArr[currentIndex]._id,
                skip
            })
            .then(({data: {replies}}) => {
                commentData.isReplyLoaded = true;
                for(let i = 0; i < replies.length; i++) {
                    replies[i].childrenLevel = commentData.childrenLevel + 1;
                    commentArr.splice(currentIndex + 1 + i + skip, 0, replies[i]);
                }
                setBlog({...blog, comments: {...comments, results: commentArr}});
            })
            .catch(err => {
                console.error("Error loading replies:", err);
                toast.error("Failed to load replies");
            });
        }
    }

    const hideReplies = () => {
        commentData.isReplyLoaded = false;
        removeCommentsCard(index + 1);
    }

    const LoadMoreRepliesButton = () => {
        let parentIndex = getParentIndex();
        
        // Add null checks
        if (parentIndex === undefined || !commentArr[parentIndex]) {
            return null;
        }

        // Ensure children array exists
        if (!commentArr[parentIndex].children) {
            commentArr[parentIndex].children = [];
            return null;
        }

        let button = (
            <button 
                onClick={() => loadReplies({skip: index - parentIndex, currentIndex: parentIndex})}
                className="text-dark-grey p-2 px-3 hover:bg-grey/30 rounded-md flex items-center gap-2"
            >
                Load More Replies
            </button>
        );

        // Check next comment exists and compare levels
        if (commentArr[index + 1]) {
            if (commentArr[index + 1].childrenLevel < commentData.childrenLevel) {
                if ((index - parentIndex) < commentArr[parentIndex].children.length) {
                    return button;
                }
            }
        } else {
            // If we're at the end of the array
            if ((index - parentIndex) < commentArr[parentIndex].children.length) {
                return button;
            }
        }
        return null;
    }

    // Remove the problematic console.log and replace with useEffect debug logging
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            console.log("CommentCard data updated:", {
                _id: commentData?._id,
                comment: commentData?.comment,
                isReply: commentData?.isReply,
                childrenLevel: commentData?.childrenLevel,
                children: commentData?.children?.length
            });
        }
    }, [commentData?._id, commentData?.comment, commentData?.children?.length]);

    // Early return if essential data is missing
    if (!commentData?.commented_by?.personal_info?.fullname || !_id) {
        if (process.env.NODE_ENV === 'development') {
            console.error("CommentCard: Missing essential data");
        }
        return null;
    }

    return (
        <div className="w-full" style={{paddingLeft: `${leftVal * 10}px`}}>
            <div className="my-5 p-6 rounded-md border border-grey">
                <div className="flex gap-3 items-center mb-8">
                    <img 
                        src={profile_img} 
                        className="w-8 h-8 rounded-full object-cover flex-none" 
                        alt={`${commented_by_username}'s profile`} 
                    />
                    <div className="flex flex-col">
                        <p className="font-medium">
                            {fullname || "Anonymous"} 
                            <span className="text-dark-grey ml-2">@{commented_by_username}</span>
                            {commented_by_username === author_username && (
                                <span className="ml-2 text-dark-grey">(Author)</span>
                            )}
                        </p>
                        <p className="text-dark-grey text-sm">{getDay(commentedAt)}</p>
                    </div>
                </div>
                <p className="font-gelasio text-xl ml-3">{comment}</p>

                <div className="flex gap-5 items-center mt-5">
                    {children.length > 0 && (
                        commentData.isReplyLoaded ? (
                            <button 
                                className="text-dark-grey p-2 px-3 hover:bg-grey/30 rounded-md flex items-center gap-2"
                                onClick={hideReplies}
                            >
                                <i className="fi fi-rr-comment-dots"></i>
                                Hide Replies
                            </button>
                        ) : (
                            <button 
                                className="text-dark-grey p-2 px-3 hover:bg-grey/30 rounded-md flex items-center gap-2"
                                onClick={loadReplies}
                            >
                                <i className="fi fi-rr-comment-dots"></i>
                                {children.length} {children.length === 1 ? 'Reply' : 'Replies'}
                            </button>
                        )
                    )}
                    
                    <button 
                        className="text-dark-grey hover:text-black underline"
                        onClick={handleReplyClick}
                    >
                        Reply
                    </button>
                    
                    {(username === commented_by_username || username === author_username) && (
                        <button 
                            className="p-2 px-3 rounded-md border border-grey ml-auto hover:bg-red/30 hover:text-red flex items-center gap-2"
                            onClick={deleteComment}
                        >
                            <i className="fi fi-rr-trash pointer-events-none"></i>
                            Delete
                        </button>
                    )}
                </div>

                {isReplying && (
                    <div className="mt-8">
                        <CommentField 
                            action="Reply"
                            index={index}
                            replyingTo={_id}
                            setReplying={setReplying}
                        />
                    </div>
                )}
            </div>
            <LoadMoreRepliesButton />
        </div>
    );
}

export default CommentCard;