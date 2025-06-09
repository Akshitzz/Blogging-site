import { useParams } from "react-router-dom";
import { useState,useEffect } from "react";
import axios from "axios";
import AnimationWrapper from "../common/page-animation";
import { createContext } from "react";
import BlogInteraction from "../components/blog-interaction.component";
import BlogContent from "../components/blog-content.component";
import CommentsContainer from "../components/comments.component";
import Loader from "../components/loader.component";
import { Link } from "react-router-dom";
import { getDay } from "../common/date";
import { fetchComments } from "../components/comments.component";
import BlogPostCard from "../components/blog-post.component";

export const blogStructure = {
    title: "",
    des: '',
    content: [],
    tags: [],
    author: {
        personal_info: {}
    },
    activity: {
        total_likes: 0,
        total_comments: 0,
        total_parent_comments: 0,
        total_reads: 0
    },
    comments: {
        results: []
    },
    banner: '',
    publishedAt: ''
}

export const BlogContext = createContext({});

const BlogPage = () => {
    const { blog_id } = useParams();
    const [blog, setBlog] = useState(blogStructure);
    const [loading, setLoading] = useState(true);
    const [similarBlogs, setSimilarBlogs] = useState([]);
    const [isLikedByUser, setLikedByUser] = useState(false);
    const [commentsWrapper, setCommentsWrapper] = useState(false);
    const [totalParentCommentLoaded, setTotalParentCommentLoaded] = useState(0);

    const fetchBlog = () => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/get-blog", { blog_id })
            .then(async ({ data: { blog } }) => {
                try {
                    let commentsData = await fetchComments({ 
                        blog_id, 
                        setParentCommentCountFun: setTotalParentCommentLoaded 
                    });
                    
                    blog.comments = commentsData;

                    if(blog.tags && blog.tags.length) {
                        try {
                            const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", {
                                tag: blog.tags[0],
                                limit: 6,
                                eliminate_blog: blog_id
                            });
                            setSimilarBlogs(data.blogs || []);
                        } catch (err) {
                            console.error("Error fetching similar blogs:", err);
                            setSimilarBlogs([]);
                        }
                    }
                    
                    setBlog(blog);
                } catch (err) {
                    console.error("Error in blog processing:", err);
                }
                setLoading(false);
            })
            .catch(err => {
                console.error("Error fetching blog:", err);
                setLoading(false);
            });
    }

    useEffect(() => {
        resetStates();
        fetchBlog();
    }, [blog_id]);

    const resetStates = () => {
        setBlog(blogStructure);
        setSimilarBlogs([]);
        setLoading(true);
        setLikedByUser(false);
        setTotalParentCommentLoaded(0);
    }
        
    return (
        <AnimationWrapper>
            <BlogContext.Provider value={{
                blog, 
                setBlog,
                isLikedByUser,
                setLikedByUser,
                commentsWrapper,
                setCommentsWrapper,
                totalParentCommentLoaded,
                setTotalParentCommentLoaded
            }}>
                {loading ? (
                    <Loader />
                ) : (
                    <>
                        <CommentsContainer />
                        <div className="max-w-[900px] center py-10 max-lg:px-[5vw]">
                            <img src={blog.banner} alt="banner" className="aspect-video" />

                            <div className="mt-12">
                                <h2>{blog.title}</h2>
                                <div className="flex items-center gap-4 mt-8">
                                    <div className="flex items-center gap-2">
                                        <img src={blog.author.personal_info.profile_img} 
                                             alt="profile" 
                                             className="w-12 h-12 rounded-full" />
                                        <p className="capitalize">
                                            {blog.author.personal_info.fullname}
                                            <br />
                                            <Link to={`/user/${blog.author.personal_info.username}`} 
                                                  className="text-dark-grey">
                                                @{blog.author.personal_info.username}
                                            </Link>
                                        </p>
                                    </div>
                                    <p className="text-dark-grey opacity-75 ml-auto">
                                        Published on {getDay(blog.publishedAt)}
                                    </p>
                                </div>
                            </div>

                            <BlogInteraction />

                            <div className="my-12 font-gelasio blog-page-content">
                                {blog.content[0]?.blocks.map((block, i) => (
                                    <div key={i} className="my-4 md:my-8">
                                        <BlogContent block={block} />
                                    </div>
                                ))}
                            </div>

                            {similarBlogs && similarBlogs.length > 0 && (
                                <>
                                    <h1 className="text-2xl mt-14 mb-10 font-medium">Similar Blogs</h1>
                                    {similarBlogs.map((blog, i) => {
                                        let { author: { personal_info } } = blog;
                                        return (
                                            <AnimationWrapper key={i}>
                                                <BlogPostCard content={blog} author={personal_info} />
                                            </AnimationWrapper>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </>
                )}
            </BlogContext.Provider>
        </AnimationWrapper>
    );
}

export default BlogPage;