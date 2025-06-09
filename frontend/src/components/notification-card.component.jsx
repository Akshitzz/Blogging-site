import { useContext, useState } from "react";
import { Link } from "react-router-dom";
import NotificationCommentField from "./notification-comment-field.component";
import { UserContext } from "../App";
import axios from "axios";
import { getDay } from "../common/date";
import { toast } from "react-hot-toast";

const NotificationCard = ({ data, index, notificationState }) => {
    const [isReplying, setReplying] = useState(false);
    const { notifications, notifications: { results, totalDocs }, setNotifications } = notificationState;
    const { userAuth: { username: author_username, profile_img: author_profile_img, access_token } } = useContext(UserContext);

    const {
        seen,
        type,
        reply,
        createdAt,
        comment,
        replied_on_comment,
        user,
        user: {
            personal_info: {
                fullname,
                username,
                profile_img
            }
        },
        blog: {
            _id,
            blog_id,
            title
        },
        _id: notification_id
    } = data;

    const handleReplyClick = () => {
        if (!access_token) {
            return toast.error("Please login to reply");
        }
        setReplying(prev => !prev);
    }

    const handleDelete = (comment_id, type, target) => {
        if (!access_token) {
            return toast.error("Please login to delete");
        }

        target.setAttribute("disabled", true);

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/delete-comment", 
            { _id: comment_id },
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            }
        )
        .then(() => {
            if (type === 'comment') {
                results.splice(index, 1);
            } else {
                delete results[index].reply;
            }

            target.removeAttribute("disabled");
            setNotifications({
                ...notifications,
                results,
                totalDocs: totalDocs - 1,
                deleteDocCount: notifications.deleteDocCount + 1
            });
        })
        .catch(err => {
            console.error("Error deleting comment:", err);
            target.removeAttribute("disabled");
            toast.error(err.response?.data?.error || "Failed to delete comment");
        });
    }

    return (
        <div className={"p-6 border-b border-grey " + (!seen ? "border-l-2 border-l-black" : "")}>
            <div className="flex gap-5 mb-3">
                <img 
                    src={profile_img} 
                    className="w-14 h-14 flex-none rounded-full object-cover"
                    alt={`${username}'s profile`}
                />
                <div className="w-full">
                    <h1 className="font-medium text-xl text-dark-grey">
                        <span className="lg:inline-block hidden capitalize">{fullname}</span>
                        <Link 
                            to={`/user/${username}`}
                            className="mx-1 text-black underline hover:text-dark-grey"
                        >
                            @{username}
                        </Link>
                        <span className="font-normal">
                            {type === 'like' ? 'liked your blog' :
                             type === 'comment' ? 'commented on' :
                             'replied on'}
                        </span>
                    </h1>

                    {type === 'reply' ? (
                        <div className="p-4 mt-4 rounded-md bg-grey">
                            <p>{typeof replied_on_comment === 'object' ? replied_on_comment.comment : replied_on_comment}</p>
                        </div>
                    ) : (
                        <Link 
                            to={`/blog/${blog_id}`}
                            className="font-medium text-dark-grey hover:underline line-clamp-1"
                        >
                            "{title}"
                        </Link>
                    )}
                </div>
            </div>

            {type !== 'like' && (
                <p className="ml-14 pl-5 font-gelasio text-xl my-5">
                    {typeof comment === 'object' ? comment.comment : comment}
                </p>
            )}

            <div className="ml-14 pl-5 mt-3 text-dark-grey flex gap-8 items-center">
                <p>{getDay(createdAt)}</p>

                {type !== 'like' && (
                    <>
                        {!reply && (
                            <button 
                                className="underline hover:text-black"
                                onClick={handleReplyClick}
                            >
                                Reply
                            </button>
                        )}
                        <button 
                            onClick={(e) => handleDelete(comment._id, "comment", e.target)}
                            className="underline hover:text-black"
                        >
                            Delete
                        </button>
                    </>
                )}
            </div>

            {isReplying && (
                <div className="mt-8">
                    <NotificationCommentField
                        _id={_id}
                        blog_author={user}
                        index={index}
                        replyingTo={comment._id}
                        setReplying={setReplying}
                        notification_id={notification_id}
                        notificationData={notificationState}
                    />
                </div>
            )}

            {reply && (
                <div className="ml-20 bg-grey mt-5 rounded-md p-5">
                    <div className="flex gap-5 mb-3">
                        <img 
                            src={author_profile_img}
                            className="w-8 h-8 rounded-full object-cover"
                            alt={`${author_username}'s profile`}
                        />
                        <div>
                            <h1 className="font-medium text-xl text-dark-grey">
                                <Link 
                                    to={`/user/${author_username}`}
                                    className="hover:underline"
                                >
                                    @{author_username}
                                </Link>
                                <span className="font-normal mx-2">
                                    replied to
                                </span>
                                <Link 
                                    to={`/user/${username}`}
                                    className="text-black underline hover:text-dark-grey"
                                >
                                    @{username}
                                </Link>
                            </h1>
                        </div>
                    </div>

                    <p className="ml-14 font-gelasio text-xl my-2">
                        {reply.comment}
                    </p>

                    <button 
                        onClick={(e) => handleDelete(reply._id, "reply", e.target)}
                        className="underline hover:text-black ml-14 mt-2"
                    >
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
}

export default NotificationCard;