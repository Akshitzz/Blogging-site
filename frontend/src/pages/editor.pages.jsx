import { createContext, useContext, useState } from "react";
import { UserContext } from "../App";
import { Navigate, useParams } from "react-router-dom";
import BlogEditor from "../components/blog-editor.component";
import PublishForm from "../components/publish-form.component";
import { useEffect } from "react";
import Loader from "../components/loader.component";
import axios from "axios";
import { toast } from "react-hot-toast";

const blogStructure = {
    title: '',
    banner: '',
    content: [],
    tags: [],
    des: '',
    author: { personal_info: {} }
};

export const EditorContext = createContext({});

const Editor = () => {
    let { blog_id } = useParams();
    const [blog, setBlog] = useState(blogStructure);
    const [editorState, setEditorState] = useState("editor");
    const [textEditor, setTextEditor] = useState({ isReady: false });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    let { userAuth: { access_token } } = useContext(UserContext);

    useEffect(() => {
        if (!blog_id) {
            setLoading(false);
            return;
        }

        const fetchBlog = async () => {
            try {
                const { data: { blog } } = await axios.post(
                    import.meta.env.VITE_SERVER_DOMAIN + "/get-blog",
                    {
                        blog_id,
                        draft: true,
                        mode: 'edit'
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${access_token}`
                        }
                    }
                );
                
                if (blog) {
                    setBlog(blog);
                } else {
                    toast.error("Blog not found");
                    setBlog(blogStructure);
                }
            } catch (err) {
                console.error("Error fetching blog:", err);
                toast.error(err.response?.data?.error || "Error fetching blog");
                setBlog(blogStructure);
            } finally {
                setLoading(false);
            }
        };

        if (access_token) {
            fetchBlog();
        } else {
            setLoading(false);
            toast.error("Please sign in to edit blogs");
        }
    }, [blog_id, access_token]);

    if (!access_token) {
        return <Navigate to="/signin" />;
    }

    return (
        <EditorContext.Provider value={{
            blog,
            setBlog,
            editorState,
            setEditorState,
            textEditor,
            setTextEditor
        }}>
            {loading ? (
                <Loader />
            ) : editorState === "editor" ? (
                <BlogEditor />
            ) : (
                <PublishForm />
            )}
        </EditorContext.Provider>
    );
};

export default Editor;