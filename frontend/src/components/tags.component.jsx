import { useContext } from "react";
import { EditorContext } from "../pages/editor.pages";

 const Tag =({tag,tagIndex})=>{

    let { blogs:{tags},setBlog,blog}= useContext(EditorContext)
    const addEditable =(e)=>{
        e.target.setAttribute("contentEditable",true);
        e.focus();
    }

    const handleTagDelete=()=>{

        tags = tags.filter(t=>t != tag);
        setBlog({...blog,tags})
    }
    const handleTagEdit = (e)=>{
            if(e.keyCode ==13 || e.keyCode == 188){
                e.preventDefault();
                let currentTag =  e.target.innerText;
                tags[tagIndex] = currentTag;
                setBlog({...blog,tags})
                e.target.setAttribute("contentEditable",false);
            }
    }

    return (
       <div className="relative p-2 mt-2 mr-2 px-5 bg-white  rounded-full  inline-block hover:bg-opacity-50 pr-8 ">
        <p className="outline-none " onKeyDown={handleTagEdit} onClick={addEditable} >{tag}</p>
        <button
        className="mt-[2px] rounded-full absolute  top-1/2 -translate-x-1/2 right-3"
        onClick={handleTagDelete}
        >
            <i className="fi fi-br-cross text-sm pointer-events-none"></i>
        </button>
       </div>
    )
}

export default Tag;