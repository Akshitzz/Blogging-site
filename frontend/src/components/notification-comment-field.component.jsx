import { useContext, useState } from 'react';
import { UserContext } from '../App';
import toast from 'react-hot-toast';
import axios from 'axios';

const NotificationCommentField = ({
    _id,
    blog_author,
    index,
    replyingTo,
    setReplying,
    notification_id,
    notificationData
}) => {
    const [comment, setComment] = useState('');
    const { userAuth: { access_token, username, profile_img, fullname } } = useContext(UserContext);
    const { notifications, notifications: { results }, setNotifications } = notificationData;

    const handleComment = () => {
        if (!access_token) {
            return toast.error("Please login to comment");
        }

        if (!comment.length) {
            return toast.error("Write something to comment");
        }

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/add-comment", {
            _id,
            blog_author: blog_author._id,
            comment,
            replying_to: replyingTo,
            notification_id
        }, {
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        })
        .then(({ data }) => {
            // Update notification with reply
            results[index].reply = {
                _id: data._id,
                comment,
                commented_by: {
                    personal_info: {
                        username,
                        profile_img,
                        fullname
                    }
                }
            };
            
            setNotifications({ ...notifications, results });
            setReplying(false);
            setComment('');
            toast.success("Reply added successfully");
        })
        .catch(err => {
            console.error("Error adding reply:", err);
            toast.error(err.response?.data?.error || "Failed to add reply");
        });
    }

    return (
        <div className="reply-input-container">
            <textarea 
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a reply..."
                className="input-box pl-5 placeholder:text-dark-grey resize-none h-[150px] overflow-auto"
            />
            <button 
                className="btn-dark mt-5 px-10"
                onClick={handleComment}
            >
                Reply
            </button>
        </div>
    );
}

export default NotificationCommentField;