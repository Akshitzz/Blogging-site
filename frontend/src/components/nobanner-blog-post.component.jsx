import {Link} from 'react-router-dom';
import { getDay } from '../common/date';

const MinimalBLogPost = ({blog,index}) => {
        let {title,blog_id :id,publishedAt, author:{personal_info:{fullname,username,profile_img}}} = blog;
    return(
      <Link to={`/blog/${id}`} className=" flex gap-5 mb-4">
            <h1 className='blog-index'>{index <10 ?"0" + (index +1):1}</h1>

            <div>
                <div className='flex gap-2 items-center mb-7'>
                    <img src={profile_img} className='w-6 h-6 rounded-full' />
                    <p className='line-clamp-1'>{fullname}</p>
                    <p className='min-w-full'>{getDay(publishedAt)}</p>
                </div>

                <h1 className='blog-title'>{title}</h1>
            </div>
      </Link>
    )


}

export default MinimalBLogPost;