import toast,{Toaster} from 'react-hot-toast'
import { useContext, useState } from 'react';
import UserContext from '../App'
import axios from 'axios';


const NotificationCommentField=({_id,reply,blog_author,index=undefined,replyingTo=undefined,setReplying,isReplying,notification_id,notfication_data})=>{
    
    let [comment ,setComment] = useState('')

        let {_id:user_id} = blog_author;
        let {userAuth:{access_token}} = useContext(UserContext);
        let {notifcation,notification :{results},setNotifications} = notificationData;

    const handleComment =()=>{
          
        if(!comment.length){
            return toast.error("Write something to comment");
        }

        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/add-comment",{
            _id,blog_author:user_id,comment ,replying_to:replyingTo,notification_id
        },{
            header:{
                'Authorization':`Bearer ${access_token}`
            }
        })
        .then(({data})=>{
                results[index].reply= {comment,_id:data._id}
                setNotifications({...setNotifications,results})
            
        })
        .catch(err=>{
            console.log(err);     
        })
    }
    
    return (
        <>
        <Toaster/>

        <textarea value={comment}
        onChange={(e)=>setComment(e.target.value)}
        placeholder='Leave a comment ...'
        className='input-box pl-5 placeholder'
        />
        <button className='btn-dark mt-5 px-10' onClick={handleComment}></button>
        
        </>
    )
}


export default NotificationCommentField;