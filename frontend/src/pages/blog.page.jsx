import { useParams } from "react-router-dom";
import { useState,useEffect } from "react";
import axios from "axios";
import AnimationWrapper from "../common/page-animation";
import { createContext } from "react";
import BlogInteraction from "../components/blog-interaction.component";
import BlogContent from "../components/blog-content.component";
export const blogStructure = {
    title : "",
    des:'',
    content:[],
    tags:[],
    activity:{personal_info:{ }},
    banner : '',
    publishedAt : '',

}

    export const BlogContext = createContext({ });


const BlogPage = () => {
        const { blog_id } = useParams();
        const [blog,setBlog] = useState(blogStructure);
        const [loading,setLoading] = useState(true);
        const [similarBlogs,setsimilarBlogs] = useState(null)
        const [isLikedByUser,setLikedByUser] = useState(false);


        let {title,content,banner,author :{personal_info:{fullname,username,personal_img}},publishedAt} = blog;

        const fetchBlog = ()=>{
            axios.post(import.meta.env.VITE_SERVER_URL+"/get-blog",{blog_id})
            .then(({data:{blog}})=>{

                axios.post(import.meta.env.VITE_SERVER_URL + "search-blogs" , {tag:tags[0],limit:6,eliminate_blog:blog_id})
                .then(({data})=>{
                        setsimilarBlogs(data.blogs);

                })
               setBlog(blog);
            setLoading(false);
            })
            .catch(err=>{
                console.log(err);
            })
        }

        useEffect(()=>{

            resetStates();
            fetchBlog();

        },[])

        const resetStates = ()=>{
            setBlog(blogStructure)
            setsimilarBlogs(null);
            setLoading(true);
        }
        
    return (
            <AnimationWrapper>
                {
                    loading ? <Loader/> :
                   <BlogContext.Provider value={{blog,setBlog,isLikedByUser,setLikedByUser}}>
                     <div className="max-w-[900px] center py-10 max-lg:px-[5vw]">
                        <img src={banner} alt="banner" className="aspect-video" />

                        <div className="mt-12">
                            <h2>{title}</h2>
                            <div>
                                <div>
                                    <img src={profile_img} alt="profle image " />
                                    <p className="capitalize">
                                        {fullname}
                                        <br />
                                        <Link to={`/user/${author_username}`}>
                                        </Link>
                                    </p>
                                </div>
                                <p className="text-dark-grey opacity-75 max-sm:mt-6 max-sm:ml-12 max-sm:pl-5 ">Published on {getDay(publishedAt)}</p>
                                
                            </div>
                        </div>

                    <BlogInteraction/>

                        <div className="my-12 font-gelasio blog-page-content">
                            {
                                content[0].blocks.map((blocks,i)=>{
                                    return <div key={i} className="my-4 md:my-8">
                                            <BlogContent block={block}/>
                                    </div>
                                })
                            }
                        </div>
                    <BlogInteraction/>
                    {
                        similarBlogs !== null && similarBlogs.length ?
                        <>
                        <h1 className="text-2xl mt-14 mb-10 font-medium ">Similar Blogs </h1>
                        {
                            similarBlogs.map((blog,i)=>{
                                let {author:{personal_info}} =blog;
                                return <AnimationWrapper>
                                    <BlogPostCard content={blog} author={personal_info}>

                                    </BlogPostCard>
                                </AnimationWrapper>
                            })
                        }
                        </> : " "
                    }
                    </div>
                   </BlogContext.Provider>
                }
               
            </AnimationWrapper>
    )
}

export default BlogPage;