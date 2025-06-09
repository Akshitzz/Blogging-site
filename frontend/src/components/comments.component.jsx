import { useContext, useEffect } from "react";
import { BlogContext } from "../pages/blog.page";
import CommentField from "./comment-field.component";
import axios from "axios";
import NoDataMessage from "./nodata.component";
import AnimationWrapper from "../common/page-animation";
import CommentCard from "./comment-card.component";

export const fetchComments = async ({ skip = 0, blog_id, setParentCommentCountFun, comment_array = null }) => {
    try {
        console.log("Fetching comments with params:", { skip, blog_id });
        
        const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-blog-comments", { 
            blog_id, 
            skip 
        });

        console.log("Received comment data:", data);
        
        if (!Array.isArray(data)) {
            console.error("Invalid comment data received:", data);
            return { results: comment_array || [] };
        }
        
        // Ensure each comment has the required structure
        const processedData = data.map(comment => {
            if (!comment) return null;

            // Add safety checks for all required fields
            const processed = {
                ...comment,
                childrenLevel: 0,
                commented_by: comment.commented_by || {
                    personal_info: {
                        fullname: "",
                        username: "",
                        profile_img: ""
                    }
                },
                blog_author: comment.blog_author || {
                    personal_info: {
                        fullname: "",
                        username: "",
                        profile_img: ""
                    }
                },
                children: comment.children || []
            };

            // Ensure personal_info exists
            if (!processed.commented_by.personal_info) {
                processed.commented_by.personal_info = {
                    fullname: "",
                    username: "",
                    profile_img: ""
                };
            }

            if (!processed.blog_author.personal_info) {
                processed.blog_author.personal_info = {
                    fullname: "",
                    username: "",
                    profile_img: ""
                };
            }

            return processed;
        }).filter(Boolean); // Remove any null entries

        if (setParentCommentCountFun) {
            setParentCommentCountFun(prevVal => prevVal + processedData.length);
        }
        
        return {
            results: comment_array ? [...comment_array, ...processedData] : processedData
        };
    } catch (err) {
        console.error("Error fetching comments:", err);
        return { results: comment_array || [] };
    }
}

const CommentsContainer = () => {
    let { 
        blog = {},
        setBlog,
        commentsWrapper,
        setCommentsWrapper,
        totalParentCommentLoaded,
        setTotalParentCommentLoaded
    } = useContext(BlogContext);

    const {
        _id,
        title,
        comments = { results: [] },
        activity = { total_parent_comments: 0 }
    } = blog;

    const commentResults = comments.results || [];
    const total_parent_comments = activity.total_parent_comments || 0;

    useEffect(() => {
        if (_id && (!commentResults || commentResults.length === 0)) {
            loadMoreComments();
        }
    }, [_id]);

    const loadMoreComments = async () => {
        try {
            let newCommentArr = await fetchComments({
                skip: totalParentCommentLoaded,
                blog_id: _id,
                setParentCommentCountFun: setTotalParentCommentLoaded,
                comment_array: commentResults
            });

            setBlog({
                ...blog,
                comments: newCommentArr
            });
        } catch (err) {
            console.error("Error loading more comments:", err);
        }
    }

    return (
        <div className={
            "max-sm:w-full fixed " + 
            (commentsWrapper ? "top-0 sm:right-0" : "top-[100%] sm:right-[-100%]") + 
            " duration-700 max-sm:right-0 sm:top-0 w-[30%] min-w-[350px] h-full z-50 bg-white shadow-2xl p-8 px-16 overflow-y-auto overflow-x-hidden"
        }>
            <div className="relative">
                <h1 className="text-xl font-medium">Comments</h1>
                <p className="text-lg mt-2 w-[70%] text-dark-grey line-clamp-1">{title}</p>

                <button
                    onClick={() => setCommentsWrapper(prevVal => !prevVal)}
                    className="absolute top-0 right-0 flex justify-center items-center w-12 h-12 rounded-full bg-grey hover:bg-grey/80"
                >
                    <i className="fi fi-br-cross text-2xl mt-1"></i>
                </button>
            </div>

            <hr className="border-grey my-8 w-[120%] -ml-10" />

            <CommentField action="Comment" />

            <div className="mt-8 space-y-4">
                {commentResults && commentResults.length > 0 ? (
                    commentResults.map((comment, i) => (
                        comment && (
                            <AnimationWrapper key={`${comment._id}-${i}`}>
                                <CommentCard 
                                    index={i} 
                                    leftVal={comment.childrenLevel * 4} 
                                    commentData={comment}
                                />
                            </AnimationWrapper>
                        )
                    ))
                ) : (
                    <NoDataMessage message="No comments yet. Be the first to comment!" />
                )}

                {total_parent_comments > totalParentCommentLoaded && (
                    <button
                        onClick={loadMoreComments}
                        className="text-dark-grey p-2 px-3 hover:bg-grey/30 rounded-md flex items-center gap-2 mx-auto mt-8"
                    >
                        <i className="fi fi-rr-refresh"></i>
                        Load More Comments
                    </button>
                )}
            </div>
        </div>
    );
}

export default CommentsContainer;