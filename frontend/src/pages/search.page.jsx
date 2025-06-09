import { useParams } from "react-router-dom";
import InpageNavigation from "../components/inpage-navigation.component";
import Loader from "../components/loader.component";
import AnimationWrapper from "../common/page-animation";
import BLogPostCard from "../components/blog-post.component";
import NoDataMessage from "../components/nodata.component";
import LoadMoreButton from "../components/load-more.component";
import { useEffect, useState } from "react";
import axios from "axios";
import { filterPaginationData } from "../common/filter-pagination-data";
import UserCard from "../components/usercard.component";

const Searchpage = () => {
    let { query } = useParams();
    const [blogs, setBlogs] = useState(null);
    const [users, setUsers] = useState(null);

    const searchBlogs = async ({ page = 1, create_new_arr = false }) => {
        try {
            const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-blogs", { query, page });
            
            let formatedData = await filterPaginationData({
                state: blogs,
                data: data.blogs || [],
                page,
                countRoute: "/search-blogs-count",
                data_to_send: { query },
                create_new_arr
            });
            
            setBlogs(formatedData);
        } catch (err) {
            console.error("Error searching blogs:", err);
            setBlogs({
                results: [],
                page: 1,
                totalDocs: 0
            });
        }
    };

    const fetchUsers = async () => {
        try {
            const { data } = await axios.post(import.meta.env.VITE_SERVER_DOMAIN + "/search-users", { query });
            setUsers(data.users || []);
        } catch (err) {
            console.error("Error searching users:", err);
            setUsers([]);
        }
    };

    const resetState = () => {
        setBlogs(null);
        setUsers(null);
    };

    useEffect(() => {
        resetState();
        searchBlogs({ page: 1, create_new_arr: true });
        fetchUsers();
    }, [query]);

    const UserCardWrapper = () => {
        return (
            <>
                {users === null ? (
                    <Loader />
                ) : users.length ? (
                    users.map((user, i) => (
                        <AnimationWrapper key={i} transition={{ duration: 1, delay: i * 0.08 }}>
                            <UserCard user={user} />
                        </AnimationWrapper>
                    ))
                ) : (
                    <NoDataMessage message="No users found" />
                )}
            </>
        );
    };

    return (
        <section className="h-cover flex justify-center gap-8">
            <div className="w-full">
                <InpageNavigation routes={[`Search Results for "${query}"`, "Accounts Matched"]}>
                    <>
                        {blogs === null ? (
                            <Loader />
                        ) : blogs.results && blogs.results.length ? (
                            <>
                                {blogs.results.map((blog, i) => (
                                    <AnimationWrapper transition={{ duration: 1, delay: i * 0.1 }} key={i}>
                                        <BLogPostCard content={blog} author={blog.author.personal_info} />
                                    </AnimationWrapper>
                                ))}
                                <LoadMoreButton state={blogs} fetchData={searchBlogs} />
                            </>
                        ) : (
                            <NoDataMessage message="No blogs found" />
                        )}
                    </>

                    <UserCardWrapper />
                </InpageNavigation>
            </div>

            <div className="min-w-[40%] lg:min-w-[350px] max-w-min border-1 border-grey pl-8 pt-3 max-md:hidden">
                <h1 className="font-medium text-xl mb-8">
                    Users related to search <i className="fi fi-rr-user mt-1"></i>
                </h1>
                <UserCardWrapper />
            </div>
        </section>
    );
};

export default Searchpage;