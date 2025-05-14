import { getDay } from "../common/date";



const BLogPostCard = ({content,author}) =>  {

    let { publishedAt, tags,title,des, banner, activity :{total_likes} ,blog_id :id } =content;
        let {fullname, profile_img ,username} = author;
    return (
        <Link to={`/blog/${id}`} className=" flex gap-8 items-center border-b border-grey pb-5 mb-4">
        <div className="w-full">
                    <div className="flex gap-2 items-center mb-7">
                            <img src= {profile_img}  className="w-6 h-6 rounded-full" alt="User Profile" />
                            <p className="line-clamp-1">{fullname} @{username}</p>
                            <p className="min-w-full"> {getDay(publishedAt)}</p>
                    </div>

                    <h1 className="blog-title">{title}</h1>

                    <p className="my-3 text-xl font-gelasio leading-7 max-sm:hidden md:max-[1100px]:hidden line-clamp">{des}</p>

                    <div className="flex  gap-4 mt-7">
                        <span className="btn-light py-1 px-4">{tags[0]}</span>
                        <span className="ml-3 flex items-center gap-2 text-dark-grey">
                            <i className=" fi fi-rr-heart text-xl">
                                {total_likes}
                            </i>
                        </span>
                    </div>
                    <img src={banner} alt="image banner " className="w-full h-full aspect-square object-cover" />
            </div>
            <div>

            </div>
</Link>
    )
}



export default BLogPostCard;