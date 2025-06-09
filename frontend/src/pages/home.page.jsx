import { useState, useEffect } from "react";
import AnimationWrapper from "../common/page-animation";
import axios from "axios";
import BLogPostCard from "../components/blog-post.component";
import InpageNavigation from "../components/inpage-navigation.component";
import Loader from "../components/loader.component";
import MinimalBLogPost from "../components/nobanner-blog-post.component";
import { activeTabRef } from "../components/inpage-navigation.component";
import NoDataMessage from "../components/nodata.component";
import LoadMoreButton from "../components/load-more.component";
import { filterPaginationData } from "../common/filter-pagination-data";

const HomePage = () => {
    let [blogs, setBlogs] = useState({
        results: [],
        page: 1,
        totalDocs: 0
    });
    let [trendingBlogs, setTrendingBlogs] = useState(null);
    let [pageState, setpageState] = useState("home");
    let [loading, setLoading] = useState(true);

    let categories = ["programming", "hollywood", "film making", "social media", "cooking", "tech", "finances", "travel"];
       
    const fetchLatestBlogs = async (page = 1) => {
        try {
            setLoading(true);
            const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/latest-blogs", { page });
            
            let formatedData = await filterPaginationData({ 
                state: blogs, 
                data: data.blogs, 
                page,
                countRoute: "/all-latest-blogs-count"
            });

            setBlogs(formatedData || {
                results: [],
                page: 1,
                totalDocs: 0
            });
        } catch (err) {
            console.error("Error fetching latest blogs:", err);
            setBlogs({
                results: [],
                page: 1,
                totalDocs: 0
            });
        } finally {
            setLoading(false);
        }
    }

    const fetchBlogsByCategory = async ({page = 1}) => {
        try {
            setLoading(true);
            const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", {
                tag: pageState,
                page
            });
            
            let formatedData = await filterPaginationData({ 
                state: blogs, 
                data: data.blogs, 
                page,
                countRoute: "/search-blogs-count",
                data_to_send: {tag: pageState}
            });

            setBlogs(formatedData || {
                results: [],
                page: 1,
                totalDocs: 0
            });
        } catch (err) {
            console.error("Error fetching blogs by category:", err);
            setBlogs({
                results: [],
                page: 1,
                totalDocs: 0
            });
        } finally {
            setLoading(false);
        }
    }

    const fetchTrendingBlogs = async () => {
        try {
            const { data } = await axios.get(import.meta.env.VITE_SERVER_DOMAIN + "/trending-blogs");
            setTrendingBlogs(data.blogs || []);
        } catch (err) {
            console.error("Error fetching trending blogs:", err);
            setTrendingBlogs([]);
        }
    }

    const loadBlogCategory = (e) => {
        let category = e.target.innerText.toLowerCase();
        setBlogs({
            results: [],
            page: 1,
            totalDocs: 0
        });
        if(pageState === category) {
            setpageState("home");
            return;
        }
        setpageState(category);
    }

    useEffect(() => {
        const initializePage = async () => {
            try {
                if(activeTabRef.current) {
                    activeTabRef.current.click();
                }
                
                if(pageState === "home") {
                    await fetchLatestBlogs(1);
                } else {
                    await fetchBlogsByCategory({page: 1});
                }
                
                if(!trendingBlogs) {
                    await fetchTrendingBlogs();
                }
            } catch (err) {
                console.error("Error initializing page:", err);
            }
        };

        initializePage();
    }, [pageState]);

    return (
        <AnimationWrapper>
            <section className="h-cover flex justify-center items-center gap-10">
                <div className="w-full">
                    <InpageNavigation routes={[pageState, "trending blogs"]} defaultHidden={["trending blogs"]}>
                        <>
                            {loading ? (
                                <Loader/>
                            ) : (blogs?.results?.length ? (
                                <>
                                    {blogs.results.map((blog, i) => (
                                        <AnimationWrapper transition={{duration: 1, delay: i * 0.1}} key={i}>
                                            <BLogPostCard content={blog} author={blog.author.personal_info}/>
                                        </AnimationWrapper>
                                    ))}
                                    <LoadMoreButton 
                                        state={blogs} 
                                        fetchData={pageState === "home" ? fetchLatestBlogs : fetchBlogsByCategory}
                                    />
                                </>
                            ) : (
                                <NoDataMessage message="No blogs published yet"/>
                            ))}
                        </>
                        <>
                            {trendingBlogs === null ? (
                                <Loader/>
                            ) : trendingBlogs.length ? (
                                trendingBlogs.map((blog, i) => (
                                    <AnimationWrapper transition={{duration: 1, delay: i * 0.1}} key={i}>
                                        <MinimalBLogPost blog={blog} index={i + 1}/>
                                    </AnimationWrapper>
                                ))
                            ) : (
                                <NoDataMessage message="No trending blogs found"/>
                            )}
                        </>
                    </InpageNavigation>
                </div>
                <div className="min-w-[40%] lg:min-w-[400px] max-w-min border-1 border-grey pl-8 pt-5">
                    <div className="flex flex-col gap-10">
                        <div>
                            <h1 className="font-medium text-xl mb-8">Stories from all interests</h1>
                            <div className="flex gap-3 flex-wrap">
                                {categories.map((category, i) => (
                                    <button 
                                        onClick={loadBlogCategory} 
                                        className={"tag" + (pageState === category ? " bg-black text-white" : "")} 
                                        key={i}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h1 className="font-medium text-xl mb-8">
                                Trending <i className="fi fi-rr-arrow-trend-up"></i>
                            </h1>
                            {trendingBlogs === null ? (
                                <Loader />
                            ) : trendingBlogs.length ? (
                                <div className="flex flex-col gap-8">
                                    {trendingBlogs.slice(0, 5).map((blog, i) => (
                                        <MinimalBLogPost key={i} blog={blog} index={i + 1} />
                                    ))}
                                </div>
                            ) : (
                                <NoDataMessage message="No trending blogs" />
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </AnimationWrapper>
    );
}

export default HomePage;