import axios from "axios";
import { useContext, useEffect, useState } from "react";
import { UserContext } from "../App";
import { filterPaginationData } from "../common/filter-pagination-data";
import { Toaster } from "react-hot-toast";
import InpageNavigation from "../components/inpage-navigation.component";
import Loader from "../components/loader.component";
import NoDataMessage from "../components/nodata.component";
import AnimationWrapper from "../common/page-animation";
import { ManagePublishBlogCard } from "../components/manage-blogcard.component";
import { ManageDraftBlogCard } from "../components/manage-blogcard.component";
import LoadMoreButton from "../components/load-more.component";
import { useSearchParams } from "react-router-dom";

const ManageBlogs = () => {
    let { userAuth: { access_token } } = useContext(UserContext);
    const [blogs, setBlogs] = useState(null);
    const [drafts, setDrafts] = useState(null);
    const [query, setQuery] = useState("");
    let activeTab = useSearchParams()[0].get("tab");

    const getBlogs = ({ page = 1, draft = false, deletedDocCount = 0 }) => {
        axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/user-written-blogs", 
            {
                page,
                draft,
                query,
                deletedDocCount
            },
            {
                headers: {
                    'Authorization': `Bearer ${access_token}`
                }
            }
        )
        .then(async ({ data }) => {
            let formatedData = await filterPaginationData({
                state: draft ? drafts : blogs,
                data: data.blogs,
                page,
                user: access_token,
                countRoute: "/user-written-blogs-count",
                data_to_send: { draft, query }
            });
            
            if (draft) {
                setDrafts(formatedData);
            } else {
                setBlogs(formatedData);
            }
        })
        .catch(err => {
            console.log(err);
        });
    }

    useEffect(() => {
        if (access_token) {
            // Fetch published blogs
            getBlogs({ page: 1, draft: false });
            // Fetch draft blogs
            getBlogs({ page: 1, draft: true });
        }
    }, [access_token, query]);

    return (
        <>
            <h1 className="max-md:hidden">Manage Blogs</h1>
            <div className="flex gap-10 py-8 max-md:flex-col">
                <input 
                    type="search"
                    className="w-full md:w-[400px] bg-grey p-4 pl-6 rounded-full"
                    placeholder="Search Blogs"
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            <InpageNavigation 
                routes={["Published Blogs", "Drafts"]}
                defaultActiveIndex={activeTab !== 'draft' ? 0 : 1}
            >
                {/* published blogs */}
                {blogs == null ? <Loader/> :
                    blogs.results.length ? 
                    <>
                        {blogs.results.map((blog, i) => {
                            return (
                                <AnimationWrapper key={i} transition={{delay: i * 0.04}}>
                                    <ManagePublishBlogCard blog={blog}/>
                                </AnimationWrapper>
                            );
                        })}
                        <LoadMoreButton 
                            state={blogs} 
                            fetchData={getBlogs} 
                            additionalParam={{draft: false, deletedDocCount: blogs.deletedDocCount}}
                        />
                    </> : 
                    <NoDataMessage message="No published blogs"/>
                }

                {/* drafts blogs */}
                {drafts == null ? <Loader/> :
                    drafts.results.length ? 
                    <>
                        {drafts.results.map((blog, i) => {
                            return (
                                <AnimationWrapper key={i} transition={{delay: i * 0.04}}>
                                    <ManageDraftBlogCard 
                                        blog={{...blog, index: i + 1, setStateFunc: setDrafts}} 
                                        index={i + 1}
                                    />
                                </AnimationWrapper>
                            );
                        })}
                        <LoadMoreButton 
                            state={drafts} 
                            fetchData={getBlogs} 
                            additionalParam={{draft: true, deletedDocCount: drafts.deletedDocCount}}
                        />
                    </> : 
                    <NoDataMessage message="No draft blogs"/>
                }
            </InpageNavigation>
        </>
    );
}

export default ManageBlogs;