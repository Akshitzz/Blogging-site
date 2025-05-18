import { useContext } from "react";
import { EditorContext } from "../pages/editor.pages";

const Tag = ({tag, tagIndex}) => {
    let { blog, setBlog } = useContext(EditorContext);
    const { tags } = blog;

    const addEditable = (e) => {
        e.target.setAttribute("contentEditable", true);
        e.focus();
    }

    const handleTagDelete = () => {
        let newTags = tags.filter(t => t !== tag);
        setBlog({...blog, tags: newTags});
    }

    const handleTagEdit = (e) => {
        if(e.keyCode == 13 || e.keyCode == 188) {
            e.preventDefault();
            let currentTag = e.target.innerText;
            let newTags = [...tags];
            newTags[tagIndex] = currentTag;
            setBlog({...blog, tags: newTags});
            e.target.setAttribute("contentEditable", false);
        }
    }

    return (
        <div className="relative py-1 px-3 mt-2 mr-2 bg-white rounded-full inline-block hover:bg-opacity-50 pr-6 flex items-center w-fit">
            <p className="outline-none text-center whitespace-nowrap" onKeyDown={handleTagEdit} onClick={addEditable}>{tag}</p>
            <button
                className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center"
                onClick={handleTagDelete}
            >
                <i className="fi fi-br-cross text-sm"></i>
            </button>
        </div>
    )
}

export default Tag;