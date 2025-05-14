import { useState } from "react";
import AnimationWrapper from "../common/page-animation";
import axios from "axios";
import BLogPostCard from "../components/blog-post.component";
import InpageNavigation from "../components/inpage-navigation.component";
import Loader from "../components/loader.component";
import MinimalBLogPost from "../components/nobanner-blog-post.component";
import { activeTabRef } from "../components/inpage-navigation.component";


const HomePage = () => {
    
    let [blogs, setBlogs] = useState(null);
    let [trendingBlogs, setTrendingBlogs] = useState(null);
    let [pageState,setpageState] = useState("home");



    let categories= ["programming", "hollywood", "film making", "social media", "cooking","tech","finanaces","travel"]
       

                const fetchLatestBlogs = async () => {
                    axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs")
                .then((data) => {
                   setBlogs(data.blogs);
                    
                })
                .catch(err =>{
                    console.log(err);
                })
        }

        const fetchTrendingBlogs = async () => {
            axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/trending-blogs")
                .then((data) => {
                    setTrendingBlogs(data.blogs);
                })
                .catch(err =>{
                    console.log(err);
                })
        }

        const loadBlogCategory =  (e) => {
                let category = e.target.innerText.toLowerCase();
                setBlogs(null) ;
                if(pageState ==category){
                    setpageState("home");
                    return ;
                }
                    if(!trendingBlogs){

                        setpageState(category);
                    }
        }

        useEffect(() => {

            if(pageState == "home"){

                fetchLatestBlogs();
            }
            if (pageState === "trending blogs") {
                fetchTrendingBlogs();
            }

        },
        [pageState])


        return (
    <AnimationWrapper>
        <section className="h-cover flex justify-center items-center gap-10">
<div className="w-full">
    <InpageNavigation routes={[pageState,"trending blogs"]} defaultHidden={["trending blogs"]} >
        <>
        {
            blogs ===null ? <Loader/> :
            blogs.map((blog,i)=>{
                return <AnimationWrapper transition={{duration:1,delay: i*.1}} key={i}>
                    <BLogPostCard content={blog} author={blog.author.personal_info}/>
                </AnimationWrapper>
            })
        }
        </>
        <>
            {
               trendingBlogs ===null ? <Loader/> :
            trendingBlogs.map((blog,i)=>{
                return <AnimationWrapper transition={{duration:1,delay: i*.1}} key={i}>
                   <MinimalBLogPost blog={blog} index={i}/>
                </AnimationWrapper>
            })  
            }
        
        </>
    </InpageNavigation>

</div>
    {/* {filtering and landing blogs} */}
        <div className="min-w-[40%] lg:min-w-[400px] max-w-min border-1 border-grey pl-8 pt-5">
            <div className="flex flex-col gap-10">
                   <div>
                     <h1 className="font-medium text-xl mb-8">Stories from all interests</h1>
                    <div className="flex gap-3 flex-wrap">
                        {
                                categories.map((category,i)=>{
                                    return <button onClick={loadBlogCategory} className={
                                        "tag" + (pageState == category ? " bg-black text-white" : " ") 
                                    } key={i}>
                                            {category}
                                    </button>
                                })
                        }
                    </div>
                   </div>
            <div>
                <h1 className="font-medium text-xl mb-8">Trending <i className="fi fi-rr-arrow-trend-up"></i></h1>
            </div>
       </div>     
        </div>
        </section>
    </AnimationWrapper>
    )
}
export default HomePage;